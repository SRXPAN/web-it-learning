// src/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '@elearn/shared'
import { getJwtSecret, getEnv } from '../utils/env.js'
import { sendError, ErrorCodes } from '../utils/response.js'

export interface JwtPayload {
  id: string
  role: Role
  name: string
  email: string
  type?: 'access' | 'refresh'
}

declare global {
  namespace Express {
    interface Request { user?: JwtPayload }
  }
}

const SECRET = getJwtSecret()
export const COOKIE_NAME = getEnv('COOKIE_NAME', 'access_token')
export const REFRESH_COOKIE_NAME = getEnv('REFRESH_COOKIE_NAME', 'refresh_token')

function readToken(req: Request): string | null {
  // 1) пріоритет: cookie (HttpOnly)
  const fromCookie = req.cookies?.[COOKIE_NAME]
  if (typeof fromCookie === 'string' && fromCookie.length > 10) return fromCookie

  // 2) fallback: Authorization: Bearer ...
  const h = req.headers.authorization || ''
  const fromHeader = h.startsWith('Bearer ') ? h.slice(7) : ''
  return fromHeader || null
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return sendError(res, ErrorCodes.UNAUTHORIZED, 'No token', 401)
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload
    // Перевіряємо що це access токен (якщо є type)
    if (decoded.type && decoded.type !== 'access') {
      return sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid token type', 401)
    }
    
    // Check user existence in DB and get fresh data
    const { prisma } = await import('../db.js')
    const userExists = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, emailVerified: true }
    })
    
    if (!userExists) {
      return sendError(res, ErrorCodes.UNAUTHORIZED, 'User no longer exists', 401)
    }
    
    req.user = { 
      ...decoded, 
      role: userExists.role as Role,
      emailVerified: userExists.emailVerified 
    }
    next()
  } catch (err: any) {
    // Детальніші помилки для клієнта
    if (err.name === 'TokenExpiredError') {
      return sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Token expired', 401)
    }
    return sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid token', 401)
  }
}

/**
 * Опціональна авторизація - не блокує якщо токена немає
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req)
  if (!token) return next()
  
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload
    if (!decoded.type || decoded.type === 'access') {
      req.user = decoded
    }
  } catch {
    // Ігноруємо помилки - просто не встановлюємо user
  }
  next()
}

export function requireRole(roles: Role[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) return sendError(res, ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    if (!roles.includes(req.user.role)) return sendError(res, ErrorCodes.FORBIDDEN, 'Forbidden', 403)
    next()
  }
}

/**
 * Перевіряє що email верифіковано
 */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.emailVerified) {
    return sendError(res, ErrorCodes.FORBIDDEN, 'Email not verified', 403)
  }
  next()
}
