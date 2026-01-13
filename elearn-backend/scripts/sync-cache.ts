/**
 * Sync i18n Cache Script
 * Populates titleCache and descCache fields in Topic model
 * from normalized I18nKey/I18nValue tables
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Lang = 'UA' | 'PL' | 'EN'

interface CacheObject {
  UA?: string
  PL?: string
  EN?: string
}

async function syncTopicCache() {
  console.log('🔄 Syncing topic i18n cache...')
  
  // Get all topics with their i18n keys
  const topics = await prisma.topic.findMany({
    include: {
      titleKey: {
        include: {
          values: true
        }
      },
      descKey: {
        include: {
          values: true
        }
      }
    }
  })
  
  let synced = 0
  
  for (const topic of topics) {
    const titleCache: CacheObject = {}
    const descCache: CacheObject = {}
    
    // Build title cache from normalized data
    if (topic.titleKey?.values) {
      for (const val of topic.titleKey.values) {
        titleCache[val.lang as Lang] = val.value
      }
    }
    
    // Fallback to legacy nameJson if no normalized data
    if (Object.keys(titleCache).length === 0 && topic.nameJson) {
      const nameJson = topic.nameJson as CacheObject
      if (nameJson.UA) titleCache.UA = nameJson.UA
      if (nameJson.PL) titleCache.PL = nameJson.PL
      if (nameJson.EN) titleCache.EN = nameJson.EN
    }
    
    // Always include fallback name as EN
    if (!titleCache.EN && topic.name) {
      titleCache.EN = topic.name
    }
    
    // Build desc cache from normalized data
    if (topic.descKey?.values) {
      for (const val of topic.descKey.values) {
        descCache[val.lang as Lang] = val.value
      }
    }
    
    // Fallback to legacy descJson
    if (Object.keys(descCache).length === 0 && topic.descJson) {
      const descJson = topic.descJson as CacheObject
      if (descJson.UA) descCache.UA = descJson.UA
      if (descJson.PL) descCache.PL = descJson.PL
      if (descJson.EN) descCache.EN = descJson.EN
    }
    
    // Always include fallback description as EN
    if (!descCache.EN && topic.description) {
      descCache.EN = topic.description
    }
    
    // Update topic with cache
    const updateData: any = {}
    if (Object.keys(titleCache).length > 0) updateData.titleCache = titleCache
    if (Object.keys(descCache).length > 0) updateData.descCache = descCache
    
    if (Object.keys(updateData).length > 0) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: updateData
      })
    }
    
    synced++
  }
  
  console.log(`✅ Synced ${synced} topics.`)
}

async function main() {
  try {
    await syncTopicCache()
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
