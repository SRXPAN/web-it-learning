/**
 * Міграція Topic.nameJson -> I18nKey + titleKeyId
 * 
 * Цей скрипт:
 * 1. Читає всі теми з nameJson/descJson
 * 2. Створює відповідні I18nKey записи (namespace: "topics")
 * 3. Створює I18nValue для кожної мови
 * 4. Оновлює Topic.titleKeyId/descKeyId
 * 
 * Запуск: npx ts-node scripts/migrate-topics-i18n.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TranslationsJson = Record<string, string> | null

async function migrateTopic(topic: {
  id: string
  slug: string
  name: string
  nameJson: TranslationsJson
  description: string | null
  descJson: TranslationsJson
}) {
  console.log(`\n📦 Processing topic: ${topic.name} (${topic.slug})`)
  
  let titleKeyId: string | null = null
  let descKeyId: string | null = null
  
  // Migrate nameJson -> titleKey
  if (topic.nameJson && typeof topic.nameJson === 'object') {
    const key = `topic.${topic.slug}.title`
    
    // Check if key already exists
    const existingKey = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace: 'topics', key } }
    })
    
    if (existingKey) {
      console.log(`  ⚠️  Title key already exists: ${key}`)
      titleKeyId = existingKey.id
    } else {
      // Create I18nKey
      const i18nKey = await prisma.i18nKey.create({
        data: {
          key,
          namespace: 'topics',
          description: `Title for topic: ${topic.name}`,
        }
      })
      titleKeyId = i18nKey.id
      console.log(`  ✅ Created title key: ${key}`)
      
      // Create I18nValue for each language
      const translations = topic.nameJson as Record<string, string>
      for (const [lang, value] of Object.entries(translations)) {
        if (value && ['UA', 'EN', 'PL'].includes(lang)) {
          await prisma.i18nValue.create({
            data: {
              keyId: i18nKey.id,
              lang,
              value,
            }
          })
          console.log(`     📝 ${lang}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
        }
      }
      
      // Ensure EN value exists (use name as fallback)
      if (!translations['EN'] && topic.name) {
        await prisma.i18nValue.create({
          data: {
            keyId: i18nKey.id,
            lang: 'EN',
            value: topic.name,
          }
        })
        console.log(`     📝 EN (fallback): ${topic.name}`)
      }
    }
  }
  
  // Migrate descJson -> descKey
  if (topic.descJson && typeof topic.descJson === 'object') {
    const key = `topic.${topic.slug}.description`
    
    const existingKey = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace: 'topics', key } }
    })
    
    if (existingKey) {
      console.log(`  ⚠️  Description key already exists: ${key}`)
      descKeyId = existingKey.id
    } else {
      const i18nKey = await prisma.i18nKey.create({
        data: {
          key,
          namespace: 'topics',
          description: `Description for topic: ${topic.name}`,
        }
      })
      descKeyId = i18nKey.id
      console.log(`  ✅ Created description key: ${key}`)
      
      const translations = topic.descJson as Record<string, string>
      for (const [lang, value] of Object.entries(translations)) {
        if (value && ['UA', 'EN', 'PL'].includes(lang)) {
          await prisma.i18nValue.create({
            data: {
              keyId: i18nKey.id,
              lang,
              value,
            }
          })
          console.log(`     📝 ${lang}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
        }
      }
      
      // Ensure EN value exists
      if (!translations['EN'] && topic.description) {
        await prisma.i18nValue.create({
          data: {
            keyId: i18nKey.id,
            lang: 'EN',
            value: topic.description,
          }
        })
        console.log(`     📝 EN (fallback): ${topic.description.substring(0, 50)}...`)
      }
    }
  }
  
  // Update topic with key references
  if (titleKeyId || descKeyId) {
    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        ...(titleKeyId ? { titleKeyId } : {}),
        ...(descKeyId ? { descKeyId } : {}),
      }
    })
    console.log(`  🔗 Updated topic with key references`)
  }
}

async function main() {
  console.log('🚀 Starting Topic i18n migration...\n')
  
  // Get all topics with JSON translations
  const topics = await prisma.topic.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      nameJson: true,
      description: true,
      descJson: true,
      titleKeyId: true, // Check if already migrated
    }
  })
  
  console.log(`Found ${topics.length} topics to process`)
  
  let migrated = 0
  let skipped = 0
  
  for (const topic of topics) {
    // Skip if already has titleKeyId
    if (topic.titleKeyId) {
      console.log(`⏭️  Skipping ${topic.name} - already migrated`)
      skipped++
      continue
    }
    
    // Skip if no JSON translations
    if (!topic.nameJson && !topic.descJson) {
      console.log(`⏭️  Skipping ${topic.name} - no JSON translations`)
      skipped++
      continue
    }
    
    await migrateTopic(topic as any)
    migrated++
  }
  
  // Update translation version to invalidate caches
  await prisma.translationVersion.upsert({
    where: { id: 'global' },
    update: { version: { increment: 1 } },
    create: { id: 'global', version: 1 }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log(`   Migrated: ${migrated} topics`)
  console.log(`   Skipped:  ${skipped} topics`)
  console.log('='.repeat(50))
  console.log('\n✅ Migration complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
