// src/routes/topics.ts
import { Router, Request } from 'express'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { validateResource } from '../middleware/validateResource.js'
import { topicSchemas } from '../schemas/topic.schema.js'
import { getTopics, getTopicByIdOrSlug } from '../services/topics.service.js'
import { ok } from '../utils/response.js'
import { z } from 'zod' // Додали для локальної схеми

const router = Router()

// Helper
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// Simple schema for language query (used in GET /:slug)
const langQuerySchema = z.object({
  lang: z.enum(['UA', 'EN', 'PL']).default('EN')
})

/**
 * GET /api/topics
 * List all topics with pagination, filtering, and localization
 */
router.get(
  '/',
  optionalAuth,
  validateResource(topicSchemas.pagination, 'query'),
  asyncHandler(async (req: Request, res) => {
    // TypeScript safe casting based on Zod schema defaults
    const { page, limit, category, lang, search } = req.query as unknown as { 
      page: number, limit: number, category?: string, lang: string, search?: string 
    }

    const isStaff = ['ADMIN', 'EDITOR'].includes(req.user?.role || '')

    const result = await getTopics({
      page: page || 1,
      limit: limit || 20,
      category: category as any,
      lang: lang.toUpperCase(), // Service expects uppercase
      isStaff,
      search,
      userId: req.user?.id  // Pass user ID to load viewed materials
    })

    return ok(res, result)
  })
)

/**
 * GET /api/topics/tree
 * Get topics as a tree structure
 */
router.get(
  '/tree',
  optionalAuth,
  validateResource(langQuerySchema, 'query'),
  asyncHandler(async (req: Request, res) => {
    const { lang } = req.query as unknown as { lang: string }
    const isStaff = ['ADMIN', 'EDITOR'].includes(req.user?.role || '')

    const result = await getTopics({
      page: 1,
      limit: 1000,
      lang: lang.toUpperCase(),
      isStaff,
      userId: req.user?.id  // Pass user ID to load viewed materials
    })

    return ok(res, result.topics)
  })
)

/**
 * GET /api/topics/:slug
 * Get topic details with nested materials and quizzes
 */
router.get(
  '/:slug',
  optionalAuth,
  // 1. Validate route param (slug)
  validateResource(topicSchemas.slugParam, 'params'), 
  // 2. Validate query (lang only)
  validateResource(langQuerySchema, 'query'),
  asyncHandler(async (req: Request, res) => {
    const slug = getParam(req.params.slug)
    const { lang } = req.query as unknown as { lang: string }

    const isStaff = ['ADMIN', 'EDITOR'].includes(req.user?.role || '')

    // Get topic with validation
    const topic = await getTopicByIdOrSlug(slug, lang.toUpperCase(), isStaff, req.user?.id)

    if (!topic) {
      throw AppError.notFound(`Topic '${slug}' not found`)
    }

    return ok(res, topic)
  })
)

export default router