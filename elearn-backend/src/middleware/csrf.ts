// src/middleware/csrf.ts
import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../utils/logger.js'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

// Secret для HMAC - має бути в env, fallback для dev
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'default-csrf-secret-change-me'

/**
 * Генерує stateless CSRF токен
 * Формат: timestamp.signature
 * Це дозволяє будь-якому інстансу перевірити токен
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(timestamp)
    .digest('hex')
  return `${timestamp}.${signature}`
}

/**
 * Перевіряє stateless CSRF токен
 */
function verifyCsrfToken(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  
  const [timestamp, signature] = parts
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(timestamp)
    .digest('hex')
  
  // Constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false
  }
  
  // Перевірка терміну дії (24 години)
  const tokenAge = Date.now() - parseInt(timestamp, 10)
  const maxAge = 24 * 60 * 60 * 1000 // 24 години
  return tokenAge < maxAge
}

/**
 * Middleware для встановлення CSRF токена
 * Викликається на GET /api/auth/csrf для отримання токена
 */
export function setCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfToken()
  // Robust isProd detection for Render and other platforms
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
  
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // JS має мати доступ для читання
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' для cross-origin в production
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 години
  })
  
  res.json({ csrfToken: token })
}

/**
 * Middleware для валідації CSRF токена (Stateless)
 * Перевіряє що токен валідний через HMAC
 */
export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
  // Пропускаємо для безпечних методів
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER] as string | undefined

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: 'CSRF token missing' })
    return
  }

  // Перевіряємо що cookie і header однакові
  if (cookieToken !== headerToken) {
    res.status(403).json({ error: 'CSRF token mismatch' })
    return
  }

  // Перевіряємо валідність токена через HMAC
  if (!verifyCsrfToken(headerToken)) {
    res.status(403).json({ error: 'CSRF token invalid or expired' })
    return
  }

  next()
}

/**
 * Опціональний CSRF захист - для поступового впровадження
 * Логує попередження замість блокування
 */
export function validateCsrfSoft(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.headers[CSRF_HEADER] as string | undefined

  if (!cookieToken || !headerToken) {
    logger.warn('[CSRF] Missing token for', { method: req.method, path: req.path })
    return next() // Пропускаємо, але логуємо
  }

  try {
    if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
      logger.warn('[CSRF] Token mismatch for', { method: req.method, path: req.path })
    }
  } catch {
    logger.warn('[CSRF] Token validation error for', { method: req.method, path: req.path })
  }

  next()
}
