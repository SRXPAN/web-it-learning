/**
 * Audit Log Service
 * Tracks all important actions in the system
 */
import { prisma } from '../db.js'
import { logger } from '../utils/logger.js'

// Sensitive fields to redact from audit logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'apiKey',
  'secret',
  'privateKey',
  'creditCard',
  'ssn',
  'otp',
  'totpSecret',
]

/**
 * Recursively sanitizes sensitive fields from an object or array
 */
function sanitizeMetadata(obj: any): any {
  if (!obj) return obj
  if (typeof obj !== 'object') return obj

  // Handle Arrays explicitly to preserve structure
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMetadata(item))
  }

  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field))

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else {
      // Recurse for nested objects/arrays
      sanitized[key] = sanitizeMetadata(value)
    }
  }

  return sanitized
}

export interface AuditLogEntry {
  userId?: string
  action: string // CREATE, UPDATE, DELETE, LOGIN, ...
  resource: string // user, topic, material, ...
  resourceId?: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Sanitize metadata before saving
    const sanitizedMetadata = entry.metadata ? sanitizeMetadata(entry.metadata) : {}

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: sanitizedMetadata,
        // Standardize IP (remove IPv4-mapped IPv6 prefix)
        ip: entry.ip?.replace('::ffff:', ''),
        // Database limits often truncate long UserAgents
        userAgent: entry.userAgent?.slice(0, 500),
      },
    })
  } catch (error) {
    // Fail silently: Audit logging failure should not block the main application flow
    logger.error('Audit log failed:', error instanceof Error ? error.message : String(error))
  }
}

// Helper for common actions
export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW',
  PUBLISH: 'PUBLISH',
  UNPUBLISH: 'UNPUBLISH',
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
} as const

export const AuditResources = {
  USER: 'user',
  TOPIC: 'topic',
  MATERIAL: 'material',
  QUIZ: 'quiz',
  QUESTION: 'question',
  OPTION: 'option',
  FILE: 'file',
  TRANSLATION: 'translation',
  SETTINGS: 'settings',
} as const