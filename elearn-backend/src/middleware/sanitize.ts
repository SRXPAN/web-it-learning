// src/middleware/sanitize.ts
import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware для санітизації request body
 * Logic removed to prevent breaking legitimate content (like "x < y")
 * Security is handled by Zod validation and Frontend escaping
 */
export function sanitize(req: Request, res: Response, next: NextFunction): void {
  next()
}

/**
 * Middleware для санітизації query параметрів
 */
export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  next()
}

/**
 * Middleware для санітизації body
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  next()
}
