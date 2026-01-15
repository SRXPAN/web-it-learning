/**
 * Authentication Validation Schemas
 * Zod schemas for login, register, and password-related endpoints
 */
import { z } from 'zod'
import { commonSchemas } from './common.schema.js'

/**
 * Register schema
 */
export const registerSchema = z.object({
  email: commonSchemas.email,
  password: commonSchemas.password,
  name: commonSchemas.name,
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: commonSchemas.email,
  password: z.string().min(1, 'Password required'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required').optional(),
})

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: commonSchemas.password,
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Change email schema
 */
export const changeEmailSchema = z.object({
  newEmail: commonSchemas.email,
  password: z.string().min(1, 'Password required'),
})

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>

/**
 * Forgot password schema (request password reset)
 */
export const forgotPasswordSchema = z.object({
  email: commonSchemas.email,
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/**
 * Reset password schema
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Verify email schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token required'),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

/**
 * Resend verification email schema
 */
export const resendVerificationEmailSchema = z.object({
  email: commonSchemas.email,
})

export type ResendVerificationEmailInput = z.infer<typeof resendVerificationEmailSchema>

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  name: commonSchemas.name.optional(),
  avatar: z.string().url().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * All auth schemas
 */
export const authSchemas = {
  register: registerSchema,
  login: loginSchema,
  refreshToken: refreshTokenSchema,
  changePassword: changePasswordSchema,
  changeEmail: changeEmailSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  verifyEmail: verifyEmailSchema,
  resendVerificationEmail: resendVerificationEmailSchema,
  updateProfile: updateProfileSchema,
}
