/**
 * Topic Validation Schemas
 * Zod schemas for validating topic-related requests
 */
import { z } from 'zod'

/**
 * Pagination/query parameters schema
 */
export const topicPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z
    .enum([
      'Programming',
      'Mathematics',
      'Databases',
      'Networks',
      'WebDevelopment',
      'MobileDevelopment',
      'MachineLearning',
      'Security',
      'DevOps',
      'OperatingSystems',
    ])
    .optional(),
  lang: z.enum(['UA', 'EN', 'PL']).default('EN'),
  search: z.string().min(1).max(100).optional(),
})

export type TopicPaginationInput = z.infer<typeof topicPaginationSchema>

/**
 * Topic language-specific content
 */
const topicTranslationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(0).max(2000).optional(),
})

/**
 * Create topic schema (admin/editor only)
 */
export const createTopicSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  titleUA: z.string().min(1).max(255).optional(),
  titleEN: z.string().min(1).max(255).optional(),
  titlePL: z.string().min(1).max(255).optional(),
  descUA: z.string().min(0).max(2000).optional(),
  descEN: z.string().min(0).max(2000).optional(),
  descPL: z.string().min(0).max(2000).optional(),
  category: z.enum([
    'Programming',
    'Mathematics',
    'Databases',
    'Networks',
    'WebDevelopment',
    'MobileDevelopment',
    'MachineLearning',
    'Security',
    'DevOps',
    'OperatingSystems',
  ]),
  parentId: z.string().uuid().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
})

export type CreateTopicInput = z.infer<typeof createTopicSchema>

/**
 * Update topic schema
 */
export const updateTopicSchema = createTopicSchema.partial()

export type UpdateTopicInput = z.infer<typeof updateTopicSchema>

/**
 * Topic ID parameter schema
 */
export const topicIdParamSchema = z.object({
  id: z.string().uuid('Invalid topic ID'),
})

export type TopicIdParam = z.infer<typeof topicIdParamSchema>

/**
 * Topic slug parameter schema
 */
export const topicSlugParamSchema = z.object({
  slug: z.string().min(1).max(255),
})

export type TopicSlugParam = z.infer<typeof topicSlugParamSchema>

/**
 * Bulk status update schema
 */
export const bulkStatusUpdateSchema = z.object({
  topicIds: z.array(z.string().uuid()).min(1),
  status: z.enum(['DRAFT', 'PUBLISHED']),
})

export type BulkStatusUpdateInput = z.infer<typeof bulkStatusUpdateSchema>

/**
 * Complete validation schemas for different operations
 */
export const topicSchemas = {
  // Query/pagination
  pagination: topicPaginationSchema,

  // Create
  create: createTopicSchema,

  // Update
  update: updateTopicSchema,

  // Parameters
  idParam: topicIdParamSchema,
  slugParam: topicSlugParamSchema,

  // Bulk operations
  bulkStatusUpdate: bulkStatusUpdateSchema,
}
