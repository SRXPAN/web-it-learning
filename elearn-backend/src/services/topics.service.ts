// src/services/topics.service.ts
import { prisma } from '../db.js'
import type { Category, Status } from '@elearn/shared'

interface TopicQueryParams {
  page: number
  limit: number
  category?: Category
  lang: string
  isStaff: boolean
}

/**
 * Helper to get localized text from JSON cache
 */
function getLocalizedText(cache: any, lang: string, fallback: string): string {
  if (cache && typeof cache === 'object' && !Array.isArray(cache)) {
    if (cache[lang]) return cache[lang]
    if (cache['EN']) return cache['EN']
  }
  return fallback
}

/**
 * Get paginated topics list with localization
 */
export async function getTopics(params: TopicQueryParams) {
  const { page, limit, category, lang, isStaff } = params
  
  const whereClause = {
    parentId: null,
    ...(category ? { category: category as any } : {}),
    ...(isStaff ? {} : { status: 'Published' as const }),
  }

  const total = await prisma.topic.count({ where: whereClause })

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
      name: true, 
      description: true,
      titleCache: true,
      descCache: true,
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

  // Map and localize
  const mappedTopics = topics.map(t => ({
    id: t.id,
    slug: t.slug,
    category: t.category,
    parentId: t.parentId,
    status: t.status,
    name: getLocalizedText(t.titleCache, lang, t.name),
    description: getLocalizedText(t.descCache, lang, t.description),
    children: t.children.map(child => ({
      ...child,
      name: getLocalizedText(child.titleCache, lang, child.name),
      description: getLocalizedText(child.descCache, lang, child.description),
      materials: child.materials.map(m => ({
        ...m,
        title: getLocalizedText(m.titleCache, lang, m.title)
      })),
      quizzes: child.quizzes.map(q => ({
        ...q,
        title: getLocalizedText(q.titleCache, lang, q.title)
      }))
    })),
    materials: t.materials.map(m => ({
      ...m,
      title: getLocalizedText(m.titleCache, lang, m.title)
    })),
    quizzes: t.quizzes.map(q => ({
      ...q,
      title: getLocalizedText(q.titleCache, lang, q.title)
    }))
  }))

  return {
    topics: mappedTopics,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
}

/**
 * Get single topic by ID or slug with localization
 */
export async function getTopicByIdOrSlug(
  idOrSlug: string, 
  lang: string,
  isStaff: boolean
) {
  const topic = await prisma.topic.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(isStaff ? {} : { status: 'Published' as const })
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      parentId: true,
      status: true,
      titleCache: true,
      descCache: true,
      children: {
        where: isStaff ? {} : { status: 'Published' as const },
        select: {
          id: true,
          slug: true,
          name: true,
          titleCache: true
        }
      },
      materials: {
        where: isStaff ? {} : { status: 'Published' as const },
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          content: true,
          titleCache: true,
          urlCache: true,
          contentCache: true
        }
      },
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

  if (!topic) return null

  return {
    ...topic,
    name: getLocalizedText(topic.titleCache, lang, topic.name),
    description: getLocalizedText(topic.descCache, lang, topic.description),
    children: topic.children.map(c => ({
      ...c,
      name: getLocalizedText(c.titleCache, lang, c.name)
    })),
    materials: topic.materials.map(m => ({
      ...m,
      title: getLocalizedText(m.titleCache, lang, m.title),
      url: getLocalizedText(m.urlCache, lang, m.url || ''),
      content: getLocalizedText(m.contentCache, lang, m.content || '')
    })),
    quizzes: topic.quizzes.map(q => ({
      ...q,
      title: getLocalizedText(q.titleCache, lang, q.title)
    }))
  }
}
