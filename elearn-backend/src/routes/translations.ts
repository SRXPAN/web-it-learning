// src/routes/translations.ts
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'
import { z } from 'zod'
import type { Lang } from '@elearn/shared'
import { clearTranslationCache } from './i18n.js'

const router = Router()

// ============================================
// PUBLIC ENDPOINTS для отримання локалізацій
// (з обов'язковою мовою в запиті)
// ============================================

// GET /api/translations/daily-goals?lang=UA
// Отримати всі шаблони щоденних цілей
router.get('/daily-goals', async (req, res) => {
  const lang = (req.query.lang as Lang) || 'EN'
  
  const goals = await prisma.dailyGoalTemplate.findMany({
    where: { isActive: true },
    select: { id: true, category: true, weight: true, translations: true }
  })
  
  // Локалізуємо
  const localized = goals.map(g => ({
    id: g.id,
    category: g.category,
    weight: g.weight,
    text: (g.translations as Record<string, string>)?.[lang] || 
          (g.translations as Record<string, string>)?.['EN'] || ''
  }))
  
  res.json(localized)
})

// GET /api/translations/weak-spots?lang=UA
router.get('/weak-spots', async (req, res) => {
  const lang = (req.query.lang as Lang) || 'EN'
  
  const spots = await prisma.weakSpotTemplate.findMany({
    where: { isActive: true },
    select: { id: true, category: true, weight: true, translations: true }
  })
  
  const localized = spots.map(s => {
    const trans = s.translations as { topic?: Record<string, string>, advice?: Record<string, string> }
    return {
      id: s.id,
      category: s.category,
      weight: s.weight,
      topic: trans?.topic?.[lang] || trans?.topic?.['EN'] || '',
      advice: trans?.advice?.[lang] || trans?.advice?.['EN'] || ''
    }
  })
  
  res.json(localized)
})

// GET /api/translations/achievements?lang=UA
router.get('/achievements', async (req, res) => {
  const lang = (req.query.lang as Lang) || 'EN'
  
  const achievements = await prisma.achievementTemplate.findMany({
    where: { isActive: true },
    select: { id: true, code: true, icon: true, xpReward: true, translations: true }
  })
  
  const localized = achievements.map(a => {
    const trans = a.translations as { name?: Record<string, string>, description?: Record<string, string> }
    return {
      id: a.id,
      code: a.code,
      icon: a.icon,
      xpReward: a.xpReward,
      name: trans?.name?.[lang] || trans?.name?.['EN'] || a.code,
      description: trans?.description?.[lang] || trans?.description?.['EN'] || ''
    }
  })
  
  res.json(localized)
})

// GET /api/translations/categories?lang=UA
router.get('/categories', async (req, res) => {
  const lang = (req.query.lang as Lang) || 'EN'
  
  const categories = await prisma.categoryTranslation.findMany({
    select: { category: true, translations: true }
  })
  
  const result = categories.reduce((acc, c) => {
    const trans = c.translations as Record<string, string>
    acc[c.category] = trans?.[lang] || trans?.['EN'] || c.category
    return acc
  }, {} as Record<string, string>)
  
  res.json(result)
})

// ============================================
// ADMIN ENDPOINTS для управління перекладами
// ============================================

const uiTranslationSchema = z.object({
  key: z.string().min(1),
  translations: z.object({
    UA: z.string().optional(),
    PL: z.string().optional(),
    EN: z.string().optional(),
  })
})

// GET /api/i18n/translations - list all translations with pagination
router.get('/translations', requireAuth, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  const { page = '1', limit = '30', search, namespace } = req.query
  
  const where: any = {}
  
  if (search) {
    where.OR = [
      { key: { contains: search as string, mode: 'insensitive' } },
    ]
  }
  
  if (namespace) {
    where.key = { startsWith: `${namespace}.` }
  }
  
  const [translations, total] = await Promise.all([
    prisma.uiTranslation.findMany({
      where,
      orderBy: { key: 'asc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    }),
    prisma.uiTranslation.count({ where }),
  ])
  
  // Extract namespace from key
  const withNamespace = translations.map(t => ({
    ...t,
    namespace: t.key.split('.')[0] || 'common',
  }))
  
  res.json({
    translations: withNamespace,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  })
})

// PUT /api/i18n/translations/:id - update translation
router.put('/translations/:id', requireAuth, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  const { id } = req.params
  const { translations } = req.body
  
  const updated = await prisma.uiTranslation.update({
    where: { id },
    data: { translations },
  })
  
  // Очищаємо кеш переклавів
  clearTranslationCache()
  
  res.json(updated)
})

// POST /api/i18n/translations - create translation
router.post('/translations', requireAuth, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  const parsed = uiTranslationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  
  const { key, translations } = parsed.data
  
  // Check if exists
  const existing = await prisma.uiTranslation.findFirst({ where: { key } })
  if (existing) {
    return res.status(400).json({ error: 'Key already exists' })
  }
  
  const created = await prisma.uiTranslation.create({
    data: { key, translations },
  })
  
  // Очищаємо кеш перекладів
  clearTranslationCache()
  
  res.status(201).json(created)
})

// DELETE /api/translations/translations/:id - delete translation
router.delete('/translations/:id', requireAuth, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  const { id } = req.params
  
  await prisma.uiTranslation.delete({
    where: { id }
  })
  
  // Очищаємо кеш перекладів
  clearTranslationCache()
  
  res.json({ success: true })
})
export const translationsRouter = router
export default router
