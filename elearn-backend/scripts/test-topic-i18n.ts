// Quick test to verify titleKey migration
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function test() {
  // Test that titleKey is populated
  const topic = await p.topic.findFirst({
    where: { titleKeyId: { not: null } },
    include: {
      titleKey: { include: { values: true } },
      descKey: { include: { values: true } }
    }
  })
  
  console.log('\n=== Topic i18n Test ===')
  console.log('Topic name:', topic?.name)
  console.log('TitleKey:', topic?.titleKey?.key)
  console.log('Values:')
  topic?.titleKey?.values?.forEach((v: { lang: string; value: string }) => {
    console.log(`  ${v.lang}: ${v.value}`)
  })
  
  // Count how many topics have titleKey
  const withKey = await p.topic.count({ where: { titleKeyId: { not: null } } })
  const total = await p.topic.count()
  console.log(`\n✅ ${withKey}/${total} topics migrated to i18n keys`)
}

test().finally(() => p.$disconnect())
