// src/routes/files.ts
import { Router, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateResource } from '../middleware/validateResource.js'
import {
  generateFileKey,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getPublicUrl,
  deleteFile,
  validateFile,
  type FileCategory,
} from '../services/storage.service'
import { ok, badRequest, notFound, forbidden } from '../utils/response'
import { auditLog, AuditActions, AuditResources } from '../services/audit.service'
import { logger } from '../utils/logger.js'

const router = Router()

// Helper: Move this to src/utils/request.ts in future
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user) return forbidden(res, 'Not authenticated')
    if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient permissions')
    next()
  }
}

// Schemas
const fileIdSchema = z.object({ id: z.string().cuid() })
const uploadPresignSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().regex(/^[-\w.]+\/[-\w.]+$/),
  size: z.number().positive().max(15 * 1024 * 1024), 
  category: z.enum(['avatars', 'materials', 'attachments']).optional()
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many file uploads, please try again after an hour'
})

// --- ROUTES ---

router.post('/presign-upload', 
  requireAuth, 
  uploadLimiter, 
  validateResource(uploadPresignSchema, 'body'), 
  asyncHandler(async (req: Request, res: Response) => {
    const { filename, mimeType, size, category = 'attachments' } = req.body

    const validCategories: FileCategory[] = ['avatars', 'materials', 'attachments']
    if (!validCategories.includes(category)) return badRequest(res, 'Invalid category')

    if (category === 'materials' && !['EDITOR', 'ADMIN'].includes(req.user!.role)) {
      return forbidden(res, 'Only editors can upload materials')
    }

    const validation = validateFile(category, mimeType, size)
    if (!validation.valid) return badRequest(res, validation.error!)

    const key = generateFileKey(category, filename)
    const { url } = await getPresignedUploadUrl(key, mimeType)

    const file = await prisma.file.create({
      data: {
        key,
        originalName: filename,
        mimeType,
        size,
        visibility: category === 'avatars' ? 'PUBLIC' : 'PRIVATE',
        uploadedById: req.user!.id,
        confirmed: false,
      },
    })

    return ok(res, { fileId: file.id, uploadUrl: url, key })
  })
)

router.post('/confirm', 
  requireAuth, 
  validateResource(z.object({ fileId: z.string().cuid() }), 'body'), // Added validation
  asyncHandler(async (req: Request, res: Response) => {
    const { fileId } = req.body

    const file = await prisma.file.findUnique({ where: { id: fileId } })
    if (!file) return notFound(res, 'File not found')

    if (file.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      return forbidden(res, 'Not authorized')
    }

    if (file.confirmed) return badRequest(res, 'File already confirmed')

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { confirmed: true },
    })

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.CREATE,
      resource: AuditResources.FILE, // Use enum
      resourceId: fileId,
      metadata: { filename: file.originalName, mimeType: file.mimeType },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    const url = file.visibility === 'PUBLIC' 
      ? getPublicUrl(file.key)
      : await getPresignedDownloadUrl(file.key)

    return ok(res, {
      id: updated.id,
      url,
      originalName: updated.originalName,
      mimeType: updated.mimeType,
      size: updated.size,
    })
  })
)

router.get('/:id', 
  requireAuth, 
  validateResource(fileIdSchema, 'params'), // Added validation
  asyncHandler(async (req: Request, res: Response) => {
    const id = getParam(req.params.id)
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file || !file.confirmed) return notFound(res, 'File not found')

    if (file.visibility === 'PRIVATE') {
      if (file.uploadedById !== req.user!.id && !['EDITOR', 'ADMIN'].includes(req.user!.role)) {
        return forbidden(res, 'Not authorized')
      }
    }

    const url = file.visibility === 'PUBLIC' ? getPublicUrl(file.key) : await getPresignedDownloadUrl(file.key)

    return ok(res, {
      id: file.id,
      url,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      visibility: file.visibility,
      createdAt: file.createdAt,
    })
  })
)

router.delete('/:id', 
  requireAuth, 
  validateResource(fileIdSchema, 'params'), // Added validation
  asyncHandler(async (req: Request, res: Response) => {
    const id = getParam(req.params.id)
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file) return notFound(res, 'File not found')

    if (file.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      return forbidden(res, 'Not authorized')
    }

    await prisma.file.delete({ where: { id } })

    try {
      await deleteFile(file.key)
    } catch (err) {
      logger.error(`Failed to delete file from S3: ${file.key}`, err)
    }

    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE,
      resource: AuditResources.FILE,
      resourceId: id,
      metadata: { filename: file.originalName },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return ok(res, { deleted: true })
  })
)

// Admin List Route
router.get('/', 
  requireAuth, 
  requireRole(['ADMIN']), 
  asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20', category, mimeType } = req.query
    const where: Prisma.FileWhereInput = { confirmed: true }
    
    if (category) where.key = { startsWith: category as string }
    if (mimeType) where.mimeType = { startsWith: mimeType as string }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      }),
      prisma.file.count({ where }),
    ])

    return ok(res, {
      files,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    })
  })
)

export default router