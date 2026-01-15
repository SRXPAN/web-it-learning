// src/routes/editor.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { requireEditor } from '../middleware/requireEditor.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validateResource } from '../middleware/validateResource.js'
import { materialSchemas } from '../schemas/material.schema.js'
import { z } from 'zod'
import { ok } from '../utils/response.js'
import type { Category, Lang, Status, Difficulty } from '@elearn/shared'
import type { Prisma } from '@prisma/client'
import { logger } from '../utils/logger.js'
import { auditLog, AuditActions, AuditResources } from '../services/audit.service.js'
import { updateMaterialWithLocalization } from '../services/materials.service.js'

const router = Router()

// Helper to safely extract string from params (handles string | string[])
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// ==================== TOPICS ====================

/**
 * @openapi
 * /api/editor/topics:
 *   get:
 *     tags:
 *       - Editor
 *     summary: Get all root topics for editing
 *     description: Returns all root-level topics (parentId = null) for content management
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of root topics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   slug:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *       401:
 *         description: Unauthorized - requires EDITOR or ADMIN role
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
  '/topics',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  asyncHandler(async (_req: Request, res: Response) => {
    const topics = await prisma.topic.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
      },
    })
    return ok(res, topics)
  })
)

// ==================== MATERIALS ====================

/**
 * @openapi
 * /api/editor/topics/{topicId}/materials:
 *   get:
 *     tags:
 *       - Editor
 *     summary: Get all materials for a topic
 *     description: Returns all learning materials associated with a specific topic
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The topic ID
 *     responses:
 *       200:
 *         description: List of materials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Material'
 *       400:
 *         description: Invalid topic ID format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires EDITOR or ADMIN role
 */
router.get(
  '/topics/:topicId/materials',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const mats = await prisma.material.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'desc' },
    })
    return ok(res, mats)
  })
)

router.post(
  '/topics/:topicId/materials',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid() }), 'params'),
  validateResource(
    z.object({
      title: z.string().min(2),
      type: z.enum(['pdf', 'video', 'link', 'text']),
      url: z.string().url().optional(),
      content: z.string().optional(),
      lang: z.enum(['UA', 'PL', 'EN']).default('EN'),
      publish: z.boolean().optional(),
    }),
    'body'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const data: Prisma.MaterialCreateInput = {
      title: req.body.title,
      type: req.body.type,
      url: req.body.url,
      content: req.body.content,
      lang: req.body.lang,
      topic: { connect: { id: topicId } },
      status: req.body.publish ? 'Published' : 'Draft',
      publishedAt: req.body.publish ? new Date() : null,
    }

    const mat = await prisma.material.create({ data })
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: AuditResources.MATERIAL,
      resourceId: mat.id,
      metadata: { topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, mat)
  })
)

// Manual localization update: accepts flattened EN/UA/PL fields
/**
 * @openapi
 * /api/editor/materials/{id}:
 *   put:
 *     tags:
 *       - Editor
 *     summary: Update material with multi-language content
 *     description: Update a learning material with localized content for EN, UA, and PL languages. All language fields are stored in JSON cache.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The material ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - titleEN
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [VIDEO, TEXT, PDF, LINK]
 *               titleEN:
 *                 type: string
 *                 description: English title (required, used as fallback)
 *               titleUA:
 *                 type: string
 *                 description: Ukrainian title (optional)
 *               titlePL:
 *                 type: string
 *                 description: Polish title (optional)
 *               linkEN:
 *                 type: string
 *                 format: uri
 *                 description: English URL (for VIDEO/LINK types)
 *               linkUA:
 *                 type: string
 *                 format: uri
 *                 description: Ukrainian URL
 *               linkPL:
 *                 type: string
 *                 format: uri
 *                 description: Polish URL
 *               contentEN:
 *                 type: string
 *                 description: English content (for TEXT type)
 *               contentUA:
 *                 type: string
 *                 description: Ukrainian content
 *               contentPL:
 *                 type: string
 *                 description: Polish content
 *           example:
 *             type: VIDEO
 *             titleEN: Introduction to TypeScript
 *             titleUA: Вступ до TypeScript
 *             titlePL: Wprowadzenie do TypeScript
 *             linkEN: https://youtube.com/watch?v=example_en
 *             linkUA: https://youtube.com/watch?v=example_ua
 *             linkPL: https://youtube.com/watch?v=example_pl
 *     responses:
 *       200:
 *         description: Material updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Material'
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires EDITOR or ADMIN role
 *       404:
 *         description: Material not found
 */
router.put(
  '/materials/:id',
  requireEditor,
  validateResource(materialSchemas.idParam, 'params'),
  validateResource(materialSchemas.updateTranslations, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = getParam(req.params.id)
    const updated = await updateMaterialWithLocalization(id, req.body)
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.MATERIAL,
      resourceId: id,
      metadata: { localizationUpdated: true },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, { success: true, material: updated })
  })
)

router.delete(
  '/topics/:topicId/materials/:id',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid(), id: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const id = getParam(req.params.id)
    await prisma.material.delete({ where: { id } })
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: AuditResources.MATERIAL,
      resourceId: id,
      metadata: { topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, { ok: true })
  })
)

// ==================== QUIZZES ====================

router.get(
  '/topics/:topicId/quizzes',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const quizzes = await prisma.quiz.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, durationSec: true, status: true, updatedAt: true },
    })
    return ok(res, quizzes)
  })
)

router.post(
  '/topics/:topicId/quizzes',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid() }), 'params'),
  validateResource(
    z.object({
      title: z.string().min(2),
      durationSec: z.number().int().min(10).max(3600),
      publish: z.boolean().optional(),
    }),
    'body'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const data: Prisma.QuizCreateInput = {
      title: req.body.title,
      durationSec: req.body.durationSec,
      topic: { connect: { id: topicId } },
      createdBy: req.user?.id ? { connect: { id: req.user.id } } : undefined,
      status: req.body.publish ? 'Published' : 'Draft',
      publishedAt: req.body.publish ? new Date() : null,
    }

    const quiz = await prisma.quiz.create({ data })
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: AuditResources.QUIZ,
      resourceId: quiz.id,
      metadata: { topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, quiz)
  })
)

router.put(
  '/topics/:topicId/quizzes/:id',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid(), id: z.string().uuid() }), 'params'),
  validateResource(
    z.object({
      title: z.string().min(2).optional(),
      durationSec: z.number().int().min(10).max(3600).optional(),
      publish: z.boolean().optional(),
      status: z.enum(['Draft', 'Published']).optional(),
    }),
    'body'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const id = getParam(req.params.id)
    const data: Prisma.QuizUpdateInput = { ...req.body }
    if (typeof req.body.publish === 'boolean') {
      data.status = req.body.publish ? 'Published' : 'Draft'
      data.publishedAt = req.body.publish ? new Date() : null
      delete (data as Record<string, unknown>).publish
    }

    const quiz = await prisma.quiz.update({ where: { id }, data })
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.QUIZ,
      resourceId: id,
      metadata: { topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, quiz)
  })
)

router.delete(
  '/topics/:topicId/quizzes/:id',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ topicId: z.string().uuid(), id: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const topicId = getParam(req.params.topicId)
    const id = getParam(req.params.id)
    await prisma.quiz.delete({ where: { id } })
    await auditLog({
      userId: req.user?.id,
      action: AuditActions.DELETE,
      resource: AuditResources.QUIZ,
      resourceId: id,
      metadata: { topicId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, { ok: true })
  })
)

// ==================== QUESTIONS ====================

// Get questions for a quiz
router.get(
  '/quizzes/:quizId/questions',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ quizId: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const quizId = getParam(req.params.quizId)
    const questions = await prisma.question.findMany({
      where: { quizId },
      orderBy: { id: 'asc' },
      include: {
        options: {
          orderBy: { id: 'asc' },
          select: { id: true, text: true, textJson: true, correct: true },
        },
      },
    })
    return ok(res, questions)
  })
)

// Create question
router.post(
  '/quizzes/:quizId/questions',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ quizId: z.string().uuid() }), 'params'),
  validateResource(
    z.object({
      text: z.string().min(5),
      textJson: z.object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() }).optional(),
      explanation: z.string().optional(),
      explanationJson: z.object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() }).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Easy'),
      tags: z.array(z.string()).default([]),
      options: z
        .array(
          z.object({
            text: z.string().min(1),
            textJson: z
              .object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() })
              .optional(),
            correct: z.boolean().default(false),
          })
        )
        .min(2)
        .max(6),
    }),
    'body'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const quizId = getParam(req.params.quizId)
    const hasCorrect = (req.body.options as Array<{ correct: boolean }>).some((o) => o.correct)
    if (!hasCorrect) throw AppError.badRequest('At least one option must be correct')

    const question = await prisma.question.create({
      data: {
        text: req.body.text,
        textJson: req.body.textJson || {},
        explanation: req.body.explanation,
        explanationJson: req.body.explanationJson || {},
        difficulty: req.body.difficulty,
        tags: req.body.tags,
        quiz: { connect: { id: quizId } },
        options: {
          create: req.body.options.map((o: any) => ({
            text: o.text,
            textJson: o.textJson || {},
            correct: o.correct,
          })),
        },
      },
      include: { options: true },
    })

    await auditLog({
      userId: req.user?.id,
      action: AuditActions.CREATE,
      resource: AuditResources.QUESTION,
      resourceId: question.id,
      metadata: { quizId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, question)
  })
)

// Update question
router.put(
  '/quizzes/:quizId/questions/:id',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ quizId: z.string().uuid(), id: z.string().uuid() }), 'params'),
  validateResource(
    z.object({
      text: z.string().min(5).optional(),
      textJson: z.object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() }).optional(),
      explanation: z.string().optional(),
      explanationJson: z.object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() }).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      tags: z.array(z.string()).optional(),
      options: z
        .array(
          z.object({
            id: z.string().optional(),
            text: z.string().min(1),
            textJson: z.object({ UA: z.string().optional(), PL: z.string().optional(), EN: z.string().optional() }).optional(),
            correct: z.boolean().default(false),
          })
        )
        .min(2)
        .max(6)
        .optional(),
    }),
    'body'
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const quizId = getParam(req.params.quizId)
    const id = getParam(req.params.id)

    // Update question fields
    const questionData: Prisma.QuestionUpdateInput = {}
    if (req.body.text) questionData.text = req.body.text
    if (req.body.textJson) questionData.textJson = req.body.textJson
    if (req.body.explanation !== undefined) questionData.explanation = req.body.explanation
    if (req.body.explanationJson) questionData.explanationJson = req.body.explanationJson
    if (req.body.difficulty) questionData.difficulty = req.body.difficulty
    if (req.body.tags) questionData.tags = req.body.tags

    // Update options if provided
    if (req.body.options) {
      const hasCorrect = (req.body.options as Array<{ correct: boolean }>).some((o) => o.correct)
      if (!hasCorrect) throw AppError.badRequest('At least one option must be correct')

      await prisma.option.deleteMany({ where: { questionId: id } })
      await prisma.option.createMany({
        data: req.body.options.map((o: any) => ({
          text: o.text,
          textJson: o.textJson || {},
          correct: o.correct,
          questionId: id,
        })),
      })
    }

    const question = await prisma.question.update({
      where: { id },
      data: questionData,
      include: { options: true },
    })

    await auditLog({
      userId: req.user?.id,
      action: AuditActions.UPDATE,
      resource: AuditResources.QUESTION,
      resourceId: id,
      metadata: { quizId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, question)
  })
)

// Delete question
router.delete(
  '/quizzes/:quizId/questions/:id',
  requireAuth,
  requireRole(['EDITOR', 'ADMIN']),
  validateResource(z.object({ quizId: z.string().uuid(), id: z.string().uuid() }), 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const quizId = getParam(req.params.quizId)
    const id = getParam(req.params.id)
    await prisma.question.delete({ where: { id } })
    await auditLog({
      userId: req.user?.id,
      action: AuditActions.DELETE,
      resource: AuditResources.QUESTION,
      resourceId: id,
      metadata: { quizId },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    return ok(res, { ok: true })
  })
)

export default router
