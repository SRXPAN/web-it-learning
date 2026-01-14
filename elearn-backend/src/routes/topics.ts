import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { z } from 'zod'
import { getTopics, getTopicByIdOrSlug } from '../services/topics.service.js'

const router = Router()

// Схема для валідації query параметрів
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(['Programming', 'Mathematics', 'Databases', 'Networks', 'WebDevelopment', 'MobileDevelopment', 'MachineLearning', 'Security', 'DevOps', 'OperatingSystems']).optional(),
  lang: z.string().toUpperCase().optional().default('EN'),
})

// GET /api/topics - Список тем (оптимізований)
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Валідація параметрів
    const parsed = paginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query params' })
    }
    
    const { page, limit, category, lang } = parsed.data
    
    // Перевіряємо права доступу
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'
    
    const result = await getTopics({
      page,
      limit,
      category,
      lang,
      isStaff
    })

    res.json(result)
  } catch (e) {
    console.error('Error fetching topics:', e)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/topics/:slug - Деталі теми (оптимізований)
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const lang = (req.query.lang as string || 'EN').toUpperCase()
    const { slug } = req.params
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

    const topic = await getTopicByIdOrSlug(slug, lang, isStaff)

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    res.json(topic)
  } catch (e) {
    console.error('Error fetching topic details:', e)
    res.status(500).json({ error: 'Failed to fetch topic' })
  }
})

export default router