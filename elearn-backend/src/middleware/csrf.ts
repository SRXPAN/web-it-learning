// src/middleware/csrf.ts
import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { logger } from '../utils/logger.js'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

/**
 * Генерує CSRF токен і встановлює його в cookie
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
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
 * Middleware для валідації CSRF токена
 * Перевіряє, що токен з header збігається з токеном з cookie
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

  // Constant-time comparison для захисту від timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    res.status(403).json({ error: 'CSRF token invalid' })
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
