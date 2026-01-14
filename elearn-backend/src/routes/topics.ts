/**
 * Topics API Routes
 * Public endpoints for browsing topics and materials
 */
import { Router, Request } from 'express'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { validateResource } from '../middleware/validateResource.js'
import { topicSchemas } from '../schemas/topic.schema.js'
import { getTopics, getTopicByIdOrSlug } from '../services/topics.service.js'
import { ok } from '../utils/response.js'

const router = Router()

// Helper to safely extract string from params (handles string | string[])
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

/**
 * GET /api/topics
 * List all topics with pagination, filtering, and localization
 */
router.get(
  '/',
  optionalAuth,
  validateResource(topicSchemas.pagination, 'query'),
  asyncHandler(async (req: Request, res) => {
    const { page, limit, category, lang, search } = req.query as any

    // Check if user is staff (ADMIN or EDITOR)
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

    // Call service with validated parameters
    const result = await getTopics({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      category: category as any,
      lang: (lang as string).toUpperCase(),
      isStaff,
    })

    return ok(res, result)
  })
)

/**
 * GET /api/topics/:slug
 * Get topic details with nested materials and quizzes
 */
router.get(
  '/:slug',
  optionalAuth,
  validateResource(topicSchemas.pagination, 'query'),
  asyncHandler(async (req: Request, res) => {
    const slug = getParam(req.params.slug)
    const lang = ((req.query.lang as string) || 'EN').toUpperCase()

    // Check if user is staff
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

    // Get topic with validation
    const topic = await getTopicByIdOrSlug(slug, lang, isStaff)

    if (!topic) {
      throw AppError.notFound(`Topic '${slug}' not found`)
    }

    return ok(res, topic)
  })
)

export default router