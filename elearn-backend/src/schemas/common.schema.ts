/**
 * Common Validation Schemas
 * Reusable Zod schemas for cross-cutting concerns
 */
import { z } from 'zod'

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid ID format')

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
 */
export const idParamSchema = z.object({
  id: uuidSchema,
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
 * Email validation (matches backend email regex)
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .max(255)

/**
 * Password validation (minimum 8 chars, at least one uppercase, one lowercase, one number, one special char)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)')

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
 * Status enum (common)
 */
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])

/**
 * Role enum (user roles)
 */
export const roleSchema = z.enum(['STUDENT', 'EDITOR', 'ADMIN'])

/**
 * Common schemas object
 */
export const commonSchemas = {
  uuid: uuidSchema,
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
