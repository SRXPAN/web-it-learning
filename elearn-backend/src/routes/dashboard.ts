// src/routes/dashboard.ts
import { Router, Request, Response } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  calculateStreak,
  getRecentActivity,
  getViewedMaterialIds,
} from '../services/progress.service.js'
import type { Lang } from '../shared'

const router = Router()

/**
 * GET /api/dashboard/summary?lang=EN
 * Returns dashboard data for authenticated user with REAL streak & progress data
 */
router.get('/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id
  const lang = (req.query.lang as string || 'EN') as Lang

  // 0. Get user info (for XP) - Real-time from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true }
  })
  const userXp = user?.xp ?? 0

  // Get real completed lessons count from database
  const completedLessonsCount = await prisma.materialView.count({
    where: { userId }
  })

  // 1. Get REAL streak data (not hardcoded)
  const streakData = await calculateStreak(userId)
  
  // 2. Get recent activity (last 7 days)
  const activities = await getRecentActivity(userId, 7)
  const totalTimeSpent = activities.reduce((sum, a) => sum + a.timeSpent, 0)
  const totalQuizAttempts = activities.reduce((sum, a) => sum + a.quizAttempts, 0)

  // 3. Get viewed materials for progress calculation
  const viewedMaterialIds = new Set(await getViewedMaterialIds(userId))

  // 4. Get recent topics with REAL progress calculation
  const recentViews = await prisma.materialView.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    take: 50,
    select: { materialId: true, viewedAt: true },
  })

  if (recentViews.length === 0) {
    // Generate empty 7-day history
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const history: boolean[] = []
    for (let i = 6; i >= 0; i--) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      history.push(false)
    }
    
    return res.json({
      userXp,
      completedLessons: completedLessonsCount,
      stats: {
        streak: { ...streakData, history },
        activity: { 
          timeSpent: 0, 
          quizAttempts: 0
        }
      },
      recentTopics: [],
      dailyGoals: [],
      weakSpots: [],
      tipOfTheDay: 'Practice makes perfect! Keep learning every day.',
      achievements: [
        { id: 'first_material', name: 'First Steps', description: 'View your first material', earned: false },
        { id: 'quiz_master', name: 'Quiz Master', description: 'Complete 5 quizzes', earned: false },
        { id: 'streak_7', name: '7-Day Streak', description: 'Maintain a 7-day streak', earned: false }
      ]
    })
  }

  // Get materials to identify topics
  const materials = await prisma.material.findMany({
    where: { id: { in: recentViews.map(v => v.materialId) } },
    select: { id: true, topicId: true }
  })

  // Extract unique topics (preserving recency)
  const uniqueTopicIds = new Set<string>()
  const topicLastViewedMap = new Map<string, Date>()

  for (const view of recentViews) {
    const mat = materials.find(m => m.id === view.materialId)
    if (mat && mat.topicId) {
      if (!uniqueTopicIds.has(mat.topicId)) {
        uniqueTopicIds.add(mat.topicId)
        topicLastViewedMap.set(mat.topicId, view.viewedAt)
      }
    }
    if (uniqueTopicIds.size >= 4) break
  }

  // Fetch topic details
  const topicsData = await prisma.topic.findMany({
    where: { id: { in: Array.from(uniqueTopicIds) } },
    select: {
      id: true,
      name: true,
      nameJson: true,
      slug: true,
      materials: { select: { id: true } }
    }
  })

  const recentTopics = topicsData
    .map(topic => {
      const viewedCount = topic.materials.filter(m => viewedMaterialIds.has(m.id)).length
      const totalCount = topic.materials.length
      const progress = totalCount > 0 ? Math.round((viewedCount / totalCount) * 100) : 0

      return {
        id: topic.id,
        name: topic.name,
        nameJson: topic.nameJson,
        slug: topic.slug,
        progress,
        totalMaterials: totalCount,
        viewedMaterials: viewedCount,
        lastViewedAt: topicLastViewedMap.get(topic.id) || new Date(0)
      }
    })
    .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())

  // Generate 7-day history for streak visualization
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const activityDates = new Set(activities.map(a => new Date(a.date).toISOString().split('T')[0]))
  
  const history: boolean[] = []
  for (let i = 6; i >= 0; i--) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]
    history.push(activityDates.has(dateStr))
  }

  // Daily goals - Use realistic goals based on activity
  const dailyGoalsData = [
    { id: '1', text: 'Complete 1 lesson', isCompleted: totalQuizAttempts > 0 },
    { id: '2', text: 'Score 80%+ on quiz', isCompleted: false }, // Will be updated dynamically
    { id: '3', text: 'Study 30 minutes', isCompleted: totalTimeSpent >= 1800 }
  ]

  // Get weak spots: Topics where user scores are below 70%
  const lowScoringQuizzes = await prisma.quizAttempt.groupBy({
    by: ['quizId'],
    where: {
      userId,
      score: { lt: 70 }
    },
    _avg: { score: true },
    orderBy: { _avg: { score: 'asc' } },
    take: 3
  })

  const weakSpotsList = []
  for (const quiz of lowScoringQuizzes) {
    const quizData = await prisma.quiz.findUnique({
      where: { id: quiz.quizId },
      select: { title: true, titleJson: true, topic: { select: { name: true } } }
    })
    if (quizData?.topic) {
      const score = Math.round(quiz._avg?.score ?? 0)
      weakSpotsList.push({
        topic: quizData.topic.name,
        advice: `You scored ${score}% on average. Practice this topic more to improve your understanding.`
      })
    }
  }

  // Tip of the Day - rotate through tips
  const tips = [
    'Practice makes perfect! Keep learning every day.',
    'Review previous topics to strengthen your foundations.',
    'Take breaks between sessions to retain information better.',
    'Try to score 80%+ on quizzes for maximum XP.',
    'Focus on weak spots first to improve faster.'
  ]
  const tipOfTheDay = tips[Math.floor(new Date().getTime() / 86400000) % tips.length]

  res.json({
    userXp,
    completedLessons: completedLessonsCount,
    stats: {
      streak: {
        current: streakData.current,
        longest: streakData.longest,
        lastActiveDate: streakData.lastActiveDate,
        history
      },
      activity: {
        timeSpent: totalTimeSpent,
        quizAttempts: totalQuizAttempts
      }
    },
    recentTopics,
    dailyGoals: dailyGoalsData,
    weakSpots: weakSpotsList,
    tipOfTheDay,
    achievements: [
      { id: 'first_material', name: 'First Steps', description: 'View your first material', earned: completedLessonsCount > 0 },
      { id: 'quiz_master', name: 'Quiz Master', description: 'Complete 5 quizzes', earned: totalQuizAttempts >= 5 },
      { id: 'streak_7', name: '7-Day Streak', description: 'Maintain a 7-day streak', earned: streakData.current >= 7 }
    ]
  })
}))

export default router
