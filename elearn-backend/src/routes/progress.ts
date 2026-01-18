// src/routes/progress.ts
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js' // Використовуємо єдиний handler
import {
  markMaterialViewed,
  getViewedMaterialIds,
  isMaterialViewed,
  updateDailyActivity,
  getRecentActivity,
  calculateStreak,
  getUserStats,
  syncViewedMaterials,
} from '../services/progress.service.js'

const router = Router()

function getParam(param: string | string[]): string {
  return Array.isArray(param) ? param[0] : param
}

// GET /api/progress/viewed
router.get('/viewed', requireAuth, asyncHandler(async (req, res) => {
    const materialIds = await getViewedMaterialIds(req.user!.id)
    res.json({ materialIds })
}))

// POST /api/progress/viewed
const markViewedSchema = z.object({
  materialId: z.string().min(1),
  timeSpent: z.number().int().min(0).optional(),
})

router.post('/viewed', requireAuth, asyncHandler(async (req, res) => {
    const parsed = markViewedSchema.parse(req.body) // Zod throw error -> asyncHandler catch it
    await markMaterialViewed(req.user!.id, parsed.materialId, parsed.timeSpent)
    res.json({ ok: true })
}))

// GET /api/progress/viewed/:materialId
router.get('/viewed/:materialId', requireAuth, asyncHandler(async (req, res) => {
    const viewed = await isMaterialViewed(req.user!.id, getParam(req.params.materialId))
    res.json({ viewed })
}))

// POST /api/progress/sync
const syncSchema = z.object({
  materialIds: z.array(z.string()),
})

router.post('/sync', requireAuth, asyncHandler(async (req, res) => {
    const parsed = syncSchema.parse(req.body)
    const allViewed = await syncViewedMaterials(req.user!.id, parsed.materialIds)
    res.json({ materialIds: allViewed })
}))

// GET /api/progress/stats
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
    const stats = await getUserStats(req.user!.id)
    res.json(stats)
}))

// GET /api/progress/streak
router.get('/streak', requireAuth, asyncHandler(async (req, res) => {
    const streak = await calculateStreak(req.user!.id)
    res.json(streak)
}))

// POST /api/progress/visit
router.post('/visit', requireAuth, asyncHandler(async (req, res) => {
    await updateDailyActivity(req.user!.id, { timeSpent: 1 })
    res.json({ ok: true })
}))

// GET /api/progress/activity
router.get('/activity', requireAuth, asyncHandler(async (req, res) => {
    const days = Math.min(parseInt(req.query.days as string) || 7, 30)
    const activity = await getRecentActivity(req.user!.id, days)
    res.json(activity)
}))

// POST /api/progress/activity
const activitySchema = z.object({
  timeSpent: z.number().int().min(0).optional(),
  quizAttempt: z.boolean().optional(),
  goalCompleted: z.boolean().optional(),
})

router.post('/activity', requireAuth, asyncHandler(async (req, res) => {
    const parsed = activitySchema.parse(req.body)
    
    await updateDailyActivity(req.user!.id, {
      timeSpent: parsed.timeSpent,
      quizAttempts: parsed.quizAttempt ? 1 : 0,
      goalsCompleted: parsed.goalCompleted ? 1 : 0,
    })
    
    res.json({ ok: true })
}))

// --- OPTIMIZED: GET /api/progress/recent-topics ---
router.get('/recent-topics', requireAuth, asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 2, 10)
    const userId = req.user!.id

    // 1. Get recent viewed materials (lightweight)
    const recentViews = await prisma.materialView.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 50,
      select: { materialId: true, viewedAt: true },
    })

    if (recentViews.length === 0) return res.json({ topics: [] })

    // 2. Fetch materials to identify unique topics
    const materials = await prisma.material.findMany({
      where: { id: { in: recentViews.map(v => v.materialId) } },
      select: { id: true, topicId: true }
    })

    // 3. Extract unique Topic IDs (preserving order of recency)
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
        if (uniqueTopicIds.size >= limit) break
    }

    if (uniqueTopicIds.size === 0) return res.json({ topics: [] })

    // 4. Fetch FULL Topic details + Material IDs in ONE query (Optimized)
    const topicsData = await prisma.topic.findMany({
        where: { id: { in: Array.from(uniqueTopicIds) } },
        select: {
            id: true,
            name: true,
            nameJson: true,
            slug: true,
            _count: { select: { materials: true } },
            materials: { select: { id: true } } // Get IDs to calculate progress
        }
    })

    // 5. Get all user viewed IDs for calculation
    const allViewedIds = new Set(await getViewedMaterialIds(userId))

    // 6. Map and Sort
    const result = topicsData.map(topic => {
        const viewedCount = topic.materials.filter(m => allViewedIds.has(m.id)).length
        const totalCount = topic._count.materials
        const lastViewed = topicLastViewedMap.get(topic.id) || new Date(0)

        return {
            id: topic.id,
            name: topic.name,
            nameJson: topic.nameJson,
            slug: topic.slug,
            progress: totalCount > 0 ? Math.round((viewedCount / totalCount) * 100) : 0,
            totalMaterials: totalCount,
            viewedMaterials: viewedCount,
            lastViewedAt: lastViewed
        }
    }).sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())

    res.json({ topics: result })
}))

// --- SYNC ENDPOINTS ---

const pushSchema = z.object({
  seenMaterials: z.array(z.string()).optional(),
  activity: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timeSpent: z.number().int().min(0),
    quizAttempts: z.number().int().min(0),
    materialsViewed: z.number().int().min(0),
    goalsMet: z.number().int().min(0),
  })).optional(),
})

router.post('/push', requireAuth, asyncHandler(async (req, res) => {
    const { seenMaterials, activity } = pushSchema.parse(req.body)
    const userId = req.user!.id

    if (seenMaterials?.length) {
      await prisma.materialView.createMany({
        data: seenMaterials.map(materialId => ({ userId, materialId })),
        skipDuplicates: true,
      })
    }

    if (activity?.length) {
      for (const log of activity) {
        const date = new Date(log.date) // Should ideally be UTC
        // Ensure date is treated as UTC midnight to avoid timezone shifts
        // (Assuming client sends YYYY-MM-DD correctly)
        
        await prisma.userActivity.upsert({
          where: { userId_date: { userId, date } },
          create: {
            userId,
            date,
            timeSpent: log.timeSpent,
            quizAttempts: log.quizAttempts,
            materialsViewed: log.materialsViewed,
            goalsCompleted: log.goalsMet,
          },
          update: { timeSpent: { increment: 0 } }, // Dummy update
        })

        // Merge Strategy: Take GREATEST
        await prisma.$executeRaw`
          UPDATE "UserActivity" 
          SET 
            "timeSpent" = GREATEST("timeSpent", ${log.timeSpent}),
            "quizAttempts" = GREATEST("quizAttempts", ${log.quizAttempts}),
            "materialsViewed" = GREATEST("materialsViewed", ${log.materialsViewed}),
            "goalsCompleted" = GREATEST("goalsCompleted", ${log.goalsMet})
          WHERE "userId" = ${userId} AND "date" = ${date}
        `
      }
    }

    res.json({ ok: true, synced: Date.now() })
}))

router.get('/pull', requireAuth, asyncHandler(async (req, res) => {
    const userId = req.user!.id

    const views = await prisma.materialView.findMany({
      where: { userId },
      select: { materialId: true },
    })
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activities = await prisma.userActivity.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
    })

    const streak = await calculateStreak(userId)

    res.json({
      seenMaterials: views.map(v => v.materialId),
      activity: activities.map(a => ({
        date: a.date.toISOString().split('T')[0],
        timeSpent: a.timeSpent,
        quizAttempts: a.quizAttempts,
        materialsViewed: a.materialsViewed,
        goalsMet: a.goalsCompleted,
      })),
      streak: {
        current: streak.current,
        longest: streak.longest,
        lastActiveDate: streak.lastActiveDate?.toISOString().split('T')[0] || null,
      },
      synced: Date.now(),
    })
}))

export default router