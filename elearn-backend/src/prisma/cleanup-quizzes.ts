import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateQuizzes() {
  console.log('🔍 Шукаємо дублікати квізів...\n')

  // Отримуємо всі квізи
  const allQuizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: 'asc' }, // Найстаріші спочатку
    include: {
      topic: {
        select: { name: true, slug: true }
      },
      questions: {
        select: { id: true }
      },
      attempts: {
        select: { id: true }
      }
    }
  })

  console.log(`📊 Всього квізів в базі: ${allQuizzes.length}\n`)

  // Групуємо квізи по (topicId + title)
  const quizGroups = new Map<string, typeof allQuizzes>()
  
  for (const quiz of allQuizzes) {
    const key = `${quiz.topicId}_${quiz.title.toLowerCase().trim()}`
    const group = quizGroups.get(key) || []
    group.push(quiz)
    quizGroups.set(key, group)
  }

  console.log(`📋 Унікальних груп квізів: ${quizGroups.size}\n`)

  let totalDeleted = 0
  let totalKept = 0

  // Обробляємо кожну групу
  for (const [key, group] of quizGroups.entries()) {
    if (group.length > 1) {
      console.log(`\n⚠️  Знайдено дублікати для "${group[0].title}" в топіку "${group[0].topic.name}":`)
      console.log(`   Всього копій: ${group.length}`)
      
      // Залишаємо найстаріший квіз (перший в масиві)
      const original = group[0]
      const duplicates = group.slice(1)
      
      console.log(`   ✅ Залишаємо оригінал: ${original.id}`)
      console.log(`      Створено: ${original.createdAt.toISOString()}`)
      console.log(`      Питань: ${original.questions.length}`)
      console.log(`      Спроб: ${original.attempts.length}`)
      
      // Видаляємо дублікати
      for (const dup of duplicates) {
        console.log(`   ❌ Видаляємо дублікат: ${dup.id}`)
        console.log(`      Створено: ${dup.createdAt.toISOString()}`)
        console.log(`      Питань: ${dup.questions.length}`)
        console.log(`      Спроб: ${dup.attempts.length}`)
        
        try {
          // 1. Спочатку видаляємо спроби (має onDelete: Restrict)
          await prisma.quizAttempt.deleteMany({
            where: { quizId: dup.id }
          })
          
          // 2. Отримуємо всі ID питань цього квізу
          const questionIds = dup.questions.map(q => q.id)
          
          // 3. Видаляємо Options і Answers для цих питань
          await prisma.option.deleteMany({
            where: { questionId: { in: questionIds } }
          })
          await prisma.answer.deleteMany({
            where: { questionId: { in: questionIds } }
          })
          
          // 4. Тепер видаляємо питання
          await prisma.question.deleteMany({
            where: { quizId: dup.id }
          })
          
          // 5. Нарешті видаляємо квіз
          await prisma.quiz.delete({
            where: { id: dup.id }
          })
          
          totalDeleted++
          console.log(`      ✓ Видалено успішно`)
        } catch (error: any) {
          console.error(`      ✗ Помилка при видаленні: ${error.message}`)
        }
      }
      
      totalKept++
    } else {
      // Немає дублікатів
      totalKept++
    }
  }

  console.log(`\n\n📊 Результати:`)
  console.log(`   ✅ Залишено унікальних квізів: ${totalKept}`)
  console.log(`   ❌ Видалено дублікатів: ${totalDeleted}`)
  console.log(`   📈 Всього було: ${allQuizzes.length}`)
  console.log(`   📉 Залишилось: ${totalKept}`)
}

async function main() {
  try {
    await cleanupDuplicateQuizzes()
  } catch (error) {
    console.error('❌ Помилка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
