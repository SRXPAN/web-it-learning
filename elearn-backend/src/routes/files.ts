/**
 * Files API Routes
 * Handles file uploads with S3/R2 presigned URLs
 */
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
import { ok, created, badRequest, notFound, forbidden, serverError } from '../utils/response'
import { auditLog } from '../services/audit.service'
import { logger } from '../utils/logger.js'
const router = Router()

// Helper to safely extract string from params (handles string | string[])
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// Role helper
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user) return forbidden(res, 'Not authenticated')
    if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient permissions')
    next()
  }
}

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 20, // Максимум 20 файлів на годину від одного IP
  message: 'Too many file uploads, please try again after an hour'
})

// Define Zod Schema for presign upload
const uploadPresignSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().regex(/^[-\w.]+\/[-\w.]+$/),
  size: z.number().positive().max(15 * 1024 * 1024), // 15MB limit - prevent server OOM
  category: z.enum(['avatars', 'materials', 'attachments']).optional()
})

/**
 * POST /files/presign-upload
 * Get presigned URL for direct upload to S3/R2
 */
router.post('/presign-upload', requireAuth, uploadLimiter, validateResource(uploadPresignSchema, 'body'), asyncHandler(async (req: Request, res: Response) => {
  const { filename, mimeType, size, category = 'attachments' } = req.body

  // Validate category
  const validCategories: FileCategory[] = ['avatars', 'materials', 'attachments']
  if (!validCategories.includes(category)) {
    return badRequest(res, 'Invalid category')
  }

  // Check permissions for category
  if (category === 'materials' && !['EDITOR', 'ADMIN'].includes(req.user!.role)) {
    return forbidden(res, 'Only editors can upload materials')
  }

  // Validate file type and size
  const validation = validateFile(category, mimeType, size)
  if (!validation.valid) {
    return badRequest(res, validation.error!)
  }

  // Generate unique key
  const key = generateFileKey(category, filename)

  // Get presigned URL
  const { url } = await getPresignedUploadUrl(key, mimeType)

  // Create pending file record
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

  return ok(res, {
    fileId: file.id,
    uploadUrl: url,
    key,
  })
}))

/**
 * POST /files/confirm
 * Confirm file upload after successful upload to S3
 */
router.post('/confirm', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { fileId } = req.body

  if (!fileId) {
    return badRequest(res, 'fileId is required')
  }

  // Find file
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  })

  if (!file) {
    return notFound(res, 'File not found')
  }

  // Check ownership
  if (file.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return forbidden(res, 'Not authorized')
  }

  if (file.confirmed) {
    return badRequest(res, 'File already confirmed')
  }

  // Confirm file
  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { confirmed: true },
  })

  // Audit log
  await auditLog({
    userId: req.user!.id,
    action: 'CREATE',
    resource: 'file',
    resourceId: fileId,
    metadata: { filename: file.originalName, mimeType: file.mimeType },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })

  // Return URL based on visibility
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
}))

/**
 * GET /files/:id
 * Get file info and download URL
 */
router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params.id)

  const file = await prisma.file.findUnique({
    where: { id },
  })

  if (!file || !file.confirmed) {
    return notFound(res, 'File not found')
  }

  // Check access for private files
  if (file.visibility === 'PRIVATE') {
    if (file.uploadedById !== req.user!.id && !['EDITOR', 'ADMIN'].includes(req.user!.role)) {
      return forbidden(res, 'Not authorized')
    }
  }

  // Generate appropriate URL
  let url: string
  if (file.visibility === 'PUBLIC') {
    url = getPublicUrl(file.key)
  } else {
    url = await getPresignedDownloadUrl(file.key)
  }

  return ok(res, {
    id: file.id,
    url,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    visibility: file.visibility,
    createdAt: file.createdAt,
  })
}))

/**
 * GET /files/:id/download
 * Get presigned download URL only (for direct downloads)
 */
router.get('/:id/download', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params.id)

  const file = await prisma.file.findUnique({
    where: { id },
  })

  if (!file || !file.confirmed) {
    return notFound(res, 'File not found')
  }

  // Check access for private files
  if (file.visibility === 'PRIVATE') {
    if (file.uploadedById !== req.user!.id && !['EDITOR', 'ADMIN'].includes(req.user!.role)) {
      return forbidden(res, 'Not authorized')
    }
  }

  // Generate download URL (always signed for security)
  const url = await getPresignedDownloadUrl(file.key, 300) // 5 min expiry

  return ok(res, { url, filename: file.originalName })
}))

/**
 * DELETE /files/:id
 * Delete file from storage and database
 */
router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = getParam(req.params.id)

  const file = await prisma.file.findUnique({
    where: { id },
  })

  if (!file) {
    return notFound(res, 'File not found')
  }

  // Check ownership or admin
  if (file.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    return forbidden(res, 'Not authorized')
  }

  // Transactional logic pattern:
  // 1. Delete from DB first
  await prisma.file.delete({
    where: { id },
  })

  // 2. Try to delete from S3 (if fails, we have a cron job for cleanup later)
  try {
    await deleteFile(file.key)
  } catch (err) {
    logger.error(`Failed to delete file from S3 after DB deletion: ${file.key}`, err)
  }

  // Audit log
  await auditLog({
    userId: req.user!.id,
    action: 'DELETE',
    resource: 'file',
    resourceId: id,
    metadata: { filename: file.originalName },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  })

  return ok(res, { deleted: true })
}))

/**
 * GET /files (Admin only)
 * List all files with pagination
 */
router.get('/', requireAuth, requireRole(['ADMIN']), asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', category, mimeType } = req.query

  const where: Prisma.FileWhereInput = { confirmed: true }
  
  if (category) {
    where.key = { startsWith: category as string }
  }
  if (mimeType) {
    where.mimeType = { startsWith: mimeType as string }
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
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
}))

export default router
