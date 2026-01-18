// src/index.ts
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Load .env from monorepo root
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../../.env') })

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import { logger } from './utils/logger.js'

// Import Routes
import authRouter from './routes/auth.js'
import quizRouter from './routes/quiz.js'
import editorRouter from './routes/editor.js'
import topicsRouter from './routes/topics.js'
import lessonsRouter from './routes/lessons.js'
import progressRouter from './routes/progress.js'
import filesRouter from './routes/files.js'
import adminRouter from './routes/admin.js'

// Import Middleware
import { generalLimiter, authLimiter } from './middleware/rateLimit.js'
import { validateCsrf } from './middleware/csrf.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app = express()

app.set('trust proxy', 1)

// --- Security headers ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  contentSecurityPolicy: false, // CSP handles on frontend
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}))

const allowed = Array.from(
  new Set(
    [
      ...(process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) ?? []),
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}))

// --- Logging ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cookieParser())

// --- Body Parser ---
app.use(express.json({ limit: '1mb' }))

// --- CSRF Protection (Mutating methods only) ---
app.use('/api', (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (mutatingMethods.includes(req.method)) {
    return validateCsrf(req, res, next)
  }
  next()
})

// --- Global Rate Limit ---
app.use('/api', generalLimiter)

// --- Healthcheck ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Routes ---
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/topics', topicsRouter)
app.use('/api/lessons', lessonsRouter)
app.use('/api/quiz', quizRouter)
app.use('/api/editor', editorRouter)
app.use('/api/progress', progressRouter)
app.use('/api/files', filesRouter)
app.use('/api/admin', adminRouter)

// --- Error Handling (MUST be last) ---
app.use(notFoundHandler) // 404 Handler
app.use(errorHandler)    // Global Error Handler

// --- Server Startup ---
const port = Number(process.env.PORT ?? 4000)
const server = app.listen(port, () => logger.info(`API listening on http://localhost:${port}`))

// --- Graceful Shutdown ---
async function gracefulShutdown(signal: string) {
  logger.warn(`${signal} received. Starting graceful shutdown...`)
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server close', err as Error)
      process.exit(1)
    }
    logger.info('HTTP server closed')
    try {
      const { prisma } = await import('./db.js')
      // Safe disconnect if using prisma extensions
      if (prisma && '$disconnect' in prisma) {
        await (prisma as any).$disconnect()
        logger.info('Database connection closed')
      }
    } catch (dbErr) {
      logger.error('Error closing database', dbErr as Error)
    }
    logger.info('Graceful shutdown completed')
    process.exit(0)
  })
  
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', new Error(String(reason)), { promise })
})