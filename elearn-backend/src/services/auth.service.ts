// src/services/auth.service.ts
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../db.js'
import { 
  createTokenPair, 
  refreshTokens, 
  revokeRefreshToken, 
  revokeAllUserTokens,
  generateRandomToken,
  type TokenPair 
} from './token.service.js'
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordChangedEmail 
} from './email.service.js'
import { AppError } from '../utils/AppError.js'
import { auditLog, AuditActions, AuditResources } from './audit.service.js'
import type { Role } from '@elearn/shared'

const BCRYPT_ROUNDS = 12
const VERIFICATION_TOKEN_EXPIRES_HOURS = 24
const PASSWORD_RESET_TOKEN_EXPIRES_HOURS = 1

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResult {
  user: {
    id: string
    name: string
    email: string
    role: Role
    xp: number
    emailVerified: boolean
  }
  tokens: TokenPair
}

/**
 * Реєстрація нового користувача
 */
export async function registerUser(
  data: RegisterData,
  userAgent?: string,
  ip?: string
): Promise<AuthResult> {
  const { name, email, password } = data
  
  // Перевірка на існуючого користувача
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    throw AppError.conflict('User with this email already exists', { field: 'email' })
  }
  
  // Хешуємо пароль
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  
  // Створюємо користувача
  const user = await prisma.user.create({
    data: { 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password: hash, 
      role: 'STUDENT',
      emailVerified: false,
    },
    select: { 
      id: true, 
      name: true, 
      email: true, 
      role: true, 
      xp: true,
      emailVerified: true,
    },
  })
  
  // Створюємо токен верифікації email
  await createEmailVerificationToken(email)
  
  // Створюємо токени
  const tokens = await createTokenPair(
    { id: user.id, name: user.name, email: user.email, role: user.role as Role },
    userAgent,
    ip
  )
  
  await auditLog({
    userId: user.id,
    action: AuditActions.CREATE,
    resource: AuditResources.USER,
    resourceId: user.id,
    metadata: { email },
    ip,
    userAgent,
  })
  
  return { user: { ...user, role: user.role as Role }, tokens }
}

/**
 * Вхід користувача
 */
export async function loginUser(
  data: LoginData,
  userAgent?: string,
  ip?: string
): Promise<AuthResult> {
  const { email, password } = data
  
  const user = await prisma.user.findUnique({ 
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      xp: true,
      password: true,
      emailVerified: true,
    },
  })
  
  if (!user) {
    throw new Error('Invalid credentials')
  }
  
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new Error('Invalid credentials')
  }
  
  // Створюємо токени
  const tokens = await createTokenPair(
    { id: user.id, name: user.name, email: user.email, role: user.role as Role },
    userAgent,
    ip
  )
  
  await auditLog({
    userId: user.id,
    action: AuditActions.LOGIN,
    resource: AuditResources.USER,
    resourceId: user.id,
    metadata: { email, ip },
    ip,
    userAgent,
  })
  
  return { 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role as Role, 
      xp: user.xp,
      emailVerified: user.emailVerified,
    }, 
    tokens 
  }
}

/**
 * Оновлення токенів
 */
export async function refreshUserTokens(
  refreshToken: string,
  userAgent?: string,
  ip?: string
): Promise<TokenPair | null> {
  return refreshTokens(refreshToken, userAgent, ip)
}

/**
 * Вихід (відкликання refresh токена)
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken)
}

/**
 * Вихід з усіх пристроїв
 */
export async function logoutAllDevices(userId: string): Promise<void> {
  await revokeAllUserTokens(userId)
  await auditLog({
    userId,
    action: AuditActions.LOGOUT,
    resource: AuditResources.USER,
    resourceId: userId,
  })
}

/**
 * Створює токен для верифікації email
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000)
  
  // Видаляємо старі токени для цього email
  await prisma.emailVerificationToken.deleteMany({ where: { email } })
  
  await prisma.emailVerificationToken.create({
    data: { email, token, expiresAt },
  })
  
  // Відправляємо email
  await sendVerificationEmail(email, token)
  
  return token
}

/**
 * Верифікує email за токеном
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  })
  
  if (!record || record.expiresAt < new Date()) {
    return false
  }
  
  // Оновлюємо користувача
  await prisma.user.updateMany({
    where: { email: record.email },
    data: { emailVerified: true },
  })
  
  // Видаляємо токен
  await prisma.emailVerificationToken.delete({ where: { id: record.id } })
  
  await auditLog({
    userId: undefined,
    action: AuditActions.UPDATE,
    resource: AuditResources.USER,
    metadata: { email: record.email },
  })
  
  return true
}

/**
 * Запит на скидання паролю
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  
  // Завжди повертаємо true щоб не розкривати існування email
  if (!user) {
    return true
  }
  
  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000)
  
  // Видаляємо старі токени
  await prisma.passwordResetToken.deleteMany({ where: { email } })
  
  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  })
  
  await sendPasswordResetEmail(email, token)
  
  await auditLog({
    userId: user.id,
    action: AuditActions.UPDATE,
    resource: AuditResources.USER,
    resourceId: user.id,
    metadata: { email },
  })
  
  return true
}

/**
 * Скидання паролю за токеном
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  })
  
  if (!record || record.expiresAt < new Date() || record.used) {
    return false
  }
  
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  
  // Транзакція: оновлюємо пароль, позначаємо токен використаним, відкликаємо всі сесії
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { email: record.email },
      data: { password: hash },
    })
    
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    })
    
    // Відкликаємо всі refresh токени (logout з усіх пристроїв)
    const user = await tx.user.findUnique({ where: { email: record.email } })
    if (user) {
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
  })
  
  await sendPasswordChangedEmail(record.email)
  
  await auditLog({
    userId: undefined,
    action: AuditActions.UPDATE,
    resource: AuditResources.USER,
    metadata: { email: record.email },
  })
  
  return true
}

/**
 * Зміна паролю (потрібен старий пароль)
 */
export async function changePassword(
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true },
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    throw new Error('Current password is incorrect')
  }
  
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  })
  
  await sendPasswordChangedEmail(user.email)
  
  await auditLog({
    userId,
    action: AuditActions.UPDATE,
    resource: AuditResources.USER,
    resourceId: userId,
  })
  
  return true
}

/**
 * Повторне відправлення email верифікації
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } })
  
  if (!user || user.emailVerified) {
    return false
  }
  
  await createEmailVerificationToken(email)
  return true
}
