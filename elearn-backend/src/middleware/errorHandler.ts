/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses across all routes
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError.js'
import { sendError, ErrorCodes, serverError } from '../utils/response.js'
import { logger } from '../utils/logger.js'

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
 * Map Prisma errors to AppError
 * Converts database constraint violations into meaningful API errors
 */
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  logger.error('Prisma Error:', {
    code: err.code,
    message: err.message,
    meta: err.meta,
  })

  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = (err.meta?.target as string[])?.[0] || 'field'
      return AppError.conflict(`${field} already exists`, {
        field,
        constraint: 'unique',
      })
    }

    case 'P2025': {
      // Record not found
      return AppError.notFound('Resource not found')
    }

    case 'P2003': {
      // Foreign key constraint violation
      const field = (err.meta?.field_name as string) || 'related resource'
      return AppError.badRequest(`Related ${field} not found`, {
        field,
        constraint: 'foreign key',
      })
    }

    case 'P2014': {
      // Required relation violation
      return AppError.badRequest(
        'Cannot perform operation: required relations exist',
        { constraint: 'required_relation' }
      )
    }

    case 'P2015': {
      // Related record not found
      return AppError.notFound('Related record not found')
    }

    case 'P2016': {
      // Query interpretation error
      return AppError.badRequest('Invalid query parameters', { type: 'query_error' })
    }

    default: {
      logger.error(`Unhandled Prisma error code: ${err.code}`)
      return AppError.internal('Database operation failed')
    }
  }
}

/**
 * Global error handler middleware
 * Should be registered LAST in middleware chain
 * Handles: AppError, ZodError, Prisma errors, JWT errors, and unknown errors
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Create error context for logging
  const errorContext = {
    // @ts-ignore - req.id may be added by other middleware
    requestId: req.id,
    method: req.method,
    path: req.path,
    // @ts-ignore - req.user added by auth middleware
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Server Error:', { ...errorContext, error: err.message, code: err.code })
    } else {
      logger.warn('API Error:', { ...errorContext, error: err.message, code: err.code })
    }
    sendError(res, err.code as any, err.message, err.statusCode, err.details)
    return
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.flatten()
    logger.warn('Validation Error:', { ...errorContext, details })
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Validation failed', 400, details as any)
    return
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const appError = mapPrismaError(err)
    sendError(res, appError.code as any, appError.message, appError.statusCode, appError.details)
    return
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma Validation Error:', { ...errorContext, error: err.message })
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid data format', 400)
    return
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Prisma Initialization Error:', { ...errorContext, error: err.message })
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Database connection failed', 500)
    return
  }

  if (err instanceof Prisma.PrismaClientRustPanicError) {
    logger.error('Prisma Runtime Error:', { ...errorContext, error: err.message })
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Database error', 500)
    return
  }

  // Handle JWT errors
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

  // Handle CORS errors
  if (err.message === 'CORS not allowed') {
    logger.warn('CORS blocked:', errorContext)
    sendError(res, ErrorCodes.FORBIDDEN, 'CORS blocked', 403)
    return
  }

  // Handle body parser errors
  if ((err as any).type === 'entity.too.large') {
    logger.warn('Payload too large:', { ...errorContext, size: (err as any).length })
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Payload too large', 413)
    return
  }

  if ((err as any).type === 'entity.parse.failed') {
    logger.warn('Invalid JSON:', errorContext)
    sendError(res, ErrorCodes.VALIDATION_ERROR, 'Invalid JSON', 400)
    return
  }

  // Unknown errors - log full details but don't expose to client
  logger.error('Unhandled Error:', {
    ...errorContext,
    error: err.message,
    name: err.name,
    stack: err.stack,
  })

  // Send generic error to client (don't expose stack trace or internal details)
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message

  serverError(res, message)
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404)
}

// Re-export AppError for convenience
export { AppError } from '../utils/AppError.js'