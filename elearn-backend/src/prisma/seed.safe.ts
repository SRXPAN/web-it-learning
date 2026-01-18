import { PrismaClient, Category } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const prisma = new PrismaClient()

/**
 * Рекурсивна функція для імпорту тем з JSON
 * КРИТИЧНО: Зберігає всі мультимовні JSON поля
 */
async function importTopic(topicData: any, parentId: string | null = null) {
  const { children, materials, quizzes, id, createdById, createdBy, updatedAt, createdAt, ...topicFields } = topicData

  console.log(`📌 Processing topic: ${topicFields.slug}`)

  // 1. Створюємо або оновлюємо Тему
  const createdTopic = await prisma.topic.upsert({
    where: { slug: topicFields.slug },
    update: {
      name: topicFields.name,
      nameJson: topicFields.nameJson || null,
      description: topicFields.description || '',
      descJson: topicFields.descJson || null,
      category: topicFields.category,
      status: topicFields.status || 'Published',
      publishedAt: topicFields.status === 'Published' ? new Date() : null,
      parentId,
    },
    create: {
      ...(id ? { id } : {}),
      slug: topicFields.slug,
      name: topicFields.name,
      nameJson: topicFields.nameJson || null,
      description: topicFields.description || '',
      descJson: topicFields.descJson || null,
      category: topicFields.category,
      status: topicFields.status || 'Published',
      publishedAt: topicFields.status === 'Published' ? new Date() : null,
      parentId,
    },
  })

  // 2. Імпортуємо Матеріали
  if (materials && materials.length > 0) {
    for (const mat of materials) {
      const { id: matId, topicId, createdById, createdBy, file, fileId, createdAt, updatedAt, deletedAt, ...matData } = mat

      try {
        // Якщо є валідний ID - використовуємо його, інакше створюємо новий
        if (matId && matId.length > 10) {
          await prisma.material.upsert({
            where: { id: matId },
            update: {
              title: matData.title,
              titleJson: matData.titleJson || null,
              titleCache: matData.titleCache || null,
              type: matData.type,
              url: matData.url || null,
              urlCache: matData.urlCache || null,
              content: matData.content || null,
              contentJson: matData.contentJson || null,
              contentCache: matData.contentCache || null,
              lang: matData.lang || 'EN',
              status: matData.status || 'Published',
              publishedAt: matData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
            create: {
              id: matId,
              title: matData.title,
              titleJson: matData.titleJson || null,
              titleCache: matData.titleCache || null,
              type: matData.type,
              url: matData.url || null,
              urlCache: matData.urlCache || null,
              content: matData.content || null,
              contentJson: matData.contentJson || null,
              contentCache: matData.contentCache || null,
              lang: matData.lang || 'EN',
              status: matData.status || 'Published',
              publishedAt: matData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
          })
        } else {
          // Створюємо новий без збереження старого ID
          await prisma.material.create({
            data: {
              title: matData.title,
              titleJson: matData.titleJson || null,
              titleCache: matData.titleCache || null,
              type: matData.type,
              url: matData.url || null,
              urlCache: matData.urlCache || null,
              content: matData.content || null,
              contentJson: matData.contentJson || null,
              contentCache: matData.contentCache || null,
              lang: matData.lang || 'EN',
              status: matData.status || 'Published',
              publishedAt: matData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
          })
        }
      } catch (err: any) {
        console.warn(`⚠️  Skipped material ${mat.title}: ${err.message}`)
      }
    }
  }

  // 3. Імпортуємо Квізи
  if (quizzes && quizzes.length > 0) {
    for (const quiz of quizzes) {
      const { id: quizId, topicId, questions, createdById, createdBy, createdAt, updatedAt, deletedAt, attempts, ...quizData } = quiz

      try {
        let createdQuiz

        if (quizId && quizId.length > 10) {
          createdQuiz = await prisma.quiz.upsert({
            where: { id: quizId },
            update: {
              title: quizData.title,
              titleJson: quizData.titleJson || null,
              titleCache: quizData.titleCache || null,
              durationSec: quizData.durationSec || 120,
              status: quizData.status || 'Published',
              publishedAt: quizData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
            create: {
              id: quizId,
              title: quizData.title,
              titleJson: quizData.titleJson || null,
              titleCache: quizData.titleCache || null,
              durationSec: quizData.durationSec || 120,
              status: quizData.status || 'Published',
              publishedAt: quizData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
          })
        } else {
          createdQuiz = await prisma.quiz.create({
            data: {
              title: quizData.title,
              titleJson: quizData.titleJson || null,
              titleCache: quizData.titleCache || null,
              durationSec: quizData.durationSec || 120,
              status: quizData.status || 'Published',
              publishedAt: quizData.status === 'Published' ? new Date() : null,
              topicId: createdTopic.id,
            },
          })
        }

        // Імпортуємо Питання
        if (questions && questions.length > 0) {
          for (const q of questions) {
            const { id: qId, quizId: oldQuizId, options, answers, createdAt, updatedAt, ...qData } = q

            try {
              let createdQuestion

              if (qId && qId.length > 10) {
                createdQuestion = await prisma.question.upsert({
                  where: { id: qId },
                  update: {
                    text: qData.text,
                    textJson: qData.textJson || null,
                    explanation: qData.explanation || null,
                    explanationJson: qData.explanationJson || null,
                    tags: qData.tags || [],
                    difficulty: qData.difficulty || 'Easy',
                    quizId: createdQuiz.id,
                  },
                  create: {
                    id: qId,
                    text: qData.text,
                    textJson: qData.textJson || null,
                    explanation: qData.explanation || null,
                    explanationJson: qData.explanationJson || null,
                    tags: qData.tags || [],
                    difficulty: qData.difficulty || 'Easy',
                    quizId: createdQuiz.id,
                  },
                })
              } else {
                createdQuestion = await prisma.question.create({
                  data: {
                    text: qData.text,
                    textJson: qData.textJson || null,
                    explanation: qData.explanation || null,
                    explanationJson: qData.explanationJson || null,
                    tags: qData.tags || [],
                    difficulty: qData.difficulty || 'Easy',
                    quizId: createdQuiz.id,
                  },
                })
              }

              // Імпортуємо Опції (видаляємо старі, створюємо нові з textJson)
              if (options && options.length > 0) {
                await prisma.option.deleteMany({ where: { questionId: createdQuestion.id } })
                await prisma.option.createMany({
                  data: options.map((o: any) => ({
                    text: o.text,
                    textJson: o.textJson || null, // КРИТИЧНО: зберігаємо textJson
                    correct: o.correct || false,
                    questionId: createdQuestion.id,
                  })),
                })
              }
            } catch (err: any) {
              console.warn(`⚠️  Skipped question: ${err.message}`)
            }
          }
        }
      } catch (err: any) {
        console.warn(`⚠️  Skipped quiz ${quiz.title}: ${err.message}`)
      }
    }
  }

  // 4. РЕКУРСІЯ: Імпортуємо дочірні теми
  if (children && children.length > 0) {
    for (const child of children) {
      await importTopic(child, createdTopic.id)
    }
  }
}

async function main() {
  console.log('🌱 Starting SEED...')

  // ===== 1. ADMIN USER =====
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@elearn.local' },
    update: {},
    create: {
      email: 'admin@elearn.local',
      name: 'Admin',
      password: hash,
      role: 'ADMIN'
    }
  })
  console.log('✅ Admin user ready')

  // ===== 2. STATIC DATA (Translations, Categories, Goals) =====
  // Це дані, які потрібні для роботи інтерфейсу, тому ми лишаємо їх тут
  
  console.log('🌐 Seeding translations & config...')
  
  const categoryTranslations: { category: Category; translations: { UA: string; PL: string; EN: string } }[] = [
    { category: 'Programming', translations: { UA: 'Програмування', PL: 'Programowanie', EN: 'Programming' } },
    { category: 'Mathematics', translations: { UA: 'Математика', PL: 'Matematyka', EN: 'Mathematics' } },
    { category: 'Databases', translations: { UA: 'Бази даних', PL: 'Bazy danych', EN: 'Databases' } },
    { category: 'Networks', translations: { UA: 'Мережі', PL: 'Sieci', EN: 'Networks' } },
    { category: 'WebDevelopment', translations: { UA: 'Веб-розробка', PL: 'Tworzenie stron', EN: 'Web Development' } },
    { category: 'MobileDevelopment', translations: { UA: 'Мобільна розробка', PL: 'Rozwój mobilny', EN: 'Mobile Development' } },
    { category: 'MachineLearning', translations: { UA: 'Машинне навчання', PL: 'Uczenie maszynowe', EN: 'Machine Learning' } },
    { category: 'Security', translations: { UA: 'Кібербезпека', PL: 'Cyberbezpieczeństwo', EN: 'Cybersecurity' } },
    { category: 'DevOps', translations: { UA: 'DevOps', PL: 'DevOps', EN: 'DevOps' } },
    { category: 'OperatingSystems', translations: { UA: 'Операційні системи', PL: 'Systemy operacyjne', EN: 'Operating Systems' } },
  ]
  for (const cat of categoryTranslations) {
    const exists = await prisma.categoryTranslation.findFirst({ where: { category: cat.category } })
    if (!exists) await prisma.categoryTranslation.create({ data: cat })
  }

  // Goals
  const existingGoals = await prisma.dailyGoalTemplate.count()
  if (existingGoals === 0) {
    await prisma.dailyGoalTemplate.createMany({
      data: [
        { category: 'quiz', weight: 1, translations: { UA: 'Пройти 1 квіз', PL: 'Zrób 1 quiz', EN: 'Complete 1 quiz' } },
        { category: 'materials', weight: 1, translations: { UA: 'Переглянути 3 матеріали', PL: 'Obejrzyj 3 materiały', EN: 'View 3 materials' } },
        // ... (можеш додати інші за бажанням)
      ]
    })
  }

  // UI Translations
  const existingUi = await prisma.uiTranslation.count()
  if (existingUi === 0) {
    const uiKeys = [
      { key: 'common.save', translations: { UA: 'Зберегти', PL: 'Zapisz', EN: 'Save' } },
      { key: 'auth.login', translations: { UA: 'Вхід', PL: 'Logowanie', EN: 'Login' } },
      // ... (основні ключі)
    ]
    await prisma.uiTranslation.createMany({ data: uiKeys })
  }
  
  console.log('✅ Static config ready')

  // ===== 3. DYNAMIC CONTENT (Topics from JSON) =====
  const contentPath = path.join(__dirname, 'data', 'content.json')
  
  try {
    await fs.access(contentPath)
    const rawData = await fs.readFile(contentPath, 'utf-8')
    const topics = JSON.parse(rawData)
    
    console.log(`📂 Importing ${topics.length} root topics from JSON...`)
    for (const topic of topics) {
      await importTopic(topic)
    }
    console.log('🚀 Content imported!')

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('⚠️ No content.json found. Skipping content import.')
    } else {
      console.error('❌ Error importing content:', error)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())