/**
 * Міграція Quiz/Question/Option JSON -> I18nKey
 * 
 * Цей скрипт:
 * 1. Читає всі квізи з titleJson
 * 2. Читає всі питання з textJson/explanationJson
 * 3. Читає всі опції з textJson
 * 4. Створює I18nKey записи (namespace: "quizzes")
 * 5. Оновлює відповідні поля *KeyId
 * 
 * Запуск: npx ts-node scripts/migrate-quizzes-i18n.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TranslationsJson = Record<string, string> | null

async function createI18nKey(
  namespace: string,
  key: string,
  description: string,
  translations: TranslationsJson,
  fallback: string
): Promise<string | null> {
  if (!translations || typeof translations !== 'object') {
    return null
  }
  
  // Check if key already exists
  const existingKey = await prisma.i18nKey.findUnique({
    where: { namespace_key: { namespace, key } }
  })
  
  if (existingKey) {
    console.log(`    ⚠️  Key exists: ${key}`)
    return existingKey.id
  }
  
  // Create I18nKey
  const i18nKey = await prisma.i18nKey.create({
    data: {
      key,
      namespace,
      description,
    }
  })
  
  // Create I18nValue for each language
  for (const [lang, value] of Object.entries(translations)) {
    if (value && ['UA', 'EN', 'PL'].includes(lang)) {
      await prisma.i18nValue.create({
        data: {
          keyId: i18nKey.id,
          lang: lang as 'UA' | 'EN' | 'PL',
          value,
        }
      })
    }
  }
  
  // Ensure EN value exists
  if (!translations['EN'] && fallback) {
    await prisma.i18nValue.create({
      data: {
        keyId: i18nKey.id,
        lang: 'EN',
        value: fallback,
      }
    })
  }
  
  return i18nKey.id
}

async function migrateQuizzes() {
  console.log('\n📋 Migrating Quizzes...')
  
  const quizzes = await prisma.quiz.findMany({
    where: { titleKeyId: null },
    select: {
      id: true,
      title: true,
      titleJson: true,
    }
  })
  
  let migrated = 0
  for (const quiz of quizzes) {
    if (!quiz.titleJson) continue
    
    console.log(`  📦 Quiz: ${quiz.title}`)
    
    const keyId = await createI18nKey(
      'quizzes',
      `quiz.${quiz.id}.title`,
      `Title for quiz: ${quiz.title}`,
      quiz.titleJson as TranslationsJson,
      quiz.title
    )
    
    if (keyId) {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: { titleKeyId: keyId }
      })
      migrated++
      console.log(`    ✅ Created title key`)
    }
  }
  
  return migrated
}

async function migrateQuestions() {
  console.log('\n❓ Migrating Questions...')
  
  const questions = await prisma.question.findMany({
    where: { textKeyId: null },
    select: {
      id: true,
      text: true,
      textJson: true,
      explanation: true,
      explanationJson: true,
      quiz: { select: { title: true } }
    }
  })
  
  let migratedText = 0
  let migratedExpl = 0
  
  for (const q of questions) {
    const shortText = q.text.substring(0, 40) + (q.text.length > 40 ? '...' : '')
    console.log(`  ❓ Q: ${shortText}`)
    
    // Migrate text
    if (q.textJson) {
      const keyId = await createI18nKey(
        'quizzes',
        `question.${q.id}.text`,
        `Question text: ${shortText}`,
        q.textJson as TranslationsJson,
        q.text
      )
      
      if (keyId) {
        await prisma.question.update({
          where: { id: q.id },
          data: { textKeyId: keyId }
        })
        migratedText++
        console.log(`    ✅ Created text key`)
      }
    }
    
    // Migrate explanation
    if (q.explanationJson) {
      const keyId = await createI18nKey(
        'quizzes',
        `question.${q.id}.explanation`,
        `Explanation for question: ${shortText}`,
        q.explanationJson as TranslationsJson,
        q.explanation || ''
      )
      
      if (keyId) {
        await prisma.question.update({
          where: { id: q.id },
          data: { explanationKeyId: keyId }
        })
        migratedExpl++
        console.log(`    ✅ Created explanation key`)
      }
    }
  }
  
  return { migratedText, migratedExpl }
}

async function migrateOptions() {
  console.log('\n🔘 Migrating Options...')
  
  const options = await prisma.option.findMany({
    where: { textKeyId: null },
    select: {
      id: true,
      text: true,
      textJson: true,
      question: { select: { text: true } }
    }
  })
  
  let migrated = 0
  
  for (const opt of options) {
    if (!opt.textJson) continue
    
    const shortText = opt.text.substring(0, 30) + (opt.text.length > 30 ? '...' : '')
    
    const keyId = await createI18nKey(
      'quizzes',
      `option.${opt.id}.text`,
      `Option: ${shortText}`,
      opt.textJson as TranslationsJson,
      opt.text
    )
    
    if (keyId) {
      await prisma.option.update({
        where: { id: opt.id },
        data: { textKeyId: keyId }
      })
      migrated++
    }
  }
  
  console.log(`  ✅ Migrated ${migrated} options`)
  return migrated
}

async function main() {
  console.log('🚀 Starting Quiz i18n migration...')
  
  const quizCount = await migrateQuizzes()
  const { migratedText, migratedExpl } = await migrateQuestions()
  const optionCount = await migrateOptions()
  
  // Update translation version
  await prisma.translationVersion.upsert({
    where: { namespace: 'quizzes' },
    update: { version: { increment: 1 } },
    create: { namespace: 'quizzes', version: 1 }
  })
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary:')
  console.log(`   Quizzes migrated:     ${quizCount}`)
  console.log(`   Question texts:       ${migratedText}`)
  console.log(`   Question explanations: ${migratedExpl}`)
  console.log(`   Options:              ${optionCount}`)
  console.log('='.repeat(50))
  console.log('\n✅ Migration complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
