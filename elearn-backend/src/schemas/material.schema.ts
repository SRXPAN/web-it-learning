/**
 * Material/Content Validation Schemas
 * Zod schemas for creating and updating learning materials with multi-language support
 */
import { z } from 'zod'
import { commonSchemas } from './common.schema.js'

/**
 * Material type enum
 */
export const materialTypeEnum = z.enum(['pdf', 'video', 'text', 'link'])

export type MaterialType = z.infer<typeof materialTypeEnum>

/**
 * Create material schema
 */
export const createMaterialSchema = z.object({
  topicId: z.string().cuid('Invalid topic ID'), // Changed to CUID
  type: materialTypeEnum,
  
  // Language-specific titles
  titleUA: z.string().min(1, 'Ukrainian title required').max(255),
  titleEN: z.string().min(1, 'English title required').max(255),
  titlePL: z.string().max(255).optional(),
  
  // Language-specific content
  contentUA: z.string().optional(),
  contentEN: z.string().optional(),
  contentPL: z.string().optional(),
  
  // Language-specific URLs/file paths
  urlUA: z.string().url().optional(),
  urlEN: z.string().url().optional(),
  urlPL: z.string().url().optional(),
  
  // Common fields
  order: z.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

/**
 * Update material schema
 */
export const updateMaterialSchema = createMaterialSchema.partial()

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>

/**
 * Bulk update material translations schema
 */
export const updateMaterialTranslationsSchema = z.object({
  titleUA: z.string().min(1).max(255).optional(),
  titleEN: z.string().min(1).max(255).optional(),
  titlePL: z.string().max(255).optional(),
  
  contentUA: z.string().optional(),
  contentEN: z.string().optional(),
  contentPL: z.string().optional(),
  
  urlUA: z.string().url().optional(),
  urlEN: z.string().url().optional(),
  urlPL: z.string().url().optional(),
  
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export type UpdateMaterialTranslationsInput = z.infer<typeof updateMaterialTranslationsSchema>

/**
 * Material query/pagination schema
 */
export const materialPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: materialTypeEnum.optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  topicId: z.string().cuid().optional(), // This was already correct
  lang: commonSchemas.lang.optional(),
})

export type MaterialPaginationInput = z.infer<typeof materialPaginationSchema>

/**
 * Material ID parameter schema
 */
export const materialIdParamSchema = z.object({
  id: z.string().cuid('Invalid material ID'), // Changed to CUID
})

export type MaterialIdParam = z.infer<typeof materialIdParamSchema>

/**
 * Material with topic and ID parameter schema
 */
export const topicMaterialParamSchema = z.object({
  topicId: z.string().cuid('Invalid topic ID'), // Changed to CUID
  id: z.string().cuid('Invalid material ID'),   // Changed to CUID
})

export type TopicMaterialParam = z.infer<typeof topicMaterialParamSchema>

/**
 * All material schemas
 */
export const materialSchemas = {
  create: createMaterialSchema,
  update: updateMaterialSchema,
  updateTranslations: updateMaterialTranslationsSchema,
  pagination: materialPaginationSchema,
  idParam: materialIdParamSchema,
  topicMaterialParam: topicMaterialParamSchema,
}