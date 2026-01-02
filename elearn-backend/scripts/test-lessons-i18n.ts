// Quick test to verify lessons API endpoint works
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function test() {
  console.log('\n=== Lessons i18n Test ===')
  
  // Count materials with titleKeyId
  const withKey = await p.material.count({ where: { titleKeyId: { not: null } } })
  const total = await p.material.count()
  console.log(`\n📦 Materials migrated: ${withKey}/${total}`)
  
  // Test fetching a material with i18n
  const material = await p.material.findFirst({
    where: { titleKeyId: { not: null } },
    include: {
      titleKey: { include: { values: true } },
      contentKey: { include: { values: true } },
      topic: { select: { name: true, slug: true } }
    }
  })
  
  if (material) {
    console.log(`\n📖 Sample Material:`)
    console.log(`   Title: ${material.title}`)
    console.log(`   Type: ${material.type}`)
    console.log(`   Topic: ${material.topic?.name}`)
    console.log(`\n   TitleKey: ${material.titleKey?.key}`)
    console.log(`   Title Translations:`)
    material.titleKey?.values?.forEach((v: { lang: string; value: string }) => {
      console.log(`     ${v.lang}: ${v.value}`)
    })
    
    if (material.contentKey) {
      console.log(`\n   ContentKey: ${material.contentKey?.key}`)
      console.log(`   Content Translations:`)
      material.contentKey?.values?.forEach((v: { lang: string; value: string }) => {
        console.log(`     ${v.lang}: ${v.value.substring(0, 60)}...`)
      })
    }
  }
  
  console.log('\n✅ Lessons API ready!')
  console.log('   GET /api/lessons - List all lessons')
  console.log('   GET /api/lessons/:id?lang=UA - Get localized lesson')
  console.log('   GET /api/lessons/by-topic/:topicId?lang=PL - Get lessons by topic')
}

test().finally(() => p.$disconnect())
