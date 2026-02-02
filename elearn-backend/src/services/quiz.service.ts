// src/services/quiz.service.ts
import { prisma } from '../db.js'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../utils/env.js'
import type { Lang } from '../shared'
import { logger } from '../utils/logger.js'
import { updateDailyActivity } from './progress.service.js'

/**
 * Helper to get localized value from JSON field
 */
function getLocalized(jsonField: any, lang: Lang, fallback: string): string {
  if (jsonField && typeof jsonField === 'object' && !Array.isArray(jsonField)) {
    if (jsonField[lang]) return jsonField[lang]
    if (jsonField['EN']) return jsonField['EN']
  }
  return fallback
}

/**
 * Get quiz by ID with localization and token generation
 */
export async function getQuizWithToken(quizId: string, userId: string, lang?: Lang) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { 
        include: { 
          options: { 
            select: { 
              id: true, 
              text: true, 
              textJson: true,
            } 
          } 
        } 
      },
    },
  })

  if (!quiz) return null

  // Generate quiz token
  const expiresAt = Date.now() + (quiz.durationSec * 1000) + (120 * 1000)
  const quizPayload = { quizId: quiz.id, userId, expiresAt }
  const expiresInSeconds = (quiz.durationSec + 120) * 60
  const quizToken = jwt.sign(quizPayload, getJwtSecret(), { 
    expiresIn: expiresInSeconds
  })

  // Apply localization if specified
  const shouldLocalize = lang && ['UA', 'PL', 'EN'].includes(lang)
  
  // FIX: Changed titleCache to titleJson
  return {
    id: quiz.id,
    title: shouldLocalize ? getLocalized(quiz.titleJson, lang, quiz.title) : quiz.title,
    durationSec: quiz.durationSec,
    topicId: quiz.topicId,
    status: quiz.status,
    token: quizToken,
    questions: quiz.questions.map((q: any) => ({
      id: q.id,
      text: shouldLocalize ? getLocalized(q.textJson, lang, q.text) : q.text,
      explanation: shouldLocalize ? getLocalized(q.explanationJson, lang, q.explanation || '') : q.explanation,
      difficulty: q.difficulty,
      tags: q.tags,
      options: q.options.map((o: any) => ({
        id: o.id,
        text: shouldLocalize ? getLocalized(o.textJson, lang, o.text) : o.text,
      }))
    }))
  }
}

/**
 * Submit quiz attempt and calculate score
 */
export async function submitQuizAttempt(
  quizId: string,
  userId: string,
  token: string,
  answers: Array<{ questionId: string; optionId?: string }>,
  lang?: Lang
) {
  logger.info(`[submitQuizAttempt] Starting quiz submission for user ${userId}, quiz ${quizId}`)
  
  // Verify quiz token
  let quizPayload: any
  try {
    quizPayload = jwt.verify(token, getJwtSecret()) as any
  } catch (e) {
    logger.error('Quiz token verification failed:', e)
    throw new Error('Invalid or expired quiz token')
  }

  // Check if time is up
  if (Date.now() > quizPayload.expiresAt) {
    throw new Error('Quiz time limit exceeded')
  }

  // Verify token matches this quiz and user
  if (quizPayload.quizId !== quizId || quizPayload.userId !== userId) {
    throw new Error('Quiz token mismatch')
  }

  // Fetch quiz with correct answers
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: {
          options: {
            select: {
              id: true,
              correct: true // Correct field name as per schema
            }
          }
        }
      }
    }
  })

  if (!quiz) {
    throw new Error('Quiz not found')
  }

  // Filter valid answers AND deduplicate by questionId
  const uniqueAnswersMap = new Map<string, { questionId: string; optionId?: string }>();
  
  answers.forEach((a) => {
    if (typeof a.optionId === 'string' && a.optionId.length > 0) {
      uniqueAnswersMap.set(a.questionId, a);
    }
  });

  const validAnswers = Array.from(uniqueAnswersMap.values());

  // Build correctMap and explanationMap
  const correctMap: Record<string, string> = {}
  const explanationMap: Record<string, string> = {}
  
  for (const q of quiz.questions) {
    const correctOption = q.options.find((o: any) => o.correct)
    if (correctOption) {
      correctMap[q.id] = correctOption.id
    }
    
    // Get localized explanation if available
    if (lang && (q as any).explanationJson) {
      explanationMap[q.id] = getLocalized((q as any).explanationJson, lang, (q as any).explanation || '')
    } else if ((q as any).explanation) {
      explanationMap[q.id] = (q as any).explanation
    }
  }

  // Calculate score
  let correctCount = 0
  const rows = validAnswers.map((a) => {
    const ok = correctMap[a.questionId] === a.optionId!
    if (ok) correctCount += 1
    return {
      userId,
      questionId: a.questionId,
      optionId: a.optionId!,
      isCorrect: ok, // 'isCorrect' is correct for the Answer model (vs 'correct' for Option)
    }
  })

  // Pass threshold: user must score at least 70% to pass and earn XP
  const PASS_THRESHOLD = 0.70
  const scorePercentage = quiz.questions.length > 0 ? correctCount / quiz.questions.length : 0
  const passed = scorePercentage >= PASS_THRESHOLD
  const xpEarned = passed ? correctCount * 10 : 0

  // Save attempt in transaction
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        score: correctCount,
        total: quiz.questions.length,
        xpEarned,
      },
    })
    
    logger.info(`[submitQuizAttempt] Created quiz attempt ${attempt.id} for user ${userId}, quiz ${quizId}. Score: ${correctCount}/${quiz.questions.length}, Passed: ${passed}`)

    if (rows.length) {
      const rowsWithAttempt = rows.map((r) => ({ ...r, attemptId: attempt.id }))
      await tx.answer.createMany({ data: rowsWithAttempt, skipDuplicates: true })
    }
    
    // Only award XP if user passed the quiz
    if (xpEarned > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { xp: { increment: xpEarned } },
      })
    }
  })

  // Log quiz attempt in daily activity
  logger.info(`[submitQuizAttempt] Updating daily activity for user ${userId}`)
  await updateDailyActivity(userId, { quizAttempts: 1 })
  logger.info(`[submitQuizAttempt] Quiz attempt successfully recorded for user ${userId}, passed: ${passed}`)

  return {
    correct: correctCount,
    total: quiz.questions.length,
    score: Math.round(scorePercentage * 100),
    passed,
    xpEarned,
    correctMap,
    solutions: explanationMap,
  }
}

/**
 * Get user's quiz history
 */
export async function getUserQuizHistory(
  userId: string, 
  options: { page: number; limit: number; lang?: Lang }
) {
  logger.info(`[getUserQuizHistory] Fetching history for user ${userId}, page: ${options.page}, limit: ${options.limit}`)
  
  const skip = (options.page - 1) * options.limit
  
  const [attempts, total] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      include: {
        quiz: {
          select: { 
            id: true, 
            title: true,
            titleJson: true, // FIX: Changed titleCache to titleJson
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: options.limit,
    }),
    prisma.quizAttempt.count({ where: { userId } }),
  ])
  
  logger.info(`[getUserQuizHistory] Found ${attempts.length} attempts out of ${total} total for user ${userId}`)

  const history = attempts.map((a: any) => {
    let quizTitle = a.quiz.title
    // FIX: Changed titleCache to titleJson
    if (options.lang && a.quiz.titleJson) {
      quizTitle = getLocalized(a.quiz.titleJson, options.lang, a.quiz.title)
    }
    return {
      quizId: a.quiz.id,
      quizTitle,
      correct: a.score,
      total: a.total,
      lastAttempt: a.createdAt.toISOString(),
    }
  })

  return {
    data: history,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit)
    }
  }
}