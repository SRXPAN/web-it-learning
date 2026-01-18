import { Router, Request, Response } from 'express'
import { Role, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth'
import { ok, created, badRequest, notFound, forbidden, serverError, conflict } from '../utils/response'
import { auditLog, AuditActions, AuditResources } from '../services/audit.service'
import { z } from 'zod'
import { emailSchema, nameSchema, passwordSchemaSimple } from '../utils/validation'
import { logger } from '../utils/logger.js'
import fs from 'fs/promises';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

// Helper to safely extract string from params (handles string | string[])
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// All admin routes require auth
router.use(requireAuth)

// Role helpers
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user) return forbidden(res, 'Not authenticated')
    if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient permissions')
    next()
  }
}
const requireAdmin = requireRole(['ADMIN'])
const requireAdminOrEditor = requireRole(['ADMIN', 'EDITOR'])

// ============================================
// STATISTICS (ADMIN + EDITOR)
// ============================================

/**
 * GET /admin/stats
 * Get system statistics
 * Accessible to ADMIN and EDITOR (dashboard view only)
 */
router.get('/stats', requireRole(['ADMIN', 'EDITOR']), async (req: Request, res: Response) => {
  logger.info('Admin stats endpoint called')
  logger.info('User context', { user: req.user })
  try {
    const [
      totalUsers,
      usersByRole,
      totalTopics,
      totalMaterials,
      totalQuizzes,
      totalQuestions,
      totalFiles,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.topic.count(),
      prisma.material.count(),
      prisma.quiz.count(),
      prisma.question.count(),
      prisma.file.count({ where: { confirmed: true } }),
      prisma.userActivity.findMany({
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: {
          date: true,
          timeSpent: true,
          quizAttempts: true,
          materialsViewed: true,
        },
      }),
    ])

    // Aggregate recent activity by date
    const activityByDate = recentActivity.reduce<Record<string, { timeSpent: number; quizAttempts: number; materialsViewed: number }>>((acc, curr) => {
      const date = curr.date.toISOString().slice(0, 10)
      if (!acc[date]) {
        acc[date] = { timeSpent: 0, quizAttempts: 0, materialsViewed: 0 }
      }
      acc[date].timeSpent += curr.timeSpent
      acc[date].quizAttempts += curr.quizAttempts
      acc[date].materialsViewed += curr.materialsViewed
      return acc
    }, {})

    const result = {
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce<Record<string, number>>((acc, curr) => {
          acc[curr.role] = curr._count
          return acc
        }, {}),
      },
      content: {
        topics: totalTopics,
        materials: totalMaterials,
        quizzes: totalQuizzes,
        questions: totalQuestions,
        files: totalFiles,
      },
      activity: {
        last7days: activityByDate,
      },
    }

    logger.info('Stats result', result)
    return ok(res, result)
  } catch (err) {
    logger.error('Get stats error', err as Error)
    return serverError(res, 'Failed to get stats')
  }
})

// Route-specific role guards
router.use('/users', requireAdmin)
router.use('/audit-logs', requireAdmin)
router.use('/content', requireAdminOrEditor)

// ============================================
// USER MANAGEMENT
// ============================================

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['STUDENT', 'EDITOR', 'ADMIN']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'name', 'xp']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const updateRoleSchema = z.object({
  role: z.enum(['STUDENT', 'EDITOR', 'ADMIN']),
})

const createUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchemaSimple,
  role: z.enum(['STUDENT', 'EDITOR', 'ADMIN']).default('STUDENT'),
})

// Helper: mark user verified
async function markUserVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
    select: { id: true, email: true, name: true, role: true, emailVerified: true },
  })
}

/**
 * GET /admin/users
 * List all users with pagination and filters
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return badRequest(res, 'Invalid query params', parsed.error.flatten())
    }

    const { page, limit, role, search, sortBy, sortOrder } = parsed.data

    const where: Prisma.UserWhereInput = {}
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          xp: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              answers: true,
              topicsCreated: true,
              materialsCreated: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return ok(res, {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    logger.error('List users error', err as Error)
    return serverError(res, 'Failed to list users')
  }
})

/**
 * GET /admin/users/:id
 * Get single user details
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        xp: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            answers: true,
            topicsCreated: true,
            materialsCreated: true,
            quizzesCreated: true,
          },
        },
      },
    })

    if (!user) {
      return notFound(res, 'User not found')
    }

    return ok(res, user)
  } catch (err) {
    logger.error('Get user error', err as Error)
    return serverError(res, 'Failed to get user')
  }
})

/**
 * PUT /admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const { role } = req.body

    if (!role || !['STUDENT', 'EDITOR', 'ADMIN'].includes(role)) {
      return badRequest(res, 'Valid role required')
    }

    // Prevent self-demotion
    if (id === req.user!.id && role !== 'ADMIN') {
      return badRequest(res, 'Cannot change own role')
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.USER,
      resourceId: id,
      metadata: { newRole: role },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, user)
  } catch (err) {
    logger.error('Update role error', err as Error)
    return serverError(res, 'Failed to update role')
  }
})

/**
 * PUT /admin/users/:id/verify
 * Manually mark user email as verified (admin action)
 */
router.put('/users/:id/verify', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return notFound(res, 'User not found')
    }

    if (user.emailVerified) {
      return ok(res, { ...user, emailVerified: true })
    }

    const updated = await markUserVerified(id)

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.USER,
      resourceId: id,
      metadata: { verifiedBy: req.user!.id },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, updated)
  } catch (err) {
    logger.error('Verify user error', err as Error)
    return serverError(res, 'Failed to verify user')
  }
})

/**
 * POST /admin/users
 * Create new user (admin)
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, name, password, role = 'STUDENT' } = req.body

    if (!email || !name || !password) {
      return badRequest(res, 'email, name, and password are required')
    }

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return conflict(res, 'Email already registered')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role as Role,
        emailVerified: true, // Admin-created users are pre-verified
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: AuditResources.USER,
      resourceId: user.id,
      metadata: { email, role },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return created(res, user)
  } catch (err) {
    logger.error('Create user error', err as Error)
    return serverError(res, 'Failed to create user')
  }
})

/**
 * DELETE /admin/users/:id
 * Delete user (soft delete - just removes access)
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)

    // Prevent self-deletion
    if (id === req.user!.id) {
      return badRequest(res, 'Cannot delete yourself')
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return notFound(res, 'User not found')
    }

    // Delete related data
    const timestamp = Date.now();
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: `deleted_admin_${timestamp}_${user.email}`, // Звільняємо email
          // Можна також очистити пароль або сесії
        tokens: { deleteMany: {} } 
      }
    });

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: AuditResources.USER,
      resourceId: id,
      metadata: { email: user.email },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, { deleted: true })
  } catch (err) {
    logger.error('Delete user error', err as Error)
    return serverError(res, 'Failed to delete user')
  }
})

// ============================================
// AUDIT LOGS
// ============================================

/**
 * GET /admin/audit-logs
 * View audit logs with filters
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = req.query

    const where: any = {}

    if (userId) where.userId = userId
    if (action) where.action = action
    if (resource) where.resource = resource
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return ok(res, {
      logs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (err) {
    logger.error('List audit logs error', err as Error)
    return serverError(res, 'Failed to list audit logs')
  }
})

// ============================================
// CONTENT MANAGEMENT
// ============================================

/**
 * GET /admin/content/topics
 * Get all topics with hierarchy for content management
 */
router.get('/content/topics', async (req: Request, res: Response) => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        nameJson: true,
        description: true,
        descJson: true,
        category: true,
        status: true,
        parentId: true,
        _count: {
          select: {
            materials: true,
            quizzes: true,
            children: true,
          },
        },
      },
    })

    // Build tree structure
    const topicMap = new Map(topics.map(t => [t.id, { ...t, children: [] as typeof topics }]))
    const rootTopics: typeof topics = []

    topics.forEach(topic => {
      if (topic.parentId && topicMap.has(topic.parentId)) {
        topicMap.get(topic.parentId)!.children.push(topicMap.get(topic.id)!)
      } else {
        rootTopics.push(topicMap.get(topic.id)!)
      }
    })

    return ok(res, { topics: rootTopics, total: topics.length })
  } catch (err) {
    logger.error('Get topics error', err as Error)
    return serverError(res, 'Failed to get topics')
  }
})

/**
 * POST /admin/content/topics
 * Create new topic
 */
router.post('/content/topics', async (req: Request, res: Response) => {
  try {
    const { slug, name, nameJson, description, descJson, category, parentId } = req.body

    if (!slug || !name) {
      return badRequest(res, 'slug and name are required')
    }

    // Check slug uniqueness
    const existing = await prisma.topic.findUnique({ where: { slug } })
    if (existing) {
      return conflict(res, 'Topic with this slug already exists')
    }

    const topic = await prisma.topic.create({
      data: {
        slug,
        name,
        nameJson: nameJson || {},
        description: description || '',
        descJson: descJson || {},
        category: category || 'Programming',
        parentId: parentId || null,
        status: 'Draft',
        createdById: req.user!.id,
      },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: AuditResources.TOPIC,
      resourceId: topic.id,
      metadata: { slug, name },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return created(res, topic)
  } catch (err) {
    logger.error('Create topic error', err as Error)
    return serverError(res, 'Failed to create topic')
  }
})

/**
 * PUT /admin/content/topics/:id
 * Update topic
 */
router.put('/content/topics/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const { slug, name, nameJson, description, descJson, category, parentId, status, publishedAt } = req.body

    const existing = await prisma.topic.findUnique({ where: { id } })
    if (!existing) {
      return notFound(res, 'Topic not found')
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.topic.findUnique({ where: { slug } })
      if (slugExists) {
        return conflict(res, 'Topic with this slug already exists')
      }
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        ...(slug && { slug }),
        ...(name && { name }),
        ...(nameJson && { nameJson }),
        ...(description !== undefined && { description }),
        ...(descJson && { descJson }),
        ...(category && { category }),
        ...(parentId !== undefined && { parentId }),
        ...(status && { status }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
      },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.TOPIC,
      resourceId: id,
      metadata: { slug: topic.slug },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, topic)
  } catch (err) {
    logger.error('Update topic error', err as Error)
    return serverError(res, 'Failed to update topic')
  }
})

/**
 * DELETE /admin/content/topics/:id
 * Delete topic and all related content
 */
router.delete('/content/topics/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { _count: { select: { materials: true, quizzes: true, children: true } } },
    })

    if (!topic) {
      return notFound(res, 'Topic not found')
    }

    // Delete related content in transaction
    await prisma.$transaction([
      // Delete quiz answers first
      prisma.answer.deleteMany({
        where: { question: { quiz: { topicId: id } } },
      }),
      // Delete options
      prisma.option.deleteMany({
        where: { question: { quiz: { topicId: id } } },
      }),
      // Delete questions
      prisma.question.deleteMany({
        where: { quiz: { topicId: id } },
      }),
      // Delete quizzes
      prisma.quiz.deleteMany({
        where: { topicId: id },
      }),
      // Delete materials
      prisma.material.deleteMany({
        where: { topicId: id },
      }),
      // Update children to have no parent
      prisma.topic.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      }),
      // Finally delete topic
      prisma.topic.delete({
        where: { id },
      }),
    ])

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: AuditResources.TOPIC,
      resourceId: id,
      metadata: { slug: topic.slug, name: topic.name },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, { deleted: true })
  } catch (err) {
    logger.error('Delete topic error', err as Error)
    return serverError(res, 'Failed to delete topic')
  }
})

// ============================================
// QUIZ MANAGEMENT
// ============================================

/**
 * POST /admin/content/topics/:id/quizzes
 * Create a new quiz for a topic
 */
router.post('/content/topics/:id/quizzes', async (req: Request, res: Response) => {
  try {
    const topicId = getParam(req.params.id)
    const { title, titleJson, durationSec = 300 } = req.body

    if (!title) {
      return badRequest(res, 'Quiz title is required')
    }

    // Verify topic exists
    const topic = await prisma.topic.findUnique({ where: { id: topicId } })
    if (!topic) {
      return notFound(res, 'Topic not found')
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        titleJson: titleJson || {},
        durationSec,
        topicId,
        status: 'Draft',
        createdById: req.user!.id,
      },
      include: { questions: { include: { options: true } } },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: 'QUIZ',
      resourceId: quiz.id,
      metadata: { title, topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return created(res, quiz)
  } catch (err) {
    logger.error('Create quiz error', err as Error)
    return serverError(res, 'Failed to create quiz')
  }
})

/**
 * GET /admin/content/quizzes/:id
 * Get quiz with all questions and options
 */
router.get('/content/quizzes/:id', async (req: Request, res: Response) => {
  try {
    const quizId = getParam(req.params.id)

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    })

    if (!quiz) {
      return notFound(res, 'Quiz not found')
    }

    return ok(res, quiz)
  } catch (err) {
    logger.error('Get quiz error', err as Error)
    return serverError(res, 'Failed to get quiz')
  }
})

/**
 * PUT /admin/content/quizzes/:id
 * Update quiz settings
 */
router.put('/content/quizzes/:id', async (req: Request, res: Response) => {
  try {
    const quizId = getParam(req.params.id)
    const { title, titleJson, durationSec, status } = req.body

    const existing = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!existing) {
      return notFound(res, 'Quiz not found')
    }

    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(title && { title }),
        ...(titleJson && { titleJson }),
        ...(durationSec && { durationSec }),
        ...(status && { status }),
      },
      include: { questions: { include: { options: true } } },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: 'QUIZ',
      resourceId: quizId,
      metadata: { title: quiz.title },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, quiz)
  } catch (err) {
    logger.error('Update quiz error', err as Error)
    return serverError(res, 'Failed to update quiz')
  }
})

/**
 * DELETE /admin/content/quizzes/:id
 * Delete quiz and all related questions/answers
 */
router.delete('/content/quizzes/:id', async (req: Request, res: Response) => {
  try {
    const quizId = getParam(req.params.id)

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    })

    if (!quiz) {
      return notFound(res, 'Quiz not found')
    }

    // Delete in transaction
    await prisma.$transaction([
      prisma.answer.deleteMany({
        where: { question: { quizId } },
      }),
      prisma.option.deleteMany({
        where: { question: { quizId } },
      }),
      prisma.question.deleteMany({
        where: { quizId },
      }),
      prisma.quiz.delete({
        where: { id: quizId },
      }),
    ])

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: 'QUIZ',
      resourceId: quizId,
      metadata: { title: quiz.title },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, { deleted: true })
  } catch (err) {
    logger.error('Delete quiz error', err as Error)
    return serverError(res, 'Failed to delete quiz')
  }
})

/**
 * POST /admin/content/quizzes/:id/questions
 * Add a question to a quiz
 */
router.post('/content/quizzes/:id/questions', async (req: Request, res: Response) => {
  try {
    const quizId = getParam(req.params.id)
    const { text, textJson, explanation, explanationJson, difficulty = 'MEDIUM', tags = [], options } = req.body

    if (!text) {
      return badRequest(res, 'Question text is required')
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return badRequest(res, 'At least 2 options are required')
    }

    const hasCorrectOption = options.some(opt => opt.correct === true)
    if (!hasCorrectOption) {
      return badRequest(res, 'At least one option must be marked as correct')
    }

    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) {
      return notFound(res, 'Quiz not found')
    }

    const question = await prisma.question.create({
      data: {
        text,
        textJson: textJson || {},
        explanation: explanation || '',
        explanationJson: explanationJson || {},
        difficulty,
        tags,
        quizId,
        options: {
          create: options.map(opt => ({
            text: opt.text,
            textJson: opt.textJson || {},
            correct: opt.correct || false,
          })),
        },
      },
      include: { options: true },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: 'QUESTION',
      resourceId: question.id,
      metadata: { quizId, text },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return created(res, question)
  } catch (err) {
    logger.error('Create question error', err as Error)
    return serverError(res, 'Failed to create question')
  }
})

/**
 * PUT /admin/content/questions/:id
 * Update a question
 */
router.put('/content/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = getParam(req.params.id)
    const { text, textJson, explanation, explanationJson, difficulty, tags } = req.body

    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    })

    if (!existing) {
      return notFound(res, 'Question not found')
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(text && { text }),
        ...(textJson && { textJson }),
        ...(explanation !== undefined && { explanation }),
        ...(explanationJson && { explanationJson }),
        ...(difficulty && { difficulty }),
        ...(tags && { tags }),
      },
      include: { options: true },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: 'QUESTION',
      resourceId: questionId,
      metadata: { text: question.text },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, question)
  } catch (err) {
    logger.error('Update question error', err as Error)
    return serverError(res, 'Failed to update question')
  }
})

/**
 * DELETE /admin/content/questions/:id
 * Delete a question
 */
router.delete('/content/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = getParam(req.params.id)

    const question = await prisma.question.findUnique({
      where: { id: questionId },
    })

    if (!question) {
      return notFound(res, 'Question not found')
    }

    // Delete in transaction
    await prisma.$transaction([
      prisma.answer.deleteMany({
        where: { questionId },
      }),
      prisma.option.deleteMany({
        where: { questionId },
      }),
      prisma.question.delete({
        where: { id: questionId },
      }),
    ])

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: 'QUESTION',
      resourceId: questionId,
      metadata: { text: question.text },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, { deleted: true })
  } catch (err) {
    logger.error('Delete question error', err as Error)
    return serverError(res, 'Failed to delete question')
  }
})

/**
 * PUT /admin/content/options/:id
 * Update an option (mark as correct/incorrect)
 */
router.put('/content/options/:id', async (req: Request, res: Response) => {
  try {
    const optionId = getParam(req.params.id)
    const { text, textJson, correct } = req.body

    const existing = await prisma.option.findUnique({
      where: { id: optionId },
    })

    if (!existing) {
      return notFound(res, 'Option not found')
    }

    const option = await prisma.option.update({
      where: { id: optionId },
      data: {
        ...(text && { text }),
        ...(textJson && { textJson }),
        ...(correct !== undefined && { correct }),
      },
    })

    return ok(res, option)
  } catch (err) {
    logger.error('Update option error', err as Error)
    return serverError(res, 'Failed to update option')
  }
})

/**
 * DELETE /admin/content/options/:id
 * Delete an option
 */
router.delete('/content/options/:id', async (req: Request, res: Response) => {
  try {
    const optionId = getParam(req.params.id)

    const existing = await prisma.option.findUnique({
      where: { id: optionId },
    })

    if (!existing) {
      return notFound(res, 'Option not found')
    }

    // Delete associated answers first
    await prisma.answer.deleteMany({
      where: { optionId },
    })

    await prisma.option.delete({
      where: { id: optionId },
    })

    return ok(res, { deleted: true })
  } catch (err) {
    logger.error('Delete option error', err as Error)
    return serverError(res, 'Failed to delete option')
  }
})

// ============================================
// CONTENT EXPORT/IMPORT
// ============================================

/**
 * GET /admin/content/export
 * Експортує всю ієрархію контенту (теми, матеріали, квізи) у JSON
 * Рекурсивна глибина: 5 рівнів вкладеності
 * Доступ: ADMIN
 */
router.get('/content/export', requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  logger.info('Content export started')

  // Рекурсивна функція для генерації include на потрібну глибину
  const getTopicInclude = (depth: number): any => {
    if (depth === 0) {
      return {
        materials: {
          select: {
            id: true,
            title: true,
            titleJson: true,
            titleCache: true,
            type: true,
            url: true,
            urlCache: true,
            content: true,
            contentJson: true,
            contentCache: true,
            lang: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            titleJson: true,
            titleCache: true,
            durationSec: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
            questions: {
              select: {
                id: true,
                text: true,
                textJson: true,
                explanation: true,
                explanationJson: true,
                tags: true,
                difficulty: true,
                options: {
                  select: {
                    id: true,
                    text: true,
                    textJson: true,
                    correct: true,
                  },
                },
              },
            },
          },
        },
      }
    }

    return {
      materials: {
        select: {
          id: true,
          title: true,
          titleJson: true,
          titleCache: true,
          type: true,
          url: true,
          urlCache: true,
          content: true,
          contentJson: true,
          contentCache: true,
          lang: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      quizzes: {
        select: {
          id: true,
          title: true,
          titleJson: true,
          titleCache: true,
          durationSec: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          questions: {
            select: {
              id: true,
              text: true,
              textJson: true,
              explanation: true,
              explanationJson: true,
              tags: true,
              difficulty: true,
              options: {
                select: {
                  id: true,
                  text: true,
                  textJson: true,
                  correct: true,
                },
              },
            },
          },
        },
      },
      children: { include: getTopicInclude(depth - 1) },
    }
  }

  // Витягуємо всі кореневі теми з вкладеністю до 5 рівнів
  const data = await prisma.topic.findMany({
    where: { parentId: null },
    include: getTopicInclude(5), // 5 рівнів глибини
  })

  logger.info(`Exported ${data.length} root topics`)

  // Повертаємо як файл для завантаження
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=content.json')
  res.send(JSON.stringify(data, null, 2))
}))

export default router
