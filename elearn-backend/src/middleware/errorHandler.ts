/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses across all routes
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { sendError, ErrorCodes, serverError } from '../utils/response.js'
import { logger } from '../utils/logger.js'

/**
 * Custom API Error class for throwing errors with specific status codes
 */
export class ApiError extends Error {
  statusCode: number
  code: string
  details?: Record<string, unknown>

  constructor(
    statusCode: number,
    message: string,
    code: string = ErrorCodes.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = 'ApiError'
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new ApiError(400, message, ErrorCodes.VALIDATION_ERROR, details)
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, ErrorCodes.UNAUTHORIZED)
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, ErrorCodes.FORBIDDEN)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, ErrorCodes.NOT_FOUND)
  }

  static conflict(message: string) {
    return new ApiError(409, message, ErrorCodes.ALREADY_EXISTS)
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message, ErrorCodes.RATE_LIMITED)
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, ErrorCodes.INTERNAL_ERROR)
  }
}

/**
 * Async handler wrapper - eliminates need for try/catch in every route
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Global error handler middleware
 * Should be registered LAST in middleware chain
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context including request ID
  const errorContext = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }

  // Handle specific error types
  if (err instanceof ApiError) {
    logger.warn('API Error:', { ...errorContext, error: err.message, code: err.code })
    sendError(res, err.code as any, err.message, err.statusCode, err.details)
    return
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.flatten()
    logger.warn('Validation Error:', { ...errorContext, details })
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details as any)
    return
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Prisma Error:', { ...errorContext, code: err.code, meta: err.meta })
    
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        sendError(res, ErrorCodes.ALREADY_EXISTS, 'Resource already exists', 409)
        return
      case 'P2025': // Record not found
        sendError(res, ErrorCodes.NOT_FOUND, 'Resource not found', 404)
        return
      case 'P2003': // Foreign key constraint
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Related resource not found', 400)
        return
      default:
        sendError(res, ErrorCodes.DATABASE_ERROR, 'Database error', 500)
        return
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma Validation Error:', { ...errorContext, error: err.message })
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid data format', 400)
    return
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('JWT Error:', { ...errorContext, error: err.message })
    sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid token', 401)
    return
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('Token Expired:', { ...errorContext })
    sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Token expired', 401)
    return
  }

  // CORS errors
  if (err.message === 'CORS not allowed') {
    logger.warn('CORS blocked:', errorContext)
    sendError(res, ErrorCodes.FORBIDDEN, 'CORS blocked', 403)
    return
  }

  // Body parser errors
  if ((err as any).type === 'entity.too.large') {
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Payload too large', 413)
    return
  }

  if ((err as any).type === 'entity.parse.failed') {
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid JSON', 400)
    return
  }

  // Unknown errors - log full stack trace
  logger.error('Unhandled Error:', {
    ...errorContext,
    error: err.message,
    stack: err.stack,
  })

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message

  serverError(res, message)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404)
}
