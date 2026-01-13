import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { z } from 'zod'

const router = Router()

// Схема для валідації query параметрів
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(['Programming', 'Mathematics', 'Databases', 'Networks', 'WebDevelopment', 'MobileDevelopment', 'MachineLearning', 'Security', 'DevOps', 'OperatingSystems']).optional(),
  lang: z.string().toUpperCase().optional().default('EN'),
})

/**
 * Helper для отримання перекладу з JSON-кешу
 * @param cache - об'єкт { "UA": "...", "EN": "..." }
 * @param lang - поточна мова (напр. "UA")
 * @param fallback - значення за замовчуванням (напр. англійська назва)
 */
function getLocalizedText(cache: any, lang: string, fallback: string): string {
  if (cache && typeof cache === 'object' && !Array.isArray(cache)) {
    // 1. Шукаємо точний збіг мови
    if (cache[lang]) return cache[lang]
    // 2. Шукаємо англійську як фолбек в кеші
    if (cache['EN']) return cache['EN']
  }
  // 3. Повертаємо базове значення з колонки (fallback)
  return fallback
}

// GET /api/topics - Список тем (оптимізований)
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Валідація параметрів
    const parsed = paginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query params' })
    }
    
    const { page, limit, category, lang } = parsed.data
    
    // Перевіряємо права доступу (адмін бачить все, студент - тільки опубліковане)
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'
    const whereClause = {
      parentId: null, // Тільки кореневі теми
      ...(category ? { category: category as any } : {}),
      ...(isStaff ? {} : { status: 'Published' as const }),
    }

    // Отримуємо загальну кількість для пагінації
    const total = await prisma.topic.count({ where: whereClause })

    // Оптимізований запит: завантажуємо повне дерево для Materials page
    const topics = await prisma.topic.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        category: true,
        parentId: true,
        status: true,
        // Базові поля (фолбеки)
        name: true, 
        description: true,
        // [PERFORMANCE] Читаємо JSON кеш замість JOIN-ів
        titleCache: true,
        descCache: true,
        // Завантажуємо дочірні теми (підтеми)
        children: {
          where: isStaff ? {} : { status: 'Published' as const },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            titleCache: true,
            descCache: true,
            status: true,
            parentId: true,
            category: true,
            // Матеріали підтеми
            materials: {
              where: isStaff ? {} : { status: 'Published' as const },
              select: {
                id: true,
                title: true,
                type: true,
                url: true,
                content: true,
                lang: true,
                titleCache: true,
                contentCache: true,
                urlCache: true,
                status: true
              }
            },
            // Квізи підтеми
            quizzes: {
              where: isStaff ? {} : { status: 'Published' as const },
              select: {
                id: true,
                title: true,
                durationSec: true,
                titleCache: true
              }
            }
          }
        },
        // Матеріали основної теми
        materials: {
          where: isStaff ? {} : { status: 'Published' as const },
          select: {
            id: true,
            title: true,
            type: true,
            url: true,
            content: true,
            lang: true,
            titleCache: true,
            contentCache: true,
            urlCache: true,
            status: true
          }
        },
        // Квізи основної теми
        quizzes: {
          where: isStaff ? {} : { status: 'Published' as const },
          select: {
            id: true,
            title: true,
            durationSec: true,
            titleCache: true
          }
        }
      }
    })

    // Маппинг даних: вибираємо правильну мову з кешу та будуємо дерево
    const mappedTopics = topics.map(t => ({
      id: t.id,
      slug: t.slug,
      category: t.category,
      parentId: t.parentId,
      status: t.status,
      // Миттєвий вибір мови
      title: getLocalizedText(t.titleCache, lang, t.name),
      description: getLocalizedText(t.descCache, lang, t.description),
      name: t.name, // Додаємо для сумісності
      // Дочірні теми з локалізацією
      children: (t.children || []).map(child => ({
        id: child.id,
        slug: child.slug,
        category: child.category,
        parentId: child.parentId,
        status: child.status,
        title: getLocalizedText(child.titleCache, lang, child.name),
        description: getLocalizedText(child.descCache, lang, child.description),
        name: child.name,
        // Матеріали підтеми
        materials: (child.materials || []).map(m => ({
          id: m.id,
          type: m.type,
          url: m.url,
          content: m.content,
          lang: m.lang,
          status: m.status,
          title: getLocalizedText((m as any).titleCache, lang, m.title),
          titleCache: (m as any).titleCache,
          contentCache: (m as any).contentCache,
          urlCache: (m as any).urlCache
        })),
        // Квізи підтеми
        quizzes: (child.quizzes || []).map(q => ({
          id: q.id,
          durationSec: q.durationSec,
          title: getLocalizedText((q as any).titleCache, lang, q.title)
        }))
      })),
      // Матеріали основної теми
      materials: (t.materials || []).map(m => ({
        id: m.id,
        type: m.type,
        url: m.url,
        content: m.content,
        lang: m.lang,
        status: m.status,
        title: getLocalizedText((m as any).titleCache, lang, m.title),
        titleCache: (m as any).titleCache,
        contentCache: (m as any).contentCache,
        urlCache: (m as any).urlCache
      })),
      // Квізи основної теми
      quizzes: (t.quizzes || []).map(q => ({
        id: q.id,
        durationSec: q.durationSec,
        title: getLocalizedText((q as any).titleCache, lang, q.title)
      }))
    }))

    res.json({
      data: mappedTopics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (e) {
    console.error('Error fetching topics:', e)
    res.status(500).json({ error: 'Failed to fetch topics' })
  }
})

// GET /api/topics/:slug - Деталі теми (оптимізований)
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const lang = (req.query.lang as string || 'EN').toUpperCase()
    const { slug } = req.params
    const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'

    const topic = await prisma.topic.findUnique({
      where: { 
        slug,
        // Якщо не адмін - перевіряємо чи опубліковано
        ...(isStaff ? {} : { status: 'Published' })
      },
      select: {
        id: true,
        slug: true,
        category: true,
        parentId: true,
        status: true,
        name: true,
        description: true,
        // Кеш
        titleCache: true,
        descCache: true,
        // Батьківська тема (тільки потрібні поля)
        parent: {
          select: {
            id: true,
            slug: true,
            name: true,
            titleCache: true
          }
        },
        // Дочірні теми
        children: {
          where: isStaff ? {} : { status: 'Published' },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            titleCache: true,
            descCache: true,
            status: true,
            _count: { select: { materials: true, quizzes: true } }
          }
        },
        // Матеріали
        materials: {
          where: isStaff ? {} : { status: 'Published' },
          select: {
            id: true,
            title: true,
            type: true,
            titleCache: true // Припустимо, що в Material теж додано titleCache (якщо ні - використовуйте title)
          }
        },
        // Квізи
        quizzes: {
          where: isStaff ? {} : { status: 'Published' },
          select: {
            id: true,
            title: true,
            durationSec: true,
            titleCache: true // Аналогічно для Quiz
          }
        }
      }
    })

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    // Формуємо відповідь з локалізацією
    const response = {
      id: topic.id,
      slug: topic.slug,
      category: topic.category,
      parentId: topic.parentId,
      status: topic.status,
      title: getLocalizedText(topic.titleCache, lang, topic.name),
      description: getLocalizedText(topic.descCache, lang, topic.description),
      
      parent: topic.parent ? {
        id: topic.parent.id,
        slug: topic.parent.slug,
        title: getLocalizedText(topic.parent.titleCache, lang, topic.parent.name)
      } : null,

      children: topic.children.map(child => ({
        id: child.id,
        slug: child.slug,
        status: child.status,
        title: getLocalizedText(child.titleCache, lang, child.name),
        description: getLocalizedText(child.descCache, lang, child.description || ''),
        stats: {
          materials: child._count.materials,
          quizzes: child._count.quizzes
        }
      })),

      materials: topic.materials.map(m => ({
        id: m.id,
        type: m.type,
        // Тут використовуємо titleCache якщо він є в схемі Material, інакше просто title
        title: getLocalizedText((m as any).titleCache, lang, m.title)
      })),

      quizzes: topic.quizzes.map(q => ({
        id: q.id,
        durationSec: q.durationSec,
        title: getLocalizedText((q as any).titleCache, lang, q.title)
      }))
    }

    res.json(response)

  } catch (e) {
    console.error('Error fetching topic details:', e)
    res.status(500).json({ error: 'Failed to fetch topic' })
  }
})

export default router