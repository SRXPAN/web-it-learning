/**
 * Custom Application Error Class
 * Used for throwing operational errors with specific status codes
 */

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  code: string
  details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true // Marks error as expected/operational (not programming error)
    this.code = code
    this.details = details

    // Maintains proper stack trace for where error was thrown
    Object.setPrototypeOf(this, AppError.prototype)
  }

  // Factory methods for common error types
  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details)
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403, 'FORBIDDEN')
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND')
  }

  static conflict(message: string, details?: Record<string, unknown>) {
    return new AppError(message, 409, 'ALREADY_EXISTS', details)
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, 429, 'RATE_LIMITED')
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500, 'INTERNAL_ERROR')
  }
}
