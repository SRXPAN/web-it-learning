// src/routes/auth.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { requireAuth, COOKIE_NAME, REFRESH_COOKIE_NAME } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import { validateResource } from '../middleware/validateResource.js'
import { authSchemas } from '../schemas/auth.schema.js'
import { auditLog, AuditActions, AuditResources } from '../services/audit.service.js'
import {
  getAccessCookieOptions,
  getRefreshCookieOptions,
  getClearCookieOptions,
  getClearRefreshCookieOptions,
} from '../utils/cookie.js'
import {
  registerUser,
  loginUser,
  refreshUserTokens,
  logoutUser,
  logoutAllDevices,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  deleteUser,
} from '../services/auth.service.js'
import { logger } from '../utils/logger.js'
import bcrypt from 'bcryptjs'
import { ok, created } from '../utils/response.js'
import { deleteFile } from '../services/storage.service.js'
import { getBadges } from '../utils/gamification.js'

const router = Router()

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(COOKIE_NAME, accessToken, getAccessCookieOptions())
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions())
  res.clearCookie(REFRESH_COOKIE_NAME, getClearRefreshCookieOptions())
}

function getClientInfo(req: Request): { userAgent?: string; ip?: string } {
  const forwardedFor = req.headers['x-forwarded-for']
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]

  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip || forwardedIp,
  }
}

// Note: CSRF endpoint moved to index.ts (before auth limiter)

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      xp: true, 
      avatarId: true,
      emailVerified: true,
      avatarFile: { select: { id: true, key: true, mimeType: true } },
    },
  })
  if (!user) {
    throw AppError.notFound('User not found')
  }
  return ok(res, { ...user, badges: getBadges(user.xp) })
}))

router.post(
  '/register',
  authLimiter,
  validateResource(authSchemas.register, 'body'),
  asyncHandler(async (req: Request, res) => {
    const { userAgent, ip } = getClientInfo(req)
    const result = await registerUser(req.body, userAgent, ip)

    // SECURITY: Check if this is a fake response (empty tokens = user already exists)
    if (!result.tokens.accessToken || !result.tokens.refreshToken) {
      // Don't set cookies, but still return success to prevent user enumeration
      return created(res, {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          xp: result.user.xp,
          emailVerified: result.user.emailVerified
        },
        message: 'Registration successful. Please verify your email.',
      })
    }

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
    // TEMPORARY: Return tokens in body for cross-domain auth (same as login)
    return created(res, {
      user: result.user,
      message: 'Registration successful. Please verify your email.',
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken
    })
  })
)

router.post(
  '/login',
  authLimiter,
  validateResource(authSchemas.login, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const { userAgent, ip } = getClientInfo(req)
    logger.info('[LOGIN] Attempt', { email: req.body.email, ip, origin: req.headers.origin })
    try {
      const result = await loginUser(req.body, userAgent, ip)
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
      logger.info('[LOGIN] Success', { userId: result.user.id, email: result.user.email })
      // TEMPORARY: Return tokens in body for cross-domain auth (until api.e-learn.space is configured)
      return ok(res, { 
        user: result.user, 
        badges: getBadges(result.user.xp),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      })
    } catch (e) {
      logger.error('[LOGIN] Failed', { email: req.body.email, error: e instanceof Error ? e.message : 'Unknown' })
      if (e instanceof Error && e.message === 'Invalid credentials') {
        throw AppError.unauthorized('Invalid credentials')
      }
      throw e
    }
  })
)

// POST /api/auth/refresh — оновити токени
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!refreshToken) {
      throw AppError.unauthorized('No refresh token')
    }

    const { userAgent, ip } = getClientInfo(req)
    const tokens = await refreshUserTokens(refreshToken, userAgent, ip)

    if (!tokens) {
      clearAuthCookies(res)
      throw AppError.unauthorized('Invalid or expired refresh token')
    }

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken)
    return ok(res, { message: 'Tokens refreshed' })
  })
)

// POST /api/auth/logout — вихід
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (refreshToken) {
      await logoutUser(refreshToken)
    }
    clearAuthCookies(res)
    return ok(res, { message: 'Logged out' })
  })
)

// POST /api/auth/logout-all — вихід з усіх пристроїв
router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await logoutAllDevices(req.user!.id)
    clearAuthCookies(res)
    return ok(res, { message: 'Logged out from all devices' })
  })
)

// ============================================
// PASSWORD ROUTES
// ============================================

// PUT /api/auth/password — змінити пароль
router.put(
  '/password',
  requireAuth,
  validateResource(authSchemas.changePassword, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword)
      return ok(res, { message: 'Password changed successfully' })
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'Current password is incorrect') {
          throw AppError.badRequest('Incorrect current password')
        }
        if (e.message === 'User not found') {
          throw AppError.notFound('User not found')
        }
      }
      throw e
    }
  })
)

// PUT /api/auth/email — змінити email
router.put(
  '/email',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { newEmail, password } = req.body
    
    if (!newEmail || !password) {
      throw AppError.badRequest('New email and password are required')
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      throw AppError.badRequest('Invalid email format')
    }
    
    // Only allow @gmail.com emails
    if (!newEmail.toLowerCase().endsWith('@gmail.com')) {
      throw AppError.badRequest('Email must end with @gmail.com')
    }
    
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, password: true, email: true }
    })
    
    if (!user) {
      throw AppError.notFound('User not found')
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw AppError.unauthorized('Incorrect password')
    }
    
    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase().trim() }
    })
    
    if (existingUser && existingUser.id !== user.id) {
      throw AppError.conflict('Email already in use')
    }
    
    // Update email
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        email: newEmail.toLowerCase().trim(),
        emailVerified: false // Require re-verification
      }
    })
    
    await auditLog({
      userId: user.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.USER,
      resourceId: user.id,
      metadata: { oldEmail: user.email, newEmail: newEmail.toLowerCase().trim() },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    
    return ok(res, { message: 'Email changed successfully' })
  })
)

// POST /api/auth/forgot-password — запит на скидання паролю
router.post(
  '/forgot-password',
  authLimiter,
  validateResource(authSchemas.forgotPassword, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    await requestPasswordReset(req.body.email)
    return ok(res, {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    })
  })
)

// POST /api/auth/reset-password — скидання паролю за токеном
router.post(
  '/reset-password',
  authLimiter,
  validateResource(authSchemas.resetPassword, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const success = await resetPassword(req.body.token, req.body.newPassword)
    if (!success) {
      throw AppError.badRequest('Invalid or expired reset token')
    }
    return ok(res, { message: 'Password has been reset successfully' })
  })
)

// POST /api/auth/verify-email — верифікація email
router.post(
  '/verify-email',
  validateResource(authSchemas.verifyEmail, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const success = await verifyEmail(req.body.token)
    if (!success) {
      throw AppError.badRequest('Invalid or expired verification token')
    }
    return ok(res, { message: 'Email verified successfully' })
  })
)

// POST /api/auth/resend-verification — повторне відправлення верифікації
router.post(
  '/resend-verification',
  requireAuth,
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true, emailVerified: true },
    })

    if (!user) {
      throw AppError.notFound('User not found')
    }

    if (user.emailVerified) {
      throw AppError.badRequest('Email already verified')
    }

    await resendVerificationEmail(user.email)
    return ok(res, { message: 'Verification email sent' })
  })
)

// PUT /api/auth/email — змінити email
router.put(
  '/email',
  requireAuth,
  validateResource(authSchemas.changeEmail, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const { newEmail, password } = req.body
    const userId = req.user!.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true },
    })

    if (!user) {
      throw AppError.notFound('User not found')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw AppError.badRequest('Incorrect password')
    }

    if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
      const exists = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } })
      if (exists) {
        throw AppError.badRequest('Email already in use')
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: newEmail.toLowerCase(),
        emailVerified: false, // Потрібна повторна верифікація
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xp: true,
        avatarId: true,
        emailVerified: true,
        avatarFile: { select: { id: true, key: true, mimeType: true } },
      },
    })

    await resendVerificationEmail(newEmail.toLowerCase())

    await auditLog({
      userId,
      action: AuditActions.UPDATE,
      resource: AuditResources.USER,
      resourceId: user.id,
      metadata: { oldEmail: user.email, newEmail },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, {
      message: 'Email changed. Please verify your new email address.',
      user: updatedUser,
    })
  })
)

// POST /api/auth/avatar — завантажити аватар (deprecated - use /files API instead)
router.post('/avatar', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.body
  
  if (!fileId) {
    throw AppError.badRequest('fileId is required. Use /files/presign-upload first.')
  }
  
  // Verify file exists and is owned by user
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  })
  
  if (!file || file.uploadedById !== req.user!.id) {
    throw AppError.badRequest('Invalid file')
  }

  // Get current user with avatar
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { avatarFile: true }
  })

  // If new avatar is different from old one, delete old file from S3
  if (fileId && currentUser?.avatarId && fileId !== currentUser.avatarId) {
    if (currentUser.avatarFile?.key) {
      deleteFile(currentUser.avatarFile.key).catch((err: unknown) =>
        logger.error('Failed to cleanup old avatar:', err)
      )
    }
  }
  
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarId: fileId },
    select: { 
      id: true, name: true, email: true, role: true, xp: true, 
      avatarId: true, emailVerified: true,
      avatarFile: { select: { id: true, key: true, mimeType: true } }
    },
  })
  
  return ok(res, { user: updatedUser })
}))

// DELETE /api/auth/avatar — видалити аватар
router.delete('/avatar', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarId: null },
    select: { 
      id: true, name: true, email: true, role: true, xp: true, 
      avatarId: true, emailVerified: true,
      avatarFile: { select: { id: true, key: true, mimeType: true } }
    },
  })
  
  return ok(res, { user: updatedUser })
}))


// DELETE /api/auth/account — видалення користувача (GDPR Right to be Forgotten)
router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await deleteUser(req.user!.id)
    
    // Logout user after deletion
    clearAuthCookies(res)
    
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: AuditResources.USER,
      resourceId: req.user!.id,
      metadata: { reason: 'user_request' },
      userAgent: getClientInfo(req).userAgent,
      ip: getClientInfo(req).ip,
    })
    
    return ok(res, { message: 'Account deleted successfully' })
  })
)

// GET /api/auth/leaderboard — топ користувачів (тільки STUDENT, без видалених)
router.get(
  '/leaderboard',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT', // Тільки студенти, без адмінів і модераторів
        deletedAt: null, // Без видалених акаунтів
      },
      orderBy: { xp: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        xp: true,
        avatarId: true,
        avatarFile: { select: { id: true, key: true, mimeType: true } },
        createdAt: true,
      },
    })

    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1,
      level: Math.floor(user.xp / 100) + 1,
      badges: getBadges(user.xp),
    }))

    return ok(res, leaderboard)
  })
)

export default router
