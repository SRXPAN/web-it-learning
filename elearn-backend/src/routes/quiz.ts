// src/routes/quiz.ts
import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { validateResource } from '../middleware/validateResource.js'
import { quizSchemas } from '../schemas/quiz.schema.js'
import type { Lang } from '@elearn/shared'
import { getQuizWithToken, submitQuizAttempt, getUserQuizHistory } from '../services/quiz.service.js'
import { z } from 'zod'

const router = Router()

// Helper (TODO: Move to shared utils)
function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// GET /api/quiz/:id
router.get(
  '/:id',
  requireAuth,
  validateResource(quizSchemas.idParam, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as Lang | undefined
    const id = getParam(req.params.id)

    const quiz = await getQuizWithToken(id, req.user!.id, lang)
    
    if (!quiz) {
      throw AppError.notFound('Quiz not found')
    }
    
    return res.json(quiz)
  })
)

// POST /api/quiz/:id/submit
router.post(
  '/:id/submit',
  requireAuth,
  // Fix: Chain validations instead of passing object (more reliable)
  validateResource(quizSchemas.idParam, 'params'),
  validateResource(quizSchemas.submitQuiz, 'body'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = getParam(req.params.id)
    const { token, answers, lang } = req.body

    try {
      const result = await submitQuizAttempt(
        id,
        req.user!.id,
        token,
        answers,
        (lang as Lang) || 'EN'
      )
      return res.json(result)
    } catch (e: any) {
      // Mapping service errors to HTTP codes
      // Tip: In the future, throw AppError directly from the service
      switch (e.message) {
        case 'Invalid or expired quiz token':
          throw AppError.unauthorized(e.message)
        case 'Quiz time limit exceeded':
        case 'Quiz token mismatch':
          throw AppError.forbidden(e.message)
        case 'Quiz not found':
          throw AppError.notFound(e.message)
        default:
          throw e
      }
    }
  })
)

// GET /api/quiz/user/history
// Using zod schema for query validation is safer
const historyQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('5'),
  lang: z.enum(['UA', 'PL', 'EN']).optional()
})

router.get(
  '/user/history',
  requireAuth,
  validateResource(historyQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as z.infer<typeof historyQuerySchema>
    
    const limit = Math.min(parseInt(query.limit), 100)
    const page = Math.max(parseInt(query.page), 1)
    const lang = query.lang as Lang | undefined

    const history = await getUserQuizHistory(req.user!.id, { page, limit, lang })
    return res.json(history)
  })
)

export default router