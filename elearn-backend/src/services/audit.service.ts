/**
 * Audit Log Service
 * Tracks all important actions in the system
 */
import { prisma } from '../db.js'

// Sensitive fields to redact from audit logs
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'apiKey',
  'secret',
  'privateKey',
  'creditCard',
  'ssn',
  'otp',
  'totpSecret',
]

/**
 * Санітизує sensitive поля з об'єкта
 */
function sanitizeMetadata(obj: any): Record<string, any> {
  if (!obj || typeof obj !== 'object') return {}
  
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    // Перевіримо, чи ключ sensitive
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field))
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      // Рекурсивна обробка вкладених об'єктів
      sanitized[key] = sanitizeMetadata(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

export interface AuditLogEntry {
  userId?: string
  action: string // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW
  resource: string // user, topic, material, quiz, file
  resourceId?: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Санітизуємо metadata перед збереженням
    const sanitizedMetadata = entry.metadata ? sanitizeMetadata(entry.metadata) : {}
    
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: sanitizedMetadata,
        ip: entry.ip?.replace('::ffff:', ''), // Remove IPv4-mapped prefix
        userAgent: entry.userAgent?.slice(0, 500), // Limit length
      },
    })
  } catch (error) {
    // Don't throw - audit logging shouldn't break main functionality
    console.error('Audit log error:', error)
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
  FILE: 'file',
  TRANSLATION: 'translation',
  SETTINGS: 'settings',
} as const
