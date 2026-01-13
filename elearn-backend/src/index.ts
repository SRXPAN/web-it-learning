// src/index.ts
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import authRouter from './routes/auth.js'
import quizRouter from './routes/quiz.js'
import billingRouter, { stripeWebhookHandler } from './routes/billing.js'
import inviteRouter from './routes/invite.js'
import editorRouter from './routes/editor.js'
import topicsRouter from './routes/topics.js'
import lessonsRouter from './routes/lessons.js'
import progressRouter from './routes/progress.js'
import filesRouter from './routes/files.js'
import adminRouter from './routes/admin.js'

import { generalLimiter, authLimiter, webhookLimiter } from './middleware/rateLimit.js'
import { validateCsrf } from './middleware/csrf.js'
import { sanitize } from './middleware/sanitize.js'

const app = express()


// --- Security headers ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  contentSecurityPolicy: false, // CSP на фронтенді
  hsts: {
    maxAge: 31536000, // 1 рік
    includeSubDomains: true,
    preload: true,
  },
}))
const allowed = Array.from(
  new Set(
    [
      ...(process.env.CORS_ORIGIN?.split(',').map(s=>s.trim()) ?? []),
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174'
    ].filter(Boolean)
  )
)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true)
    return cb(new Error('CORS not allowed'), false)
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-csrf-token']
}))

// --- Логи ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cookieParser())

// Stripe webhook повинен йти ДО json-парсера і з raw body
app.post('/billing/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

// --- Webhook Stripe має бачити raw body ДО express.json ---
app.post(
  '/api/billing/webhook',
  webhookLimiter,                          // лімітуємо навіть вебхуки
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

// --- Ліміт розміру JSON тіла + звичайний парсер ---
app.use(express.json({ limit: '1mb' }))

// --- Санітизація вхідних даних ---
app.use(sanitize)

app.use('/api', (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (mutatingMethods.includes(req.method)) {
    return validateCsrf(req, res, next)
  }
  next()
})

// --- Глобальний м'який ліміт на решту API ---
app.use('/api', generalLimiter)

// --- Healthcheck без auth ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Auth роути з селективним лімітом (5 спроб за 15 хв) ---
app.use('/api/auth', authLimiter, authRouter)

// --- Invite / Billing (чутливі) — додатковий authLimiter ---
app.use('/api/invite', authLimiter, inviteRouter)
app.use('/api/billing', authLimiter, billingRouter)

// --- Інші модулі ---
app.use('/api/topics', topicsRouter)
app.use('/api/lessons', lessonsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/editor', editorRouter)
app.use('/api/progress', progressRouter)
app.use('/api/files', filesRouter) // File uploads

// --- ADMIN ---
app.use('/api/admin', adminRouter)

// --- 404 JSON ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// --- Глобальний JSON error handler ---
interface HttpError extends Error {
  status?: number
  type?: string
}

app.use((err: HttpError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.message === 'CORS not allowed') {
    return res.status(403).json({ error: 'CORS blocked' })
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large' })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' })
  }
  const status = typeof err?.status === 'number' ? err.status : 500
  const message = err?.message || 'Internal Server Error'
  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }
  res.status(status).json({ error: message })
})

const port = Number(process.env.PORT ?? 4000)
const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`))

// Graceful shutdown logic...
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  server.close(async (err) => {
    if (err) {
      console.error('Error during server close:', err)
      process.exit(1)
    }
    console.log('HTTP server closed')
    try {
      const { prisma } = await import('./db.js')
      await prisma.$disconnect()
      console.log('Database connection closed')
    } catch (dbErr) {
      console.error('Error closing database:', dbErr)
    }
    console.log('Graceful shutdown completed')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})  