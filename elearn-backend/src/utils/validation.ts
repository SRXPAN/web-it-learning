// src/utils/validation.ts
import { z } from 'zod'
import { VALIDATION } from '@elearn/shared'

/**
 * Базові схеми валідації для повторного використання
 */

// ID схеми
export const idSchema = z.string().min(1).max(50)
export const cuidSchema = z.string().cuid()

// Email з нормалізацією
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(VALIDATION.EMAIL_MAX_LENGTH)
  .transform(email => email.toLowerCase().trim())

// Пароль з вимогами безпеки
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(VALIDATION.PASSWORD_MAX_LENGTH, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Простіший пароль для MVP (можна змінити пізніше)
export const passwordSchemaSimple = z.string()
  .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
  .max(VALIDATION.PASSWORD_MAX_LENGTH, 'Password too long')

// Ім'я користувача
export const nameSchema = z.string()
  .min(VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
  .max(VALIDATION.NAME_MAX_LENGTH, 'Name too long')
  .regex(/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'-]+$/, 'Name contains invalid characters')

// Slug для URL
export const slugSchema = z.string()
  .min(2)
  .max(VALIDATION.SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers and hyphens')

// URL
export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(VALIDATION.URL_MAX_LENGTH)

// Текстовий контент
export const contentSchema = z.string()
  .max(VALIDATION.CONTENT_MAX_LENGTH, 'Content too long')

// Пагінація
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Сортування
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// ============================================
// AUTH REQUEST SCHEMAS
// ============================================

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchemaSimple,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchemaSimple,
})

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchemaSimple,
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export const resendVerificationEmailSchema = z.object({
  email: emailSchema,
})

export const avatarSchema = z.object({
  avatar: z.string().max(500000, 'Avatar too large'),
})

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
})

/**
 * Хелпер для безпечного парсингу з Zod
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.errors[0]
  return { 
    success: false, 
    error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed'
  }
}

/**
 * Створює схему для ID параметрів запиту
 */
export const paramsWithId = z.object({
  id: cuidSchema,
})

export const paramsWithTopicId = z.object({
  topicId: cuidSchema,
})

export const paramsWithQuizId = z.object({
  quizId: cuidSchema,
})
