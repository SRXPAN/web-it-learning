// src/services/translation.service.ts
/**
 * Translation Service
 * 
 * Handles syncing between normalized translation tables (I18nKey/I18nValue)
 * and denormalized cache fields (titleCache, descCache, contentCache, urlCache)
 * 
 * This ensures consistency between source-of-truth and read-optimized caches.
 */

import { prisma } from '../db.js'
import { logger } from '../utils/logger.js'
import type { Lang } from '@elearn/shared'

/**
 * Updates a Topic's translation and syncs cache
 */
export async function updateTopicTranslation(
  topicId: string,
  lang: Lang,
  field: 'title' | 'description',
  value: string,
  keyId?: string
) {
  try {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } })
    if (!topic) throw new Error('Topic not found')

    // Build cache update object
    const cacheField = field === 'title' ? 'titleCache' : 'descCache'
    const oldCache = (topic[cacheField as keyof typeof topic] || {}) as Record<string, string>
    const newCache = { ...oldCache, [lang]: value }

    // Update Topic with new cache
    await prisma.topic.update({
      where: { id: topicId },
      data: {
        [cacheField]: newCache,
      },
    })

    // Also update I18nKey/I18nValue if keyId provided
    if (keyId) {
      await prisma.i18nValue.upsert({
        where: { keyId_lang: { keyId, lang } },
        update: { value },
        create: { keyId, lang, value },
      })
    }

    logger.info('Topic translation updated', { topicId, field, lang })
  } catch (error) {
    logger.error('Failed to update topic translation:', error as Error)
    throw error
  }
}

/**
 * Updates a Material's translation and syncs cache
 */
export async function updateMaterialTranslation(
  materialId: string,
  lang: Lang,
  field: 'title' | 'content' | 'url',
  value: string,
  keyId?: string
) {
  try {
    const material = await prisma.material.findUnique({ where: { id: materialId } })
    if (!material) throw new Error('Material not found')

    // Map field to cache field name
    const cacheFieldMap = {
      title: 'titleCache',
      content: 'contentCache',
      url: 'urlCache',
    } as const

    const cacheField = cacheFieldMap[field]
    const oldCache = (material[cacheField as keyof typeof material] || {}) as Record<string, string>
    const newCache = { ...oldCache, [lang]: value }

    // Update Material with new cache
    await prisma.material.update({
      where: { id: materialId },
      data: {
        [cacheField]: newCache,
      },
    })

    // Also update I18nKey/I18nValue if keyId provided
    if (keyId) {
      await prisma.i18nValue.upsert({
        where: { keyId_lang: { keyId, lang } },
        update: { value },
        create: { keyId, lang, value },
      })
    }

    logger.info('Material translation updated', { materialId, field, lang })
  } catch (error) {
    logger.error('Failed to update material translation:', error as Error)
    throw error
  }
}

/**
 * Updates a Quiz's translation and syncs cache
 */
export async function updateQuizTranslation(
  quizId: string,
  lang: Lang,
  value: string,
  keyId?: string
) {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) throw new Error('Quiz not found')

    // Quiz uses titleCache
    const oldCache = (quiz.title || {}) as Record<string, string>
    const newCache = { ...oldCache, [lang]: value }

    await prisma.quiz.update({
      where: { id: quizId },
      data: { title: newCache } as any,
    })

    if (keyId) {
      await prisma.i18nValue.upsert({
        where: { keyId_lang: { keyId, lang } },
        update: { value },
        create: { keyId, lang, value },
      })
    }

    logger.info('Quiz translation updated', { quizId, lang })
  } catch (error) {
    logger.error('Failed to update quiz translation:', error as Error)
    throw error
  }
}

/**
 * Bulk sync all caches from I18nKey/I18nValue tables
 * 
 * This should be run:
 * - On app startup (if caches are empty)
 * - After migrations
 * - As a maintenance task
 */
export async function syncAllTranslationCaches() {
  try {
    logger.info('Starting bulk translation cache sync...')

    // Get all topics with their i18nKeys
    const topics = await prisma.topic.findMany({
      include: {
        titleKey: { include: { values: true } },
        descKey: { include: { values: true } },
      },
    })

    for (const topic of topics) {
      const titleCache: Record<string, string> = {}
      const descCache: Record<string, string> = {}

      // Build title cache from i18nValues
      if (topic.titleKey?.values) {
        for (const val of topic.titleKey.values) {
          titleCache[val.lang] = val.value
        }
      }

      // Build desc cache from i18nValues
      if (topic.descKey?.values) {
        for (const val of topic.descKey.values) {
          descCache[val.lang] = val.value
        }
      }

      // Update caches
      if (Object.keys(titleCache).length > 0 || Object.keys(descCache).length > 0) {
        await prisma.topic.update({
          where: { id: topic.id },
          data: {
            ...(Object.keys(titleCache).length > 0 && { titleCache }),
            ...(Object.keys(descCache).length > 0 && { descCache }),
          },
        })
      }
    }

    logger.info('Topic translation cache sync complete')

    // Sync Materials
    const materials = await prisma.material.findMany({
      include: {
        titleKey: { include: { values: true } },
        contentKey: { include: { values: true } },
      },
    })

    for (const material of materials) {
      const titleCache: Record<string, string> = {}
      const contentCache: Record<string, string> = {}

      if (material.titleKey?.values) {
        for (const val of material.titleKey.values) {
          titleCache[val.lang] = val.value
        }
      }

      if (material.contentKey?.values) {
        for (const val of material.contentKey.values) {
          contentCache[val.lang] = val.value
        }
      }

      if (Object.keys(titleCache).length > 0 || Object.keys(contentCache).length > 0) {
        await prisma.material.update({
          where: { id: material.id },
          data: {
            ...(Object.keys(titleCache).length > 0 && { titleCache }),
            ...(Object.keys(contentCache).length > 0 && { contentCache }),
          } as any,
        })
      }
    }

    logger.info('Material translation cache sync complete')

    // Sync Quizzes
    const quizzes = await prisma.quiz.findMany({
      include: {
        titleKey: { include: { values: true } },
      },
    })

    for (const quiz of quizzes) {
      const titleCache: Record<string, string> = {}

      if (quiz.titleKey?.values) {
        for (const val of quiz.titleKey.values) {
          titleCache[val.lang] = val.value
        }
      }

      if (Object.keys(titleCache).length > 0) {
        await prisma.quiz.update({
          where: { id: quiz.id },
          data: { titleCache } as any,
        })
      }
    }

    logger.info('Quiz translation cache sync complete')
    logger.info('All translation caches synced successfully')
  } catch (error) {
    logger.error('Failed to sync translation caches:', error as Error)
    throw error
  }
}

/**
 * Batch update material translations and caches
 * 
 * Accepts object like:
 * {
 *   titleUA: "Назва", titleEN: "Title",
 *   contentUA: "Контент", contentEN: "Content",
 *   urlUA: "s3://file_ua.pdf", urlEN: "s3://file_en.pdf"
 * }
 */
export async function updateMaterialMultiLang(
  materialId: string,
  translations: Record<string, string>
) {
  try {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
    })
    if (!material) throw new Error('Material not found')

    // Build cache objects from flat key-value pairs
    // Keys format: titleUA, titleEN, contentUA, contentEN, urlUA, urlEN
    const titleCache: Record<string, string> = {}
    const contentCache: Record<string, string> = {}
    const urlCache: Record<string, string> = {}

    for (const [key, value] of Object.entries(translations)) {
      if (key.startsWith('title')) {
        const lang = key.replace('title', '') as Lang
        if (['UA', 'EN', 'PL'].includes(lang)) {
          titleCache[lang] = value
        }
      } else if (key.startsWith('content')) {
        const lang = key.replace('content', '') as Lang
        if (['UA', 'EN', 'PL'].includes(lang)) {
          contentCache[lang] = value
        }
      } else if (key.startsWith('url')) {
        const lang = key.replace('url', '') as Lang
        if (['UA', 'EN', 'PL'].includes(lang)) {
          urlCache[lang] = value
        }
      }
    }

    // Update material with all caches
    await prisma.material.update({
      where: { id: materialId },
      data: {
        ...(Object.keys(titleCache).length > 0 && { titleCache }),
        ...(Object.keys(contentCache).length > 0 && { contentCache }),
        ...(Object.keys(urlCache).length > 0 && { urlCache }),
      } as any,
    })

    logger.info('Material multi-language translations updated', { materialId })
  } catch (error) {
    logger.error('Failed to update material multi-language translations:', error as Error)
    throw error
  }
}
