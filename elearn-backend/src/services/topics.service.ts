// src/services/topics.service.ts
import { prisma } from '../db.js'
import type { Category } from '@elearn/shared'

interface TopicQueryParams {
  page: number
  limit: number
  category?: Category
  lang: string
  isStaff: boolean
  search?: string // <--- Added search param
  userId?: string // <--- Added userId for checking if material is viewed
}

/**
 * Helper to get localized text from JSON field
 */
function getLocalizedText(jsonField: any, lang: string, fallback: string): string {
  if (jsonField && typeof jsonField === 'object' && !Array.isArray(jsonField)) {
    if (jsonField[lang]) return jsonField[lang]
    if (jsonField['EN']) return jsonField['EN']
  }
  return fallback
}

/**
 * Get paginated topics list with localization
 */
export async function getTopics(params: TopicQueryParams) {
  const { page, limit, category, lang, isStaff, search, userId } = params
  
  const whereClause: any = {
    parentId: null,
    ...(category ? { category: category as any } : {}),
    ...(isStaff ? {} : { status: 'Published' }),
  }

  // Implementation of Search Logic
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      // Optional: search in localized JSON too (Postgres JSONB support required for efficiency)
    ]
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
      nameJson: true, // FIXED: was titleCache
      descJson: true, // FIXED: was descCache
      children: {
        where: isStaff ? {} : { status: 'Published' },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          nameJson: true, // FIXED
          descJson: true, // FIXED
          status: true,
          parentId: true,
          category: true,
          materials: {
            where: {
              ...(isStaff ? {} : { status: 'Published' }),
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              type: true,
              url: true,
              content: true,
              lang: true,
              titleJson: true, // FIXED
              contentJson: true, // FIXED
              status: true
            } as any
          },
          quizzes: {
            where: {
              ...(isStaff ? {} : { status: 'Published' }),
              deletedAt: null,
            },
            select: {
              id: true,
              title: true,
              durationSec: true,
              titleJson: true // FIXED
            }
          }
        }
      },
      materials: {
        where: {
          ...(isStaff ? {} : { status: 'Published' }),
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          content: true,
          lang: true,
          titleJson: true, // FIXED
          contentJson: true, // FIXED
          status: true
        } as any
      },
      quizzes: {
        where: {
          ...(isStaff ? {} : { status: 'Published' }),
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          durationSec: true,
          titleJson: true // FIXED
        }
      }
    }
  })

  // Get viewed materials for current user (if logged in)
  const viewedMaterials = userId 
    ? (await prisma.materialView.findMany({
        where: { userId },
        select: { materialId: true }
      })).map(v => v.materialId)
    : []

  // Map and localize
  const mappedTopics = topics.map(t => ({
    id: t.id,
    slug: t.slug,
    category: t.category,
    parentId: t.parentId,
    status: t.status,
    name: getLocalizedText(t.nameJson, lang, t.name),
    description: getLocalizedText(t.descJson, lang, t.description),
    children: t.children.map(child => ({
      ...child,
      name: getLocalizedText(child.nameJson, lang, child.name),
      description: getLocalizedText(child.descJson, lang, child.description),
      materials: child.materials.map(m => ({
        ...m,
        title: getLocalizedText(m.titleJson, lang, m.title),
        isSeen: viewedMaterials.includes(m.id)
      })),
      quizzes: child.quizzes.map(q => ({
        ...q,
        title: getLocalizedText(q.titleJson, lang, q.title)
      }))
    })),
    materials: t.materials.map(m => ({
      ...m,
      title: getLocalizedText(m.titleJson, lang, m.title),
      isSeen: viewedMaterials.includes(m.id)
    })),
    quizzes: t.quizzes.map(q => ({
      ...q,
      title: getLocalizedText(q.titleJson, lang, q.title)
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
  isStaff: boolean,
  userId?: string
) {
  const topic = await prisma.topic.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      ...(isStaff ? {} : { status: 'Published' })
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      parentId: true,
      status: true,
      nameJson: true, // FIXED
      descJson: true, // FIXED
      children: {
        where: isStaff ? {} : { status: 'Published' },
        select: {
          id: true,
          slug: true,
          name: true,
          nameJson: true // FIXED
        }
      },
      materials: {
        where: {
          ...(isStaff ? {} : { status: 'Published' }),
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          type: true,
          url: true,
          content: true,
          titleJson: true, // FIXED
          contentJson: true // FIXED
        } as any
      },
      quizzes: {
        where: {
          ...(isStaff ? {} : { status: 'Published' }),
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          durationSec: true,
          titleJson: true // FIXED
        }
      }
    }
  })

  if (!topic) return null

  // Get viewed materials for current user (if logged in)
  const viewedMaterials = userId 
    ? (await prisma.materialView.findMany({
        where: { userId },
        select: { materialId: true }
      })).map(v => v.materialId)
    : []

  return {
    ...topic,
    name: getLocalizedText(topic.nameJson, lang, topic.name),
    description: getLocalizedText(topic.descJson, lang, topic.description),
    children: topic.children.map(c => ({
      ...c,
      name: getLocalizedText(c.nameJson, lang, c.name)
    })),
    materials: topic.materials.map(m => ({
      ...m,
      title: getLocalizedText(m.titleJson, lang, m.title),
      url: getLocalizedText(m.urlJson, lang, m.url || ''),
      content: getLocalizedText(m.contentJson, lang, m.content || ''),
      isSeen: viewedMaterials.includes(m.id)
    })),
    quizzes: topic.quizzes.map(q => ({
      ...q,
      title: getLocalizedText(q.titleJson, lang, q.title)
    }))
  }
}