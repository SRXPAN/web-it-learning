/**
 * Common Validation Schemas
 * Reusable Zod schemas for cross-cutting concerns
 */
import { z } from 'zod'

/**
 * CUID validation (Prisma default ID format)
 * Changed from UUID to CUID because Prisma uses @default(cuid())
 */
export const cuidSchema = z.string().cuid('Invalid ID format')

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
})

export type PaginationInput = z.infer<typeof paginationSchema>

/**
 * Language parameter
 */
export const langSchema = z.enum(['UA', 'EN', 'PL']).default('EN')

export type Lang = z.infer<typeof langSchema>

/**
 * Standard ID parameter (for route params)
 * Renamed to define it explicitly uses CUID
 */
export const idParamSchema = z.object({
  id: cuidSchema, 
})

export type IdParam = z.infer<typeof idParamSchema>

/**
 * Timestamp format validation
 */
export const dateSchema = z
  .string()
  .datetime()
  .or(z.date())
  .transform((val) => new Date(val))

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .max(255)

/**
 * Password validation
 * Expanded special characters regex to include common ones like _ - + = ?
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[\W_]/, 'Password must contain at least one special character') // \W matches any non-word char

/**
 * Simplified password (for admin setting passwords)
 */
export const passwordSchemaSimple = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(255)

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(255)
  .trim()

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL')

/**
 * Status enum
 */
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])

/**
 * Role enum
 */
export const roleSchema = z.enum(['STUDENT', 'EDITOR', 'ADMIN'])

/**
 * Common schemas object
 */
export const commonSchemas = {
  id: cuidSchema, // Use general name 'id' pointing to cuidSchema
  cuid: cuidSchema,
  pagination: paginationSchema,
  lang: langSchema,
  idParam: idParamSchema,
  date: dateSchema,
  email: emailSchema,
  password: passwordSchema,
  passwordSimple: passwordSchemaSimple,
  name: nameSchema,
  url: urlSchema,
  status: statusSchema,
  role: roleSchema,
}