/**
 * Admin API Routes
 * User management, system settings, audit logs
 * Requires ADMIN role
 */
import { Router, Request, Response } from 'express'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { ok, created, badRequest, notFound, forbidden, serverError, conflict } from '../utils/response'
import { auditLog, AuditActions, AuditResources } from '../services/audit.service'
import { z } from 'zod'
import { emailSchema, nameSchema, passwordSchemaSimple } from '../utils/validation'

const prisma = new PrismaClient()
const router = Router()

// All admin routes require auth
router.use(requireAuth)

// Role helpers
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
  console.log('Admin stats endpoint called')
  console.log('User:', req.user)
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

    console.log('Stats result:', JSON.stringify(result, null, 2))
    return ok(res, result)
  } catch (err) {
    console.error('Get stats error:', err)
    return serverError(res, 'Failed to get stats')
  }
})

// Route-specific role guards
router.use('/users', requireAdmin)
router.use('/audit-logs', requireAdmin)
router.use('/content', requireAdminOrEditor)
router.use('/i18n', requireAdminOrEditor)

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

    const where: any = {}
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
    console.error('List users error:', err)
    return serverError(res, 'Failed to list users')
  }
})

/**
 * GET /admin/users/:id
 * Get single user details
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

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
    console.error('Get user error:', err)
    return serverError(res, 'Failed to get user')
  }
})

/**
 * PUT /admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
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
    console.error('Update role error:', err)
    return serverError(res, 'Failed to update role')
  }
})

/**
 * PUT /admin/users/:id/verify
 * Manually mark user email as verified (admin action)
 */
router.put('/users/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

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
    console.error('Verify user error:', err)
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
    console.error('Create user error:', err)
    return serverError(res, 'Failed to create user')
  }
})

/**
 * DELETE /admin/users/:id
 * Delete user (soft delete - just removes access)
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Prevent self-deletion
    if (id === req.user!.id) {
      return badRequest(res, 'Cannot delete yourself')
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return notFound(res, 'User not found')
    }

    // Delete related data
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
      prisma.answer.deleteMany({ where: { userId: id } }),
      prisma.materialView.deleteMany({ where: { userId: id } }),
      prisma.userActivity.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ])

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
    console.error('Delete user error:', err)
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
    console.error('List audit logs error:', err)
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
    console.error('Get topics error:', err)
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
    console.error('Create topic error:', err)
    return serverError(res, 'Failed to create topic')
  }
})

/**
 * PUT /admin/content/topics/:id
 * Update topic
 */
router.put('/content/topics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
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
    console.error('Update topic error:', err)
    return serverError(res, 'Failed to update topic')
  }
})

/**
 * DELETE /admin/content/topics/:id
 * Delete topic and all related content
 */
router.delete('/content/topics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

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
    console.error('Delete topic error:', err)
    return serverError(res, 'Failed to delete topic')
  }
})

// ============================================
// I18N MANAGEMENT (ADMIN/EDITOR)
// ============================================

/**
 * GET /admin/i18n/keys
 * List all i18n keys with optional namespace filter
 */
router.get('/i18n/keys', async (req: Request, res: Response) => {
  try {
    const { ns, search, page = '1', limit = '50' } = req.query
    
    const where: any = {}
    
    if (ns) {
      const namespaces = (ns as string).split(',').map(s => s.trim()).filter(Boolean)
      if (namespaces.length) {
        where.namespace = { in: namespaces }
      }
    }
    
    if (search) {
      where.OR = [
        { key: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    
    const [keys, total] = await Promise.all([
      prisma.i18nKey.findMany({
        where,
        include: {
          values: {
            select: { lang: true, value: true },
          },
        },
        orderBy: { key: 'asc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.i18nKey.count({ where }),
    ])
    
    // Transform to flat format for easier UI consumption
    const data = keys.map(k => ({
      id: k.id,
      key: k.key,
      namespace: k.namespace,
      description: k.description,
      translations: k.values.reduce((acc, v) => {
        acc[v.lang] = v.value
        return acc
      }, {} as Record<string, string>),
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }))
    
    return ok(res, {
      data,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  } catch (err) {
    console.error('Get i18n keys error:', err)
    return serverError(res, 'Failed to get i18n keys')
  }
})

/**
 * POST /admin/i18n/keys
 * Create a new i18n key with translations
 */
router.post('/i18n/keys', async (req: Request, res: Response) => {
  try {
    const { key, namespace = 'common', description, translations } = req.body
    
    if (!key || typeof key !== 'string') {
      return badRequest(res, 'Key is required')
    }
    
    if (!translations || typeof translations !== 'object') {
      return badRequest(res, 'Translations object is required (e.g. {UA: "...", EN: "...", PL: "..."})')
    }
    
    // Check if key already exists
    const existing = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace, key } },
    })
    
    if (existing) {
      return conflict(res, `Key "${key}" already exists in namespace "${namespace}"`)
    }
    
    // Create key with values
    const i18nKey = await prisma.i18nKey.create({
      data: {
        key,
        namespace,
        description,
        values: {
          create: Object.entries(translations)
            .filter(([lang]) => ['UA', 'PL', 'EN'].includes(lang))
            .map(([lang, value]) => ({
              lang: lang as 'UA' | 'PL' | 'EN',
              value: value as string,
            })),
        },
      },
      include: {
        values: { select: { lang: true, value: true } },
      },
    })
    
    // Update TranslationVersion for cache invalidation
    await prisma.translationVersion.upsert({
      where: { namespace },
      create: { namespace, version: 1 },
      update: { version: { increment: 1 }, updatedAt: new Date() },
    })
    
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: 'i18n_key',
      resourceId: i18nKey.id,
      metadata: { key, namespace },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    
    return created(res, {
      id: i18nKey.id,
      key: i18nKey.key,
      namespace: i18nKey.namespace,
      description: i18nKey.description,
      translations: i18nKey.values.reduce((acc, v) => {
        acc[v.lang] = v.value
        return acc
      }, {} as Record<string, string>),
    })
  } catch (err) {
    console.error('Create i18n key error:', err)
    return serverError(res, 'Failed to create i18n key')
  }
})

/**
 * PUT /admin/i18n/keys/:id
 * Update i18n key translations
 */
router.put('/i18n/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { description, translations } = req.body
    
    // Find existing key
    const existing = await prisma.i18nKey.findUnique({
      where: { id },
      include: { values: true },
    })
    
    if (!existing) {
      return notFound(res, 'Key not found')
    }
    
    // Update description if provided
    if (description !== undefined) {
      await prisma.i18nKey.update({
        where: { id },
        data: { description, updatedAt: new Date() },
      })
    }
    
    // Update translations if provided
    if (translations && typeof translations === 'object') {
      for (const [lang, value] of Object.entries(translations)) {
        if (!['UA', 'PL', 'EN'].includes(lang)) continue
        
        await prisma.i18nValue.upsert({
          where: { keyId_lang: { keyId: id, lang: lang as 'UA' | 'PL' | 'EN' } },
          create: {
            keyId: id,
            lang: lang as 'UA' | 'PL' | 'EN',
            value: value as string,
          },
          update: {
            value: value as string,
            updatedAt: new Date(),
          },
        })
      }
    }
    
    // Update TranslationVersion for cache invalidation
    await prisma.translationVersion.upsert({
      where: { namespace: existing.namespace },
      create: { namespace: existing.namespace, version: 1 },
      update: { version: { increment: 1 }, updatedAt: new Date() },
    })
    
    // Get updated key
    const updated = await prisma.i18nKey.findUnique({
      where: { id },
      include: { values: { select: { lang: true, value: true } } },
    })
    
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: 'i18n_key',
      resourceId: id,
      metadata: { key: existing.key, namespace: existing.namespace },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    
    return ok(res, {
      id: updated!.id,
      key: updated!.key,
      namespace: updated!.namespace,
      description: updated!.description,
      translations: updated!.values.reduce((acc, v) => {
        acc[v.lang] = v.value
        return acc
      }, {} as Record<string, string>),
    })
  } catch (err) {
    console.error('Update i18n key error:', err)
    return serverError(res, 'Failed to update i18n key')
  }
})

/**
 * DELETE /admin/i18n/keys/:id
 * Delete an i18n key and all its translations
 */
router.delete('/i18n/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const existing = await prisma.i18nKey.findUnique({
      where: { id },
    })
    
    if (!existing) {
      return notFound(res, 'Key not found')
    }
    
    // Delete key (cascade deletes values)
    await prisma.i18nKey.delete({ where: { id } })
    
    // Update TranslationVersion
    await prisma.translationVersion.upsert({
      where: { namespace: existing.namespace },
      create: { namespace: existing.namespace, version: 1 },
      update: { version: { increment: 1 }, updatedAt: new Date() },
    })
    
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: 'i18n_key',
      resourceId: id,
      metadata: { key: existing.key, namespace: existing.namespace },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    
    return ok(res, { deleted: true })
  } catch (err) {
    console.error('Delete i18n key error:', err)
    return serverError(res, 'Failed to delete i18n key')
  }
})

/**
 * GET /admin/i18n/namespaces
 * Get list of all namespaces with key counts
 */
router.get('/i18n/namespaces', async (_req: Request, res: Response) => {
  try {
    const namespaces = await prisma.i18nKey.groupBy({
      by: ['namespace'],
      _count: { id: true },
      orderBy: { namespace: 'asc' },
    })
    
    const versions = await prisma.translationVersion.findMany({
      select: { namespace: true, version: true, updatedAt: true },
    })
    
    const versionMap = versions.reduce((acc, v) => {
      acc[v.namespace] = { version: v.version, updatedAt: v.updatedAt }
      return acc
    }, {} as Record<string, { version: number; updatedAt: Date }>)
    
    const data = namespaces.map(ns => ({
      namespace: ns.namespace,
      keyCount: ns._count.id,
      version: versionMap[ns.namespace]?.version || 1,
      updatedAt: versionMap[ns.namespace]?.updatedAt || null,
    }))
    
    return ok(res, data)
  } catch (err) {
    console.error('Get i18n namespaces error:', err)
    return serverError(res, 'Failed to get namespaces')
  }
})

export default router
