/**
 * ERROR HANDLING & VALIDATION IMPLEMENTATION GUIDE
 * 
 * This document describes the centralized error handling and Zod validation system.
 */

// ============================================================================
// 1. APPROR CLASS - Centralized Error Handling
// ============================================================================

/**
 * AppError is the primary way to throw operational errors in the backend.
 * It extends Error with statusCode and isOperational properties.
 * 
 * Usage:
 */

import { AppError } from '../utils/AppError.js'

// Throw specific errors using factory methods
throw AppError.badRequest('Invalid input', { field: 'email' })
throw AppError.notFound('User not found')
throw AppError.conflict('Email already exists')
throw AppError.unauthorized()
throw AppError.forbidden('Not authorized')
throw AppError.internal('Something went wrong')

// ============================================================================
// 2. ASYNCHANDLER - Automatic Error Catching
// ============================================================================

/**
 * asyncHandler wraps async route handlers and automatically catches errors,
 * passing them to the error middleware.
 * 
 * This eliminates the need for try/catch blocks in every route.
 */

import { asyncHandler } from '../middleware/errorHandler.js'

// WITHOUT asyncHandler (verbose):
router.post('/users', (req, res, next) => {
  try {
    const user = await createUser(req.body)
    res.json(user)
  } catch (err) {
    next(err) // Must manually pass to error middleware
  }
})

// WITH asyncHandler (clean):
router.post('/users',
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body)
    res.json(user)
    // Errors automatically caught and passed to middleware
  })
)

// ============================================================================
// 3. ZOD VALIDATION - Runtime Schema Validation
// ============================================================================

/**
 * Define Zod schemas in dedicated schema files for reusability
 * Example: src/schemas/topic.schema.ts
 */

import { z } from 'zod'

// Define validation schemas
export const createTopicSchema = z.object({
  slug: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  category: z.enum(['Programming', 'Math', 'Science']),
})

export type CreateTopicInput = z.infer<typeof createTopicSchema>

// ============================================================================
// 4. VALIDATERESOURCE MIDDLEWARE - Automatic Validation
// ============================================================================

/**
 * validateResource middleware validates request body, query, or params
 * and throws AppError if validation fails.
 * 
 * Usage patterns:
 */

import { validateResource } from '../middleware/validateResource.js'
import { topicSchemas } from '../schemas/topic.schema.js'

// Validate request body only
router.post('/topics',
  validateResource(topicSchemas.create, 'body'),
  asyncHandler(async (req, res) => {
    // req.body is now guaranteed to match schema
    const topic = await db.topic.create(req.body)
    res.status(201).json(topic)
  })
)

// Validate query parameters only
router.get('/topics',
  validateResource(topicSchemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    // req.query is now validated
    const topics = await db.topic.findMany({
      skip: (req.query.page - 1) * req.query.limit,
      take: req.query.limit,
    })
    res.json(topics)
  })
)

// Validate route parameters only
router.get('/topics/:id',
  validateResource(topicSchemas.idParam, 'params'),
  asyncHandler(async (req, res) => {
    // req.params.id is guaranteed to be valid UUID
    const topic = await db.topic.findUnique({
      where: { id: req.params.id }
    })
    if (!topic) throw AppError.notFound('Topic not found')
    res.json(topic)
  })
)

// ============================================================================
// 5. ERROR HANDLER MIDDLEWARE - Centralized Error Processing
// ============================================================================

/**
 * The errorHandler middleware intercepts all errors and converts them to
 * consistent API responses. It's registered LAST in the middleware chain.
 * 
 * Handles:
 * - AppError: Sends specific status code and error code
 * - ZodError: Validation failures from manual schema.parse() calls
 * - Prisma errors: Database constraint violations, records not found, etc.
 * - JWT errors: Token invalid, expired, etc.
 * - Unknown errors: Logged fully, generic response sent to client
 */

// Example error responses:

// AppError.badRequest thrown
// Response: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: {...} } }

// Prisma P2002 (unique constraint)
// Response: { success: false, error: { code: 'ALREADY_EXISTS', message: 'email already exists' } }

// Prisma P2025 (record not found)
// Response: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } }

// Unhandled error
// Response: { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }

// ============================================================================
// 6. COMPLETE EXAMPLE - Topics Route with Full Validation
// ============================================================================

import { Router, Request } from 'express'
import { validateResource } from '../middleware/validateResource.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { topicSchemas } from '../schemas/topic.schema.js'
import { ok, created } from '../utils/response.js'
import { prisma } from '../db.js'

const router = Router()

/**
 * POST /topics - Create a new topic
 * Validates: body (must match createTopicSchema)
 * Errors: 400 Validation Error, 409 Conflict (slug exists), 500 Server Error
 */
router.post('/topics',
  validateResource(topicSchemas.create, 'body'),
  asyncHandler(async (req: Request, res) => {
    // Body is validated at this point
    const body = req.body as CreateTopicInput
    
    // Check slug uniqueness
    const existing = await prisma.topic.findUnique({
      where: { slug: body.slug }
    })
    if (existing) {
      throw AppError.conflict('Topic with this slug already exists')
    }
    
    // Create topic
    const topic = await prisma.topic.create({
      data: body
    })
    
    return created(res, topic)
  })
)

/**
 * GET /topics - List topics with pagination
 * Validates: query (page, limit, category, lang)
 */
router.get('/topics',
  validateResource(topicSchemas.pagination, 'query'),
  asyncHandler(async (req: Request, res) => {
    const { page, limit, category, lang } = req.query as any
    
    const topics = await prisma.topic.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: category ? { category } : undefined,
    })
    
    return ok(res, topics)
  })
)

/**
 * GET /topics/:id - Get single topic
 * Validates: params (id must be valid UUID)
 */
router.get('/topics/:id',
  validateResource(topicSchemas.idParam, 'params'),
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params
    
    const topic = await prisma.topic.findUnique({
      where: { id }
    })
    
    if (!topic) {
      throw AppError.notFound(`Topic with id '${id}' not found`)
    }
    
    return ok(res, topic)
  })
)

/**
 * PUT /topics/:id - Update topic
 * Validates: params (id) and body (partial update)
 */
router.put('/topics/:id',
  validateResource(topicSchemas.idParam, 'params'),
  validateResource(topicSchemas.update, 'body'),
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params
    const body = req.body as UpdateTopicInput
    
    const topic = await prisma.topic.update({
      where: { id },
      data: body
    })
    
    return ok(res, topic)
  })
)

/**
 * DELETE /topics/:id - Delete topic
 * Validates: params (id)
 * Handles: 404 Not Found (via Prisma P2025 error), 500 Server Error
 */
router.delete('/topics/:id',
  validateResource(topicSchemas.idParam, 'params'),
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params
    
    await prisma.topic.delete({
      where: { id }
    })
    
    res.status(204).send()
  })
)

export default router

// ============================================================================
// 7. COMMON PATTERNS & BEST PRACTICES
// ============================================================================

/**
 * PATTERN 1: Validate multiple sources
 */
router.put('/posts/:id/comments/:commentId',
  validateResource(postIdSchema, 'params'),
  validateResource(updateCommentSchema, 'body'),
  asyncHandler(async (req, res) => {
    // params and body are both validated
  })
)

/**
 * PATTERN 2: Custom validation beyond Zod
 */
router.post('/users',
  validateResource(userSchemas.create, 'body'),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as CreateUserInput
    
    // Zod validation passed, now check business logic
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      // Throw with specific error code
      throw AppError.conflict('Email already registered')
    }
    
    // Create user...
  })
)

/**
 * PATTERN 3: Chainable error messages
 */
if (!user) {
  throw AppError.notFound('User with email ' + email + ' not found')
}

/**
 * PATTERN 4: Include details in error for frontend debugging
 */
if (validationErrors.length > 0) {
  throw AppError.badRequest('Validation failed', {
    fields: validationErrors
  })
}

// ============================================================================
// 8. MIGRATION GUIDE - Converting Old Routes
// ============================================================================

/**
 * OLD WAY (manual try/catch, no validation):
 */
router.post('/topics', async (req, res, next) => {
  try {
    // Manual validation
    if (!req.body.slug) {
      return res.status(400).json({ error: 'Slug required' })
    }
    
    // Create
    const topic = await prisma.topic.create({ data: req.body })
    res.status(201).json(topic)
  } catch (err) {
    // Manual error handling
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already exists' })
    }
    next(err)
  }
})

/**
 * NEW WAY (clean, automated, consistent):
 */
router.post('/topics',
  validateResource(topicSchemas.create, 'body'),
  asyncHandler(async (req, res) => {
    // Validation is automatic, no need to check
    const topic = await prisma.topic.create({ data: req.body })
    return created(res, topic)
    // Prisma errors automatically converted to AppError by error handler
  })
)

// ============================================================================
