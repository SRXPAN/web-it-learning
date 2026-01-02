// src/routes/topics.ts
import { Router } from 'express'
import { prisma } from '../db'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'
import { localizeObject, localizeArray, getI18nKeyTranslation, type I18nKeyWithValues } from '../utils/i18n'
import type { Lang } from '@elearn/shared'

const router = Router()

// Field mappings for localization (legacy JSON fields)
const topicFields = { nameJson: 'name', descJson: 'description' }
const materialFields = { titleJson: 'title', contentJson: 'content' }
const quizFields = { titleJson: 'title' }

// Include pattern for I18nKey values
const i18nKeyInclude = { values: { select: { lang: true, value: true } } }

// Type for topic with optional i18n keys
interface TopicWithI18n {
  name?: string
  nameJson?: unknown
  description?: string | null
  descJson?: unknown
  titleKey?: I18nKeyWithValues
  descKey?: I18nKeyWithValues
  titleKeyId?: string | null
  descKeyId?: string | null
  [key: string]: unknown
}

// Helper to localize topic using I18nKey or fallback to JSON
function localizeTopic<T extends TopicWithI18n>(topic: T, lang: Lang): Omit<T, 'titleKey' | 'descKey' | 'titleKeyId' | 'descKeyId' | 'nameJson' | 'descJson'> {
  const result: Record<string, unknown> = { ...topic }
  
  // Localize name: prefer titleKey, fallback to nameJson/name
  if (topic.titleKey) {
    result.name = getI18nKeyTranslation(topic.titleKey, lang, topic.name || '')
  } else if (topic.nameJson) {
    const localized = localizeObject(topic as Record<string, unknown>, lang, { nameJson: 'name' })
    result.name = localized.name
  }
  
  // Localize description: prefer descKey, fallback to descJson/description
  if (topic.descKey) {
    result.description = getI18nKeyTranslation(topic.descKey, lang, topic.description || '')
  } else if (topic.descJson) {
    const localized = localizeObject(topic as Record<string, unknown>, lang, { descJson: 'description' })
    result.description = localized.description
  }
  
  // Clean up internal fields from response
  delete result.titleKey
  delete result.descKey
  delete result.titleKeyId
  delete result.descKeyId
  delete result.nameJson
  delete result.descJson
  
  return result as Omit<T, 'titleKey' | 'descKey' | 'titleKeyId' | 'descKeyId' | 'nameJson' | 'descJson'>
}

// Схема для пагінації
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z.enum(['Programming', 'Mathematics', 'Databases', 'Networks']).optional(),
  lang: z.enum(['UA', 'PL', 'EN']).optional(),
})

// Повертаємо дерево тем з оптимізацією
router.get('/', requireAuth, async (req, res) => {
  const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'
  
  // Парсимо query параметри
  const parsed = paginationSchema.safeParse(req.query)
  const { page, limit, category, lang } = parsed.success 
    ? parsed.data 
    : { page: 1, limit: 20, category: undefined, lang: undefined }
  
  // Базовий where clause
  const baseWhere = {
    parentId: null,
    ...(isStaff ? {} : { status: 'Published' as const }),
    ...(category ? { category } : {}),
  }
  
  // Отримуємо загальну кількість для пагінації
  const total = await prisma.topic.count({ where: baseWhere })
  
  const topics = await (prisma.topic.findMany as any)({
    where: baseWhere,
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      nameJson: true,
      description: true,
      descJson: true,
      category: true,
      status: true,
      titleKey: lang ? { include: i18nKeyInclude } : false,
      descKey: lang ? { include: i18nKeyInclude } : false,
      materials: {
        where: isStaff ? {} : { status: 'Published' },
        select: { id: true, title: true, titleJson: true, type: true, url: true, content: true, contentJson: true, lang: true, status: true },
      },
      quizzes: {
        where: isStaff ? {} : { status: 'Published' },
        select: { id: true, title: true, titleJson: true, durationSec: true, status: true },
      },
      children: {
        where: isStaff ? {} : { status: 'Published' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          nameJson: true,
          description: true,
          descJson: true,
          category: true,
          status: true,
          titleKey: lang ? { include: i18nKeyInclude } : false,
          descKey: lang ? { include: i18nKeyInclude } : false,
          materials: {
            where: isStaff ? {} : { status: 'Published' },
            select: { id: true, title: true, titleJson: true, type: true, url: true, content: true, contentJson: true, lang: true, status: true },
          },
          quizzes: {
            where: isStaff ? {} : { status: 'Published' },
            select: { id: true, title: true, titleJson: true, durationSec: true, status: true },
          },
        },
      },
      _count: {
        select: { materials: true, quizzes: true, children: true },
      },
    },
  }) as any[]
  
  // Apply localization if lang is specified
  const localizedTopics = lang 
    ? topics.map((topic: any) => {
        const locTopic = localizeTopic(topic, lang as Lang)
        return {
          ...locTopic,
          materials: localizeArray(topic.materials, lang as Lang, materialFields),
          quizzes: localizeArray(topic.quizzes, lang as Lang, quizFields),
          children: topic.children.map((child: any) => ({
            ...localizeTopic(child, lang as Lang),
            materials: localizeArray(child.materials, lang as Lang, materialFields),
            quizzes: localizeArray(child.quizzes, lang as Lang, quizFields),
          })),
        }
      })
    : topics
  
  res.json({
    data: localizedTopics,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

router.get('/:slug', requireAuth, async (req, res) => {
  const isStaff = req.user?.role === 'ADMIN' || req.user?.role === 'EDITOR'
  const lang = req.query.lang as Lang | undefined
  
  const topic = await (prisma.topic.findUnique as any)({
    where: isStaff ? { slug: req.params.slug } : { slug: req.params.slug, status: 'Published' },
    include: {
      titleKey: lang ? { include: i18nKeyInclude } : false,
      descKey: lang ? { include: i18nKeyInclude } : false,
      materials: isStaff ? true : { where: { status: 'Published' } },
      quizzes:   isStaff ? true : { where: { status: 'Published' } },
      children:  isStaff 
        ? { include: { titleKey: lang ? { include: i18nKeyInclude } : false, descKey: lang ? { include: i18nKeyInclude } : false } }
        : { where: { status: 'Published' }, include: { titleKey: lang ? { include: i18nKeyInclude } : false, descKey: lang ? { include: i18nKeyInclude } : false } },
      parent: lang 
        ? { include: { titleKey: { include: i18nKeyInclude }, descKey: { include: i18nKeyInclude } } }
        : true
    }
  }) as any
  if (!topic) return res.status(404).json({ error: 'Not found' })
  
  // Apply localization if lang is specified
  if (lang && ['UA', 'PL', 'EN'].includes(lang)) {
    const locTopic = localizeTopic(topic, lang)
    res.json({
      ...locTopic,
      materials: localizeArray(topic.materials, lang, materialFields),
      quizzes: localizeArray(topic.quizzes, lang, quizFields),
      children: topic.children.map((child: any) => localizeTopic(child, lang)),
      parent: topic.parent ? localizeTopic(topic.parent, lang) : null,
    })
  } else {
    res.json(topic)
  }
})

export default router
