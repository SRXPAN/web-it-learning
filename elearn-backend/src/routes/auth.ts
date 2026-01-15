// src/routes/auth.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { requireAuth, COOKIE_NAME, REFRESH_COOKIE_NAME } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { setCsrfToken } from '../middleware/csrf.js'
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
} from '../services/auth.service.js'
import { logger } from '../utils/logger.js'
import bcrypt from 'bcryptjs'
import { ok } from '../utils/response.js'
import { deleteFile } from '../services/storage.service.js'

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

function getBadges(xp: number): string[] {
  const badges: string[] = []
  if (xp >= 10) badges.push('first_steps')
  if (xp >= 50) badges.push('rising_star')
  if (xp >= 100) badges.push('dedicated_learner')
  if (xp >= 250) badges.push('quiz_master')
  if (xp >= 500) badges.push('expert')
  if (xp >= 1000) badges.push('legend')
  return badges
}

// ============================================
// AUTH ROUTES
// ============================================

/**
 * @openapi
 * /api/auth/csrf:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get CSRF token
 *     description: Returns a CSRF token that must be included in all mutating requests
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 *         headers:
 *           X-CSRF-Token:
 *             schema:
 *               type: string
 *             description: CSRF token to include in subsequent requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get('/csrf', setCsrfToken)

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Returns the currently authenticated user's profile information
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *                   enum: [STUDENT, EDITOR, ADMIN]
 *                 xp:
 *                   type: integer
 *                 avatarId:
 *                   type: string
 *                   nullable: true
 *                 emailVerified:
 *                   type: boolean
 *                 avatarFile:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     key:
 *                       type: string
 *                     mimeType:
 *                       type: string
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
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
    if (!user) return res.status(401).json({ error: 'User not found' })
    res.json(user)
  } catch (e) { next(e) }
})

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new student account and receive initial tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Authentication cookies (elearn_token, elearn_refresh_token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: Registration successful. Please verify your email.
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   nullable: true
 *       429:
 *         description: Too many registration attempts
 */
/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  authLimiter,
  validateResource(authSchemas.register, 'body'),
  asyncHandler(async (req: Request, res) => {
    const { userAgent, ip } = getClientInfo(req)
    const result = await registerUser(req.body, userAgent, ip)

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
    return ok(res, {
      user: result.user,
      message: 'Registration successful. Please verify your email.',
    })
  })
)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login with email and password
 *     description: Authenticate a user and receive access/refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Authentication cookies (elearn_token, elearn_refresh_token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ['first_steps', 'rising_star']
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Invalid credentials or unverified email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *                   nullable: true
 *       429:
 *         description: Too many login attempts
 */
router.post(
  '/login',
  authLimiter,
  validateResource(authSchemas.login, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const { userAgent, ip } = getClientInfo(req)
    try {
      const result = await loginUser(req.body, userAgent, ip)
      setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken)
      return ok(res, { user: result.user, badges: getBadges(result.user.xp) })
    } catch (e) {
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

// ============================================
// EMAIL VERIFICATION ROUTES
// ============================================

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

// ============================================
// EMAIL & PROFILE ROUTES
// ============================================

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
router.post('/avatar', requireAuth, async (req, res, next) => {
  try {
    const { fileId } = req.body
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required. Use /files/presign-upload first.' })
    }
    
    // Verify file exists and is owned by user
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    })
    
    if (!file || file.uploadedById !== req.user!.id) {
      return res.status(400).json({ error: 'Invalid file' })
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
    
    res.json({ ok: true, user: updatedUser })
  } catch (e) { next(e) }
})

// DELETE /api/auth/avatar — видалити аватар
router.delete('/avatar', requireAuth, async (req, res, next) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarId: null },
      select: { 
        id: true, name: true, email: true, role: true, xp: true, 
        avatarId: true, emailVerified: true,
        avatarFile: { select: { id: true, key: true, mimeType: true } }
      },
    })
    
    res.json({ ok: true, user: updatedUser })
  } catch (e) { next(e) }
})

// ============================================
// LEADERBOARD
// ============================================

// GET /api/auth/leaderboard — топ користувачів
router.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const users = await prisma.user.findMany({
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
