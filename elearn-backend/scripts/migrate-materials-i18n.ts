/**
 * Міграція Material.titleJson/contentJson -> I18nKey + titleKeyId/contentKeyId
 * 
 * Цей скрипт:
 * 1. Читає всі матеріали з titleJson/contentJson
 * 2. Створює відповідні I18nKey записи (namespace: "materials")
 * 3. Створює I18nValue для кожної мови
 * 4. Оновлює Material.titleKeyId/contentKeyId
 * 
 * Запуск: npx ts-node scripts/migrate-materials-i18n.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TranslationsJson = Record<string, string> | null

async function migrateMaterial(material: {
  id: string
  title: string
  titleJson: TranslationsJson
  content: string | null
  contentJson: TranslationsJson
  topicId: string
}) {
  console.log(`\n📦 Processing material: ${material.title} (${material.id.slice(0, 8)}...)`)
  
  let titleKeyId: string | null = null
  let contentKeyId: string | null = null
  
  // Generate unique key based on material id
  const keyBase = `material.${material.id}`
  
  // Migrate titleJson -> titleKey
  if (material.titleJson && typeof material.titleJson === 'object') {
    const key = `${keyBase}.title`
    
    // Check if key already exists
    const existingKey = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace: 'materials', key } }
    })
    
    if (existingKey) {
      console.log(`  ⚠️  Title key already exists: ${key}`)
      titleKeyId = existingKey.id
    } else {
      // Create I18nKey
      const i18nKey = await prisma.i18nKey.create({
        data: {
          key,
          namespace: 'materials',
          description: `Title for material: ${material.title}`,
        }
      })
      titleKeyId = i18nKey.id
      console.log(`  ✅ Created title key: ${key}`)
      
      // Create I18nValue for each language
      const translations = material.titleJson as Record<string, string>
      for (const [lang, value] of Object.entries(translations)) {
        if (value && ['UA', 'EN', 'PL'].includes(lang)) {
          await prisma.i18nValue.create({
            data: {
              keyId: i18nKey.id,
              lang: lang as 'UA' | 'EN' | 'PL',
              value,
            }
          })
          console.log(`     📝 ${lang}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
        }
      }
      
      // Ensure EN value exists (use title as fallback)
      if (!translations['EN'] && material.title) {
        await prisma.i18nValue.create({
          data: {
            keyId: i18nKey.id,
            lang: 'EN',
            value: material.title,
          }
        })
        console.log(`     📝 EN (fallback): ${material.title}`)
      }
    }
  }
  
  // Migrate contentJson -> contentKey
  if (material.contentJson && typeof material.contentJson === 'object') {
    const key = `${keyBase}.content`
    
    const existingKey = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace: 'materials', key } }
    })
    
    if (existingKey) {
      console.log(`  ⚠️  Content key already exists: ${key}`)
      contentKeyId = existingKey.id
    } else {
      const i18nKey = await prisma.i18nKey.create({
        data: {
          key,
          namespace: 'materials',
          description: `Content for material: ${material.title}`,
        }
      })
      contentKeyId = i18nKey.id
      console.log(`  ✅ Created content key: ${key}`)
      
      const translations = material.contentJson as Record<string, string>
      for (const [lang, value] of Object.entries(translations)) {
        if (value && ['UA', 'EN', 'PL'].includes(lang)) {
          await prisma.i18nValue.create({
            data: {
              keyId: i18nKey.id,
              lang: lang as 'UA' | 'EN' | 'PL',
              value,
            }
          })
          console.log(`     📝 ${lang}: ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`)
        }
      }
      
      // Ensure EN value exists
      if (!translations['EN'] && material.content) {
        await prisma.i18nValue.create({
          data: {
            keyId: i18nKey.id,
            lang: 'EN',
            value: material.content,
          }
        })
        console.log(`     📝 EN (fallback): ${material.content.substring(0, 80)}...`)
      }
    }
  }
  
  // Update material with key references
  if (titleKeyId || contentKeyId) {
    await prisma.material.update({
      where: { id: material.id },
      data: {
        ...(titleKeyId ? { titleKeyId } : {}),
        ...(contentKeyId ? { contentKeyId } : {}),
      }
    })
    console.log(`  🔗 Updated material with key references`)
  }
}

async function main() {
  console.log('🚀 Starting Material i18n migration...\n')
  
  // Get all materials with JSON translations
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      title: true,
      titleJson: true,
      content: true,
      contentJson: true,
      topicId: true,
      titleKeyId: true, // Check if already migrated
    }
  })
  
  console.log(`Found ${materials.length} materials to process`)
  
  let migrated = 0
  let skipped = 0
  
  for (const material of materials) {
    // Skip if already has titleKeyId
    if (material.titleKeyId) {
      console.log(`⏭️  Skipping ${material.title} - already migrated`)
      skipped++
      continue
    }
    
    // Skip if no JSON translations
    if (!material.titleJson && !material.contentJson) {
      console.log(`⏭️  Skipping ${material.title} - no JSON translations`)
      skipped++
      continue
    }
    
    await migrateMaterial(material as any)
    migrated++
  }
  
  // Update translation version to invalidate caches
  await prisma.translationVersion.upsert({
    where: { namespace: 'materials' },
    update: { version: { increment: 1 } },
    create: { namespace: 'materials', version: 1 }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log(`   Migrated: ${migrated} materials`)
  console.log(`   Skipped:  ${skipped} materials`)
  console.log('='.repeat(50))
  console.log('\n✅ Migration complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
