// src/routes/quiz.ts
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { validateId } from '../middleware/validateParams.js'
import { z } from 'zod'
import type { Lang } from '@elearn/shared'
import { logger } from '../utils/logger.js'
import { getQuizWithToken, submitQuizAttempt, getUserQuizHistory } from '../services/quiz.service.js'

const router = Router()

const submitSchema = z.object({
  token: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionId: z.string().optional(),
    }),
  ),
  lang: z.string().toUpperCase().optional().default('EN'),
})

router.get('/:id', requireAuth, validateId, async (req, res) => {
  try {
    const lang = req.query.lang as Lang | undefined
    
    const quiz = await getQuizWithToken(req.params.id, req.user!.id, lang)
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' })
    }
    
    res.json(quiz)
  } catch (e) {
    console.error('Error fetching quiz:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post(
  '/:id/submit',
  requireAuth,
  validateId,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = submitSchema.safeParse(req.body)
      if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() })
      
      const result = await submitQuizAttempt(
        req.params.id, 
        req.user!.id, 
        parsed.data.token,
        parsed.data.answers,
        parsed.data.lang as Lang
      )

      res.json(result)
    } catch (e: any) {
      if (e.message === 'Invalid or expired quiz token' || e.message === 'Quiz time limit exceeded' || e.message === 'Quiz token mismatch') {
        const status = e.message === 'Invalid or expired quiz token' ? 401 : 403
        return res.status(status).json({ error: e.message })
      }
      if (e.message === 'Quiz not found') {
        return res.status(404).json({ error: e.message })
      }
      next(e)
    }
  },
)

// GET /api/quiz/history — отримати історію спроб користувача
router.get('/user/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 100)
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const lang = req.query.lang as Lang | undefined

    const history = await getUserQuizHistory(req.user!.id, { page, limit, lang })

    res.json(history)
  } catch (e) {
    next(e)
  }
})

export default router
