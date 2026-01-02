// Quick script to add remaining keys
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const keys = [
    { key: 'app.name', translations: { UA: 'E-Learning', PL: 'E-Learning', EN: 'E-Learning' } },
    { key: 'profile.name', translations: { UA: 'Ім\'я', PL: 'Imię', EN: 'Name' } },
  ]

  for (const k of keys) {
    await prisma.uiTranslation.upsert({
      where: { key: k.key },
      update: k,
      create: k
    })
    console.log(`✓ ${k.key}`)
  }
  
  const count = await prisma.uiTranslation.count()
  console.log(`\n✅ Total translations: ${count}`)
}

main().finally(() => prisma.$disconnect())
