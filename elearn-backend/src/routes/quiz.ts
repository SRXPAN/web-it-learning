// src/routes/quiz.ts
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { validateId } from '../middleware/validateParams.js'
import { z } from 'zod'
import type { QuizSubmitResult, QuizAnswer, Lang } from '@elearn/shared'
import { localizeObject, localizeArray, getI18nKeyTranslation, type I18nKeyWithValues } from '../utils/i18n'

const router = Router()

// Field mappings for localization (legacy JSON fields)
const quizFields = { titleJson: 'title' }
const questionFields = { textJson: 'text', explanationJson: 'explanation' }
const optionFields = { textJson: 'text' }

// Include pattern for I18nKey values
const i18nKeyInclude = { values: { select: { lang: true, value: true } } }

// Type for quiz with optional i18n keys
interface QuizWithI18n {
  title?: string
  titleJson?: unknown
  titleKey?: I18nKeyWithValues
  titleKeyId?: string | null
  [key: string]: unknown
}

interface QuestionWithI18n {
  text?: string
  textJson?: unknown
  textKey?: I18nKeyWithValues
  textKeyId?: string | null
  explanation?: string | null
  explanationJson?: unknown
  explanationKey?: I18nKeyWithValues
  explanationKeyId?: string | null
  [key: string]: unknown
}

interface OptionWithI18n {
  text?: string
  textJson?: unknown
  textKey?: I18nKeyWithValues
  textKeyId?: string | null
  [key: string]: unknown
}

// Helper to localize quiz
function localizeQuiz(quiz: QuizWithI18n, lang: Lang): Record<string, unknown> {
  const result: Record<string, unknown> = { ...quiz }
  
  if (quiz.titleKey) {
    result.title = getI18nKeyTranslation(quiz.titleKey, lang, quiz.title || '')
  } else if (quiz.titleJson) {
    const localized = localizeObject(quiz as Record<string, unknown>, lang, quizFields)
    result.title = localized.title
  }
  
  // Clean up internal fields
  delete result.titleKey
  delete result.titleKeyId
  delete result.titleJson
  
  return result
}

// Helper to localize question
function localizeQuestion(q: QuestionWithI18n, lang: Lang): Record<string, unknown> {
  const result: Record<string, unknown> = { ...q }
  
  // Localize text
  if (q.textKey) {
    result.text = getI18nKeyTranslation(q.textKey, lang, q.text || '')
  } else if (q.textJson) {
    const localized = localizeObject(q as Record<string, unknown>, lang, { textJson: 'text' })
    result.text = localized.text
  }
  
  // Localize explanation
  if (q.explanationKey) {
    result.explanation = getI18nKeyTranslation(q.explanationKey, lang, q.explanation || '')
  } else if (q.explanationJson) {
    const localized = localizeObject(q as Record<string, unknown>, lang, { explanationJson: 'explanation' })
    result.explanation = localized.explanation
  }
  
  // Clean up internal fields
  delete result.textKey
  delete result.textKeyId
  delete result.textJson
  delete result.explanationKey
  delete result.explanationKeyId
  delete result.explanationJson
  
  return result
}

// Helper to localize option
function localizeOption(opt: OptionWithI18n, lang: Lang): Record<string, unknown> {
  const result: Record<string, unknown> = { ...opt }
  
  if (opt.textKey) {
    result.text = getI18nKeyTranslation(opt.textKey, lang, opt.text || '')
  } else if (opt.textJson) {
    const localized = localizeObject(opt as Record<string, unknown>, lang, optionFields)
    result.text = localized.text
  }
  
  // Clean up internal fields
  delete result.textKey
  delete result.textKeyId
  delete result.textJson
  
  return result
}

router.get('/:id', requireAuth, validateId, async (req, res) => {
  const lang = req.query.lang as Lang | undefined
  
  const quiz = await (prisma.quiz.findUnique as any)({
    where: { id: req.params.id },
    include: {
      titleKey: lang ? { include: i18nKeyInclude } : false,
      questions: { 
        include: { 
          textKey: lang ? { include: i18nKeyInclude } : false,
          explanationKey: lang ? { include: i18nKeyInclude } : false,
          options: { 
            select: { 
              id: true, 
              text: true, 
              textJson: true,
              textKey: lang ? { include: i18nKeyInclude } : false,
              // NOTE: isCorrect is NOT included - students shouldn't see it
            } 
          } 
        } 
      },
    },
  })
  if (!quiz) {
    return res.status(404).json({ error: 'Not found' })
  }
  
  // Apply localization if lang is specified
  if (lang && ['UA', 'PL', 'EN'].includes(lang)) {
    const locQuiz = localizeQuiz(quiz, lang)
    res.json({
      ...locQuiz,
      questions: quiz.questions.map((q: any) => ({
        ...localizeQuestion(q, lang),
        options: q.options.map((o: any) => localizeOption(o, lang)),
      })),
    })
  } else {
    // Remove i18n internal fields for non-localized response
    res.json({
      ...quiz,
      titleKey: undefined,
      questions: quiz.questions.map((q: any) => ({
        ...q,
        textKey: undefined,
        explanationKey: undefined,
        options: q.options.map((o: any) => ({
          ...o,
          textKey: undefined,
        })),
      })),
    })
  }
})

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionId: z.string().min(1).optional(), // allow unanswered
    }),
  ),
  lang: z.enum(['UA', 'PL', 'EN']).optional(),
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
      
      const lang = parsed.data.lang as Lang | undefined
      
      // Fetch quiz with i18n keys for explanations
      const quiz = await (prisma.quiz.findUnique as any)({
        where: { id: req.params.id },
        include: {
          questions: { 
            include: { 
              options: true, // include correctness
              explanationKey: lang ? { include: i18nKeyInclude } : false,
            } 
          },
        },
      })
      if (!quiz) return res.status(404).json({ error: 'Not found' })

      const validAnswers = parsed.data.answers.filter(
        (a) => typeof a.optionId === 'string' && a.optionId.length > 0,
      )

      // Build correctMap: questionId -> correctOptionId
      const correctMap: Record<string, string> = {}
      const explanationMap: Record<string, string> = {}
      
      for (const q of quiz.questions) {
        const correct = q.options.find((o: any) => o.correct)
        if (correct) {
          correctMap[q.id] = correct.id
        }
        
        // Get localized explanation
        if (lang && q.explanationKey) {
          explanationMap[q.id] = getI18nKeyTranslation(q.explanationKey, lang, q.explanation || '')
        } else if (lang && q.explanationJson) {
          const localized = localizeObject(q as Record<string, unknown>, lang, { explanationJson: 'explanation' })
          explanationMap[q.id] = (localized.explanation as string) || ''
        } else if (q.explanation) {
          explanationMap[q.id] = q.explanation
        }
      }

      let correctCount = 0
      const rows = validAnswers.map((a) => {
        const ok = correctMap[a.questionId] === a.optionId!
        if (ok) correctCount += 1
        return {
          userId: req.user!.id,
          questionId: a.questionId,
          optionId: a.optionId!,
          isCorrect: ok,
        }
      })

      const xpEarned = correctCount * 10

      // Використовуємо транзакцію для атомарності операцій
      await prisma.$transaction(async (tx) => {
        // Create quiz attempt record
        const attempt = await tx.quizAttempt.create({
          data: {
            userId: req.user!.id,
            quizId: quiz.id,
            score: correctCount,
            total: quiz.questions.length,
            xpEarned,
          },
        })

        if (rows.length) {
          // Link answers to attempt
          const rowsWithAttempt = rows.map((r) => ({ ...r, attemptId: attempt.id }))
          await tx.answer.createMany({ data: rowsWithAttempt, skipDuplicates: true })
        }
        
        await tx.user.update({
          where: { id: req.user!.id },
          data: { xp: { increment: xpEarned } },
        })
      })

      res.json({ 
        correct: correctCount, 
        total: quiz.questions.length, 
        xpEarned,
        correctMap,
        solutions: explanationMap,
      })
    } catch (e) {
      next(e)
    }
  },
)

// GET /api/quiz/history — отримати історію спроб користувача
router.get('/user/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 100)
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const skip = (page - 1) * limit
    const lang = req.query.lang as Lang | undefined

    // Get quiz attempts from QuizAttempt table
    const [attempts, total] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId: req.user!.id },
        include: {
          quiz: {
            select: { 
              id: true, 
              title: true,
              titleJson: true,
              titleKey: lang ? { include: i18nKeyInclude } : false,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quizAttempt.count({ where: { userId: req.user!.id } }),
    ])

    const history = attempts.map((a: any) => {
      let quizTitle = a.quiz.title
      if (lang && a.quiz.titleKey) {
        quizTitle = getI18nKeyTranslation(a.quiz.titleKey, lang, a.quiz.title)
      } else if (lang && a.quiz.titleJson) {
        quizTitle = (a.quiz.titleJson as Record<string, string>)[lang] || a.quiz.title
      }
      return {
        quizId: a.quiz.id,
        quizTitle,
        correct: a.score,
        total: a.total,
        lastAttempt: a.createdAt.toISOString(),
      }
    })

    res.json({
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (e) {
    next(e)
  }
})

export default router
