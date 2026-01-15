// src/services/email.service.ts
import nodemailer from 'nodemailer'
import { getEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

const SMTP_HOST = getEnv('SMTP_HOST', 'smtp.gmail.com')
const SMTP_PORT = parseInt(getEnv('SMTP_PORT', '587'))
const SMTP_USER = getEnv('SMTP_USER', '')
const SMTP_PASS = getEnv('SMTP_PASS', '')
const SMTP_FROM = getEnv('SMTP_FROM', 'E-Learn <noreply@elearn.com>')
const FRONTEND_URL = getEnv('FRONTEND_URL', 'http://localhost:5173')

// === PRODUCTION SAFETY ===
// In production: SMTP must be configured. Throw error immediately if not.
if (isProd && (!SMTP_USER || !SMTP_PASS)) {
  throw new Error('CRITICAL: SMTP configuration required in production. Set SMTP_USER and SMTP_PASS.')
}

// === TRANSPORTER SETUP ===
// Production: Use nodemailer with real SMTP server
// Development: Set to null (we'll just log instead)
const transporter = isProd && SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Sends email via SMTP in production or logs in development.
 * 
 * PRODUCTION: Uses nodemailer to send actual emails via SMTP_HOST
 * DEVELOPMENT: Logs email details via logger (no actual sending)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Development mode: log the email instead of sending
  if (isDev) {
    logger.info('[EMAIL] DEV MODE - Would send email', {
      to: options.to,
      subject: options.subject,
      preview: (options.text || options.html).slice(0, 150),
    })
    return true
  }

  // Production mode: actually send via SMTP
  if (!transporter) {
    logger.error('[EMAIL] SMTP transporter not configured in production')
    return false
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      ...options,
    })
    logger.info('[EMAIL] Sent successfully', { 
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    })
    return true
  } catch (error) {
    logger.error('[EMAIL] Failed to send', error as Error, { to: options.to, subject: options.subject })
    return false
  }
}


/**
 * Відправляє email для верифікації
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`
  
  return sendEmail({
    to: email,
    subject: 'Підтвердіть вашу email адресу - E-Learn',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 28px; font-weight: bold;">E</span>
            </div>
            <h1 style="margin: 0; color: #1f2937; font-size: 24px;">Підтвердіть email</h1>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
            Дякуємо за реєстрацію в E-Learn! Будь ласка, підтвердіть вашу email адресу, натиснувши кнопку нижче.
          </p>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600;">
              Підтвердити email
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            Якщо кнопка не працює, скопіюйте це посилання:<br>
            <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            Посилання дійсне протягом 24 годин. Якщо ви не реєструвалися в E-Learn, просто проігноруйте цей лист.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Підтвердіть вашу email адресу, перейшовши за посиланням: ${verifyUrl}`,
  })
}

/**
 * Відправляє email для скидання паролю
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`
  
  return sendEmail({
    to: email,
    subject: 'Скидання паролю - E-Learn',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 28px; font-weight: bold;">E</span>
            </div>
            <h1 style="margin: 0; color: #1f2937; font-size: 24px;">Скидання паролю</h1>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
            Ви запросили скидання паролю для вашого акаунту E-Learn. Натисніть кнопку нижче, щоб встановити новий пароль.
          </p>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600;">
              Скинути пароль
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
            Якщо кнопка не працює, скопіюйте це посилання:<br>
            <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            Посилання дійсне протягом 1 години. Якщо ви не запитували скидання паролю, проігноруйте цей лист - ваш пароль залишиться незмінним.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Скиньте ваш пароль, перейшовши за посиланням: ${resetUrl}`,
  })
}

/**
 * Відправляє сповіщення про зміну паролю
 */
export async function sendPasswordChangedEmail(email: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Ваш пароль було змінено - E-Learn',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f5f5f5;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 28px; font-weight: bold;">E</span>
            </div>
            <h1 style="margin: 0; color: #1f2937; font-size: 24px;">Пароль змінено</h1>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
            Ваш пароль для акаунту E-Learn було успішно змінено. Якщо це були ви, можете проігнорувати цей лист.
          </p>
          
          <p style="color: #ef4444; font-size: 14px; line-height: 1.5; background: #fef2f2; padding: 16px; border-radius: 8px;">
            ⚠️ Якщо ви не змінювали пароль, негайно зверніться до підтримки та змініть пароль у налаштуваннях профілю.
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            З повагою,<br>Команда E-Learn
          </p>
        </div>
      </body>
      </html>
    `,
    text: 'Ваш пароль для акаунту E-Learn було успішно змінено.',
  })
}
