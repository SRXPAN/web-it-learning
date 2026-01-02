// prisma/seed.ts - БЕЗПЕЧНИЙ SEED (не видаляє існуючі дані)
import { PrismaClient, Category } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Force update flag - set to true to update existing topics
const FORCE_UPDATE = process.env.FORCE_SEED === 'true'

// ===== ФУНКЦІЯ: створити або оновити тему =====
async function upsertTopic(slug: string, data: {
  name: string,
  nameJson?: object,
  description: string,
  descJson?: object,
  category: 'Programming' | 'Mathematics' | 'Databases' | 'Networks' | 'WebDevelopment' | 'MobileDevelopment' | 'MachineLearning' | 'Security' | 'DevOps' | 'OperatingSystems',
  parentId?: string | null,
  materials?: Array<{ title: string, type: 'pdf' | 'video' | 'link' | 'text', url?: string, content?: string }>,
  quizzes?: Array<{
    title: string,
    durationSec: number,
    questions: Array<{
      text: string,
      explanation?: string,
      tags: string[],
      difficulty: 'Easy' | 'Medium' | 'Hard',
      options: Array<{ text: string, correct?: boolean }>
    }>
  }>
}) {
  const existing = await prisma.topic.findUnique({ 
    where: { slug },
    include: { materials: true, quizzes: { include: { questions: true } } }
  })
  
  if (existing) {
    if (FORCE_UPDATE) {
      // Update nameJson and descJson
      await prisma.topic.update({
        where: { slug },
        data: {
          name: data.name,
          nameJson: data.nameJson,
          description: data.description,
          descJson: data.descJson,
        }
      })
      
      // Add new materials (don't delete existing)
      if (data.materials) {
        for (const m of data.materials) {
          const existingMat = existing.materials.find(em => em.title === m.title)
          if (!existingMat) {
            await prisma.material.create({
              data: {
                topicId: existing.id,
                title: m.title,
                type: m.type,
                url: m.url,
                content: m.content,
                status: 'Published',
                publishedAt: new Date()
              }
            })
          }
        }
      }
      
      // Add new quizzes if topic has none
      if (data.quizzes && existing.quizzes.length === 0) {
        for (const q of data.quizzes) {
          await prisma.quiz.create({
            data: {
              topicId: existing.id,
              title: q.title,
              durationSec: q.durationSec,
              status: 'Published',
              publishedAt: new Date(),
              questions: {
                create: q.questions.map(qu => ({
                  text: qu.text,
                  explanation: qu.explanation,
                  tags: qu.tags,
                  difficulty: qu.difficulty,
                  options: {
                    create: qu.options.map(o => ({
                      text: o.text,
                      correct: o.correct ?? false
                    }))
                  }
                }))
              }
            }
          })
        }
      }
      
      console.log(`  ✓ Updated topic "${slug}"`)
    } else {
      console.log(`  ↳ Topic "${slug}" already exists, skipping... (use FORCE_SEED=true to update)`)
    }
    return existing
  }

  const topic = await prisma.topic.create({
    data: {
      slug,
      name: data.name,
      nameJson: data.nameJson,
      description: data.description,
      descJson: data.descJson,
      category: data.category,
      parentId: data.parentId,
      materials: data.materials ? {
        create: data.materials.map(m => ({
          title: m.title,
          type: m.type,
          url: m.url,
          content: m.content,
          status: 'Published',
          publishedAt: new Date()
        }))
      } : undefined,
      quizzes: data.quizzes ? {
        create: data.quizzes.map(q => ({
          title: q.title,
          durationSec: q.durationSec,
          status: 'Published',
          publishedAt: new Date(),
          questions: {
            create: q.questions.map(qu => ({
              text: qu.text,
              explanation: qu.explanation,
              tags: qu.tags,
              difficulty: qu.difficulty,
              options: {
                create: qu.options.map(o => ({
                  text: o.text,
                  correct: o.correct ?? false
                }))
              }
            }))
          }
        }))
      } : undefined,
      status: 'Published',
      publishedAt: new Date()
    }
  })
  console.log(`  ✓ Created topic "${slug}"`)
  return topic
}

// ===== ФУНКЦІЯ: створити переклади якщо не існують =====
async function upsertUiTranslation(key: string, translations: { UA: string, PL: string, EN: string }) {
  const existing = await prisma.uiTranslation.findFirst({ where: { key } })
  if (existing) return existing
  
  return prisma.uiTranslation.create({
    data: { key, translations }
  })
}

async function main() {
  console.log('🌱 Starting SAFE seed (preserves existing data)...\n')

  // ===== 1. Admin user (upsert - не перезаписує пароль) =====
  console.log('👤 Creating admin user...')
  const hash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@elearn.local' },
    update: {}, // НЕ оновлювати якщо існує
    create: {
      email: 'admin@elearn.local',
      name: 'Admin',
      password: hash,
      role: 'ADMIN'
    }
  })
  console.log(`  ✓ Admin: ${admin.email}\n`)

  // ===== 2. Demo Topics =====
  console.log('📚 Creating demo topics...')
  
  // Root: Algorithms
  const algorithms = await upsertTopic('algorithms', {
    name: 'Algorithms',
    nameJson: { UA: 'Алгоритми', PL: 'Algorytmy', EN: 'Algorithms' },
    description: 'Sorting and graphs',
    descJson: { UA: 'Сортування та графи', PL: 'Sortowanie i grafy', EN: 'Sorting and graphs' },
    category: 'Programming'
  })

  // Subtopic: Sorting
  await upsertTopic('sorting', {
    name: 'Sorting',
    nameJson: { UA: 'Сортування', PL: 'Sortowanie', EN: 'Sorting' },
    description: 'Quick/Merge/Heap',
    descJson: { UA: 'Quick/Merge/Heap сортування', PL: 'Sortowanie Quick/Merge/Heap', EN: 'Quick/Merge/Heap sorting' },
    category: 'Programming',
    parentId: algorithms.id,
    materials: [
      { title: 'QuickSort – PDF', type: 'pdf', url: 'https://example.com/quicksort.pdf' },
      { title: 'Merge Sort – Video', type: 'video', url: 'https://www.youtube.com/watch?v=Ns7tGNbtvV4' },
      { title: 'Stability of sorting – Article', type: 'link', url: 'https://en.wikipedia.org/wiki/Sorting_algorithm' },
      { title: 'Sorting Algorithms Comparison', type: 'text', content: 'Comparison of sorting algorithms:\n\n**QuickSort**: Average O(n log n), worst O(n²), in-place, not stable\n**MergeSort**: Always O(n log n), requires O(n) space, stable\n**HeapSort**: Always O(n log n), in-place, not stable\n**BubbleSort**: O(n²), in-place, stable\n**InsertionSort**: O(n²) worst, O(n) best, stable' },
      { title: 'HeapSort Visualization', type: 'video', url: 'https://www.youtube.com/watch?v=2DmK_H7IdTo' },
    ],
    quizzes: [{
      title: 'Sorting Basics',
      durationSec: 180,
      questions: [
        {
          text: 'Середня складність QuickSort?',
          explanation: 'QuickSort середньо працює за O(n log n) завдяки поділу масиву.',
          tags: ['Sorting', 'Complexity'],
          difficulty: 'Easy',
          options: [
            { text: 'O(n log n)', correct: true },
            { text: 'O(n²)' },
            { text: 'O(log n)' },
            { text: 'O(n)' }
          ]
        },
        {
          text: 'Який алгоритм сортування є стабільним?',
          explanation: 'MergeSort не змінює порядок рівних елементів, тому є стабільним.',
          tags: ['Sorting', 'Stability'],
          difficulty: 'Medium',
          options: [
            { text: 'QuickSort' },
            { text: 'MergeSort', correct: true },
            { text: 'HeapSort' },
            { text: 'SelectionSort' }
          ]
        },
        {
          text: 'Коли QuickSort стає O(n²)?',
          explanation: 'На вже відсортованих або майже відсортованих масивах без рандомізації.',
          tags: ['Sorting', 'Complexity'],
          difficulty: 'Hard',
          options: [
            { text: 'Коли всі елементи унікальні' },
            { text: 'Коли півмасиву рівний іншому' },
            { text: 'На вже відсортованому масиві', correct: true },
            { text: 'Коли масив містить від\'ємні числа' }
          ]
        },
        {
          text: 'Яка пам\'ять у HeapSort?',
          explanation: 'HeapSort потребує O(1) додаткової пам\'яті, бо сортує in-place.',
          tags: ['Sorting', 'Memory'],
          difficulty: 'Medium',
          options: [
            { text: 'O(log n)' },
            { text: 'O(n)' },
            { text: 'O(1)', correct: true },
            { text: 'O(n log n)' }
          ]
        },
        {
          text: 'Який алгоритм найкращий для майже відсортованого масиву?',
          explanation: 'InsertionSort працює за O(n) на майже відсортованих масивах.',
          tags: ['Sorting', 'Optimization'],
          difficulty: 'Medium',
          options: [
            { text: 'QuickSort' },
            { text: 'InsertionSort', correct: true },
            { text: 'HeapSort' },
            { text: 'MergeSort' }
          ]
        },
        {
          text: 'Яка найгірша складність MergeSort?',
          explanation: 'MergeSort завжди працює за O(n log n) незалежно від вхідних даних.',
          tags: ['Sorting', 'Complexity'],
          difficulty: 'Easy',
          options: [
            { text: 'O(n²)' },
            { text: 'O(n log n)', correct: true },
            { text: 'O(n)' },
            { text: 'O(log n)' }
          ]
        },
        {
          text: 'Що таке "pivot" в QuickSort?',
          explanation: 'Pivot - опорний елемент, навколо якого відбувається розділення масиву.',
          tags: ['Sorting', 'QuickSort'],
          difficulty: 'Easy',
          options: [
            { text: 'Найбільший елемент' },
            { text: 'Опорний елемент для розділення', correct: true },
            { text: 'Середнє значення' },
            { text: 'Індекс першого елемента' }
          ]
        },
        {
          text: 'Яка складність BubbleSort у найгіршому випадку?',
          explanation: 'BubbleSort завжди порівнює кожен елемент з кожним, тому O(n²).',
          tags: ['Sorting', 'Complexity'],
          difficulty: 'Easy',
          options: [
            { text: 'O(n)' },
            { text: 'O(n log n)' },
            { text: 'O(n²)', correct: true },
            { text: 'O(log n)' }
          ]
        },
        {
          text: 'Який алгоритм використовує принцип "розділяй і владарюй"?',
          explanation: 'QuickSort та MergeSort обидва використовують divide-and-conquer.',
          tags: ['Sorting', 'Paradigm'],
          difficulty: 'Medium',
          options: [
            { text: 'BubbleSort' },
            { text: 'InsertionSort' },
            { text: 'MergeSort', correct: true },
            { text: 'SelectionSort' }
          ]
        },
        {
          text: 'Скільки пам\'яті потрібно MergeSort?',
          explanation: 'MergeSort потребує O(n) додаткової пам\'яті для тимчасових масивів.',
          tags: ['Sorting', 'Memory'],
          difficulty: 'Medium',
          options: [
            { text: 'O(1)' },
            { text: 'O(log n)' },
            { text: 'O(n)', correct: true },
            { text: 'O(n²)' }
          ]
        },
        {
          text: 'Що означає "in-place" сортування?',
          explanation: 'In-place означає, що алгоритм використовує лише константну додаткову пам\'ять.',
          tags: ['Sorting', 'Memory'],
          difficulty: 'Easy',
          options: [
            { text: 'Сортування без порівнянь' },
            { text: 'Сортування з O(1) додаткової пам\'яті', correct: true },
            { text: 'Сортування за один прохід' },
            { text: 'Сортування на місці без swap' }
          ]
        },
        {
          text: 'Який алгоритм сортування використовує купу (heap)?',
          explanation: 'HeapSort будує max-heap та послідовно витягує максимальні елементи.',
          tags: ['Sorting', 'DataStructures'],
          difficulty: 'Easy',
          options: [
            { text: 'QuickSort' },
            { text: 'HeapSort', correct: true },
            { text: 'MergeSort' },
            { text: 'TreeSort' }
          ]
        }
      ]
    }]
  })

  // Subtopic: Graphs
  await upsertTopic('graphs', {
    name: 'Graphs',
    nameJson: { UA: 'Графи', PL: 'Grafy', EN: 'Graphs' },
    description: 'BFS/DFS/Dijkstra',
    descJson: { UA: 'Алгоритми BFS, DFS та Dijkstra', PL: 'Algorytmy BFS, DFS i Dijkstra', EN: 'BFS, DFS and Dijkstra algorithms' },
    category: 'Programming',
    parentId: algorithms.id,
    materials: [
      { title: 'BFS & DFS – Video', type: 'video', url: 'https://www.youtube.com/watch?v=pcKY4hjDrxk' },
      { title: 'Dijkstra Algorithm – Video', type: 'video', url: 'https://www.youtube.com/watch?v=GazC3A4OQTE' },
      { title: 'Graph Theory Basics', type: 'text', content: '**Graph Types:**\n- Directed vs Undirected\n- Weighted vs Unweighted\n- Cyclic vs Acyclic\n\n**Representations:**\n- Adjacency Matrix: O(V²) space\n- Adjacency List: O(V+E) space\n\n**Traversals:**\n- BFS: Level by level, uses Queue\n- DFS: Deep first, uses Stack/Recursion' },
      { title: 'Shortest Paths Guide', type: 'link', url: 'https://www.geeksforgeeks.org/shortest-path-algorithms/' },
    ],
    quizzes: [{
      title: 'Graph Algorithms',
      durationSec: 180,
      questions: [
        {
          text: 'BFS обходить граф…',
          explanation: 'BFS рухається по рівнях від стартової вершини.',
          tags: ['Graphs', 'BFS'],
          difficulty: 'Easy',
          options: [
            { text: 'в глибину' },
            { text: 'вшир', correct: true },
            { text: 'випадково' },
            { text: 'по діагоналі' }
          ]
        },
        {
          text: 'Яка структура даних лежить в основі BFS?',
          explanation: 'BFS використовує чергу для зберігання сусідів поточних вершин.',
          tags: ['Graphs', 'BFS'],
          difficulty: 'Easy',
          options: [
            { text: 'Стек' },
            { text: 'Черга', correct: true },
            { text: 'Купа' },
            { text: 'Дерево' }
          ]
        },
        {
          text: 'Dijkstra не працює коректно коли…',
          explanation: 'Алгоритм не підтримує ребра з від\'ємною вагою.',
          tags: ['Graphs', 'Dijkstra'],
          difficulty: 'Medium',
          options: [
            { text: 'Є ребра з від\'ємною вагою', correct: true },
            { text: 'Граф орієнтований' },
            { text: 'Є петлі' },
            { text: 'Граф не зв\'язний' }
          ]
        },
        {
          text: 'Яка структура даних використовується в DFS?',
          explanation: 'DFS використовує стек (або рекурсію, яка неявно використовує стек).',
          tags: ['Graphs', 'DFS'],
          difficulty: 'Easy',
          options: [
            { text: 'Черга' },
            { text: 'Стек', correct: true },
            { text: 'Хеш-таблиця' },
            { text: 'Масив' }
          ]
        },
        {
          text: 'Складність BFS для графа з V вершинами та E ребрами?',
          explanation: 'BFS відвідує кожну вершину та ребро один раз.',
          tags: ['Graphs', 'Complexity'],
          difficulty: 'Medium',
          options: [
            { text: 'O(V)' },
            { text: 'O(E)' },
            { text: 'O(V + E)', correct: true },
            { text: 'O(V * E)' }
          ]
        },
        {
          text: 'Який алгоритм знаходить найкоротший шлях у невагових графах?',
          explanation: 'BFS знаходить найкоротший шлях за кількістю ребер.',
          tags: ['Graphs', 'BFS'],
          difficulty: 'Medium',
          options: [
            { text: 'DFS' },
            { text: 'BFS', correct: true },
            { text: 'Топологічне сортування' },
            { text: 'Пошук циклів' }
          ]
        },
        {
          text: 'Що таке топологічне сортування?',
          explanation: 'Впорядкування вершин DAG так, що всі ребра йдуть зліва направо.',
          tags: ['Graphs', 'TopSort'],
          difficulty: 'Medium',
          options: [
            { text: 'Сортування вершин за кількістю ребер' },
            { text: 'Впорядкування вершин в DAG', correct: true },
            { text: 'Пошук всіх шляхів' },
            { text: 'Знаходження циклів' }
          ]
        },
        {
          text: 'Алгоритм Беллмана-Форда працює з…',
          explanation: 'Bellman-Ford може працювати з від\'ємними вагами ребер.',
          tags: ['Graphs', 'ShortestPath'],
          difficulty: 'Hard',
          options: [
            { text: 'Тільки додатними вагами' },
            { text: 'Від\'ємними вагами', correct: true },
            { text: 'Тільки невагомими графами' },
            { text: 'Тільки деревами' }
          ]
        },
        {
          text: 'Скільки пам\'яті займає матриця суміжності для V вершин?',
          explanation: 'Матриця суміжності - це двовимірний масив VxV.',
          tags: ['Graphs', 'DataStructures'],
          difficulty: 'Easy',
          options: [
            { text: 'O(V)' },
            { text: 'O(V²)', correct: true },
            { text: 'O(E)' },
            { text: 'O(V + E)' }
          ]
        },
        {
          text: 'Що таке DAG?',
          explanation: 'DAG - Directed Acyclic Graph, направлений ациклічний граф.',
          tags: ['Graphs', 'Theory'],
          difficulty: 'Easy',
          options: [
            { text: 'Динамічний адаптивний граф' },
            { text: 'Направлений ациклічний граф', correct: true },
            { text: 'Дискретний алгоритмічний граф' },
            { text: 'Двозв\'язний ациклічний граф' }
          ]
        },
        {
          text: 'Який алгоритм використовується для пошуку мінімального остовного дерева?',
          explanation: 'Алгоритми Prim та Kruskal знаходять MST.',
          tags: ['Graphs', 'MST'],
          difficulty: 'Medium',
          options: [
            { text: 'Dijkstra' },
            { text: 'Bellman-Ford' },
            { text: 'Prim/Kruskal', correct: true },
            { text: 'Floyd-Warshall' }
          ]
        },
        {
          text: 'Floyd-Warshall знаходить…',
          explanation: 'Floyd-Warshall знаходить найкоротші шляхи між усіма парами вершин.',
          tags: ['Graphs', 'ShortestPath'],
          difficulty: 'Hard',
          options: [
            { text: 'Один найкоротший шлях' },
            { text: 'Всі найкоротші шляхи', correct: true },
            { text: 'Мінімальне остовне дерево' },
            { text: 'Всі цикли в графі' }
          ]
        }
      ]
    }]
  })

  // OOP topic
  await upsertTopic('oop-basics', {
    name: 'OOP Basics',
    nameJson: { UA: 'Основи ООП', PL: 'Podstawy OOP', EN: 'OOP Basics' },
    description: 'Encapsulation, Inheritance, Polymorphism',
    descJson: { UA: 'Інкапсуляція, Наслідування, Поліморфізм', PL: 'Enkapsulacja, Dziedziczenie, Polimorfizm', EN: 'Encapsulation, Inheritance, Polymorphism' },
    category: 'Programming',
    materials: [
      { title: 'OOP Concepts', type: 'text', content: '**Four Pillars of OOP:**\n\n1. **Encapsulation**: Bundling data and methods, hiding internal state\n2. **Abstraction**: Hiding complexity, showing only necessary features\n3. **Inheritance**: Creating new classes from existing ones\n4. **Polymorphism**: Objects taking many forms, method overriding\n\n**SOLID Principles:**\n- S: Single Responsibility\n- O: Open/Closed\n- L: Liskov Substitution\n- I: Interface Segregation\n- D: Dependency Inversion' },
      { title: 'SOLID Principles – Video', type: 'video', url: 'https://www.youtube.com/watch?v=pTB30aXS77U' },
      { title: 'Design Patterns', type: 'link', url: 'https://refactoring.guru/design-patterns' },
      { title: 'OOP vs Functional', type: 'text', content: 'OOP focuses on objects containing data and behavior.\nFunctional programming focuses on pure functions and immutability.\nModern languages support both paradigms.' },
    ],
    quizzes: [{
      title: 'OOP & SOLID',
      durationSec: 180,
      questions: [
        {
          text: 'Який принцип про «одну причину для змін»?',
          explanation: 'SRP означає, що клас має одну зону відповідальності.',
          tags: ['OOP', 'SOLID'],
          difficulty: 'Easy',
          options: [
            { text: 'LSP' },
            { text: 'SRP', correct: true },
            { text: 'DIP' },
            { text: 'OCP' }
          ]
        },
        {
          text: 'Який принцип описує підстановку підтипів?',
          explanation: 'LSP гарантує, що підкласи можна замінити базовим класом.',
          tags: ['OOP', 'SOLID'],
          difficulty: 'Medium',
          options: [
            { text: 'LSP', correct: true },
            { text: 'ISP' },
            { text: 'SRP' },
            { text: 'DIP' }
          ]
        },
        {
          text: 'Який патерн створює об\'єкти без вказання конкретного класу?',
          explanation: 'Factory Method інкапсулює створення об\'єктів.',
          tags: ['OOP', 'Patterns'],
          difficulty: 'Medium',
          options: [
            { text: 'Observer' },
            { text: 'Factory Method', correct: true },
            { text: 'Strategy' },
            { text: 'Decorator' }
          ]
        },
        {
          text: 'Що таке інкапсуляція?',
          explanation: 'Інкапсуляція - приховування внутрішнього стану об\'єкта.',
          tags: ['OOP', 'Basics'],
          difficulty: 'Easy',
          options: [
            { text: 'Створення копій об\'єктів' },
            { text: 'Приховування внутрішнього стану', correct: true },
            { text: 'Множинне наслідування' },
            { text: 'Перевантаження методів' }
          ]
        },
        {
          text: 'Що таке поліморфізм?',
          explanation: 'Поліморфізм дозволяє об\'єктам різних класів реагувати на однакові методи по-різному.',
          tags: ['OOP', 'Basics'],
          difficulty: 'Easy',
          options: [
            { text: 'Приховування даних' },
            { text: 'Здатність об\'єктів приймати різні форми', correct: true },
            { text: 'Створення класів' },
            { text: 'Копіювання об\'єктів' }
          ]
        },
        {
          text: 'OCP (Open/Closed Principle) означає…',
          explanation: 'Клас відкритий для розширення, закритий для модифікації.',
          tags: ['OOP', 'SOLID'],
          difficulty: 'Medium',
          options: [
            { text: 'Код має бути відкритим' },
            { text: 'Відкритий для розширення, закритий для модифікації', correct: true },
            { text: 'Всі методи мають бути публічними' },
            { text: 'Класи не можна наслідувати' }
          ]
        },
        {
          text: 'Який патерн забезпечує один екземпляр класу?',
          explanation: 'Singleton гарантує існування лише одного екземпляра класу.',
          tags: ['OOP', 'Patterns'],
          difficulty: 'Easy',
          options: [
            { text: 'Factory' },
            { text: 'Singleton', correct: true },
            { text: 'Builder' },
            { text: 'Prototype' }
          ]
        },
        {
          text: 'Що таке абстрактний клас?',
          explanation: 'Клас який не може бути інстанційований напряму.',
          tags: ['OOP', 'Basics'],
          difficulty: 'Easy',
          options: [
            { text: 'Клас без методів' },
            { text: 'Клас який не можна створити напряму', correct: true },
            { text: 'Клас з приватними полями' },
            { text: 'Клас без конструктора' }
          ]
        },
        {
          text: 'ISP (Interface Segregation) означає…',
          explanation: 'Краще мати багато специфічних інтерфейсів, ніж один загальний.',
          tags: ['OOP', 'SOLID'],
          difficulty: 'Hard',
          options: [
            { text: 'Інтерфейси мають бути великими' },
            { text: 'Багато специфічних інтерфейсів краще одного загального', correct: true },
            { text: 'Один інтерфейс на клас' },
            { text: 'Інтерфейси не потрібні' }
          ]
        },
        {
          text: 'DIP (Dependency Inversion) говорить про…',
          explanation: 'Залежність від абстракцій, не від конкретних реалізацій.',
          tags: ['OOP', 'SOLID'],
          difficulty: 'Hard',
          options: [
            { text: 'Уникати залежностей' },
            { text: 'Залежати від абстракцій, не від реалізацій', correct: true },
            { text: 'Інвертувати ієрархію класів' },
            { text: 'Використовувати тільки інтерфейси' }
          ]
        },
        {
          text: 'Який патерн дозволяє змінювати поведінку об\'єкта під час виконання?',
          explanation: 'Strategy дозволяє вибирати алгоритм під час виконання.',
          tags: ['OOP', 'Patterns'],
          difficulty: 'Medium',
          options: [
            { text: 'Factory' },
            { text: 'Strategy', correct: true },
            { text: 'Singleton' },
            { text: 'Builder' }
          ]
        },
        {
          text: 'Композиція vs Наслідування - що краще?',
          explanation: 'Композиція зазвичай гнучкіша і дозволяє уникнути проблем наслідування.',
          tags: ['OOP', 'BestPractices'],
          difficulty: 'Medium',
          options: [
            { text: 'Завжди наслідування' },
            { text: 'Завжди композиція' },
            { text: 'Композиція зазвичай краща', correct: true },
            { text: 'Немає різниці' }
          ]
        }
      ]
    }]
  })

  // Mathematics
  await upsertTopic('linear-algebra', {
    name: 'Linear Algebra',
    nameJson: { UA: 'Лінійна алгебра', PL: 'Algebra liniowa', EN: 'Linear Algebra' },
    description: 'Vectors, matrices, multiplication',
    descJson: { UA: 'Вектори, матриці, множення', PL: 'Wektory, macierze, mnożenie', EN: 'Vectors, matrices, multiplication' },
    category: 'Mathematics',
    materials: [
      { title: 'Matrices – PDF', type: 'pdf', url: 'https://example.com/matrix.pdf' },
      { title: 'Linear Algebra – Video', type: 'video', url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs' },
      { title: 'Vector Operations', type: 'text', content: 'Vector addition: (a1, a2) + (b1, b2) = (a1+b1, a2+b2)\nScalar multiplication: k*(a1, a2) = (k*a1, k*a2)\nDot product: a·b = a1*b1 + a2*b2' }
    ],
    quizzes: [{
      title: 'Linear Algebra Basics',
      durationSec: 120,
      questions: [
        {
          text: 'Що таке детермінант матриці 2x2?',
          explanation: 'Детермінант матриці [[a,b],[c,d]] = ad - bc',
          tags: ['Matrix'],
          difficulty: 'Easy',
          options: [
            { text: 'ad - bc', correct: true },
            { text: 'ad + bc' },
            { text: 'a + b + c + d' },
            { text: 'ab - cd' }
          ]
        },
        {
          text: 'Скалярний добуток векторів (1,2) та (3,4)?',
          explanation: '1*3 + 2*4 = 3 + 8 = 11',
          tags: ['Vector'],
          difficulty: 'Easy',
          options: [
            { text: '7' },
            { text: '10' },
            { text: '11', correct: true },
            { text: '14' }
          ]
        },
        {
          text: 'Розмірність результату множення матриць 3x2 та 2x4?',
          explanation: 'При множенні матриць AxB результат має розмір рядків A x стовпців B',
          tags: ['Matrix'],
          difficulty: 'Medium',
          options: [
            { text: '3x4', correct: true },
            { text: '2x2' },
            { text: '3x2' },
            { text: '2x4' }
          ]
        },
        {
          text: 'Яка матриця є одиничною 2x2?',
          explanation: 'Одинична матриця має 1 на діагоналі і 0 в інших місцях',
          tags: ['Matrix'],
          difficulty: 'Easy',
          options: [
            { text: '[[1,0],[0,1]]', correct: true },
            { text: '[[1,1],[1,1]]' },
            { text: '[[0,0],[0,0]]' },
            { text: '[[1,0],[1,0]]' }
          ]
        },
        {
          text: 'Що таке транспонування матриці?',
          explanation: 'Транспонування міняє рядки зі стовпцями',
          tags: ['Matrix'],
          difficulty: 'Easy',
          options: [
            { text: 'Заміна рядків на стовпці', correct: true },
            { text: 'Множення на -1' },
            { text: 'Додавання до себе' },
            { text: 'Обернення матриці' }
          ]
        },
        {
          text: 'Довжина вектора (3, 4)?',
          explanation: '|в| = √(3² + 4²) = √(9 + 16) = √25 = 5',
          tags: ['Vector'],
          difficulty: 'Easy',
          options: [
            { text: '5', correct: true },
            { text: '7' },
            { text: '12' },
            { text: '25' }
          ]
        }
      ]
    }]
  })

  // Databases
  await upsertTopic('sql-basics', {
    name: 'SQL Basics',
    nameJson: { UA: 'SQL: основи', PL: 'SQL: podstawy', EN: 'SQL Basics' },
    description: 'SELECT, WHERE, JOIN',
    descJson: { UA: 'Основи SQL: SELECT, WHERE, JOIN', PL: 'Podstawy SQL: SELECT, WHERE, JOIN', EN: 'SQL basics: SELECT, WHERE, JOIN' },
    category: 'Databases',
    materials: [
      { title: 'SQL JOIN Types', type: 'text', content: '**JOIN Types:**\n\n- **INNER JOIN**: Returns only matching rows\n- **LEFT JOIN**: All from left + matching from right\n- **RIGHT JOIN**: All from right + matching from left\n- **FULL OUTER JOIN**: All rows from both tables\n- **CROSS JOIN**: Cartesian product\n\n**Example:**\n```sql\nSELECT * FROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE o.total > 100;\n```' },
      { title: 'SQL Tutorial Video', type: 'video', url: 'https://www.youtube.com/watch?v=27axs9dO7AE' },
      { title: 'SQL Cheatsheet', type: 'link', url: 'https://www.sqltutorial.org/sql-cheat-sheet/' },
      { title: 'Index Optimization', type: 'text', content: '**Index Types:**\n- B-Tree: Default, good for =, <, >, BETWEEN\n- Hash: Only equality checks\n- GIN/GiST: Full-text search, arrays\n\n**When to index:**\n- Columns in WHERE clauses\n- JOIN columns\n- ORDER BY columns\n- Avoid: small tables, low cardinality columns' },
    ],
    quizzes: [{
      title: 'SQL Mastery',
      durationSec: 180,
      questions: [
        {
          text: 'LEFT JOIN повертає…',
          explanation: 'LEFT JOIN залишає всі рядки з лівої таблиці.',
          tags: ['JOIN'],
          difficulty: 'Easy',
          options: [
            { text: 'усі з лівої', correct: true },
            { text: 'тільки співпадіння' },
            { text: 'усі з правої' },
            { text: 'усі з обох таблиць' }
          ]
        },
        {
          text: 'Який індекс прискорить WHERE email = ?',
          explanation: 'B-Tree індекс на стовпці email дає O(log n) пошук.',
          tags: ['Index'],
          difficulty: 'Medium',
          options: [
            { text: 'FULLTEXT' },
            { text: 'BTREE', correct: true },
            { text: 'HASH' },
            { text: 'GIN' }
          ]
        },
        {
          text: 'Що робить COUNT(*)?',
          explanation: 'COUNT(*) підраховує всі рядки, включаючи NULL.',
          tags: ['Aggregate'],
          difficulty: 'Easy',
          options: [
            { text: 'Підраховує ненульові' },
            { text: 'Підраховує лише числа' },
            { text: 'Підраховує всі рядки', correct: true },
            { text: 'Повертає суму' }
          ]
        },
        {
          text: 'Яка складність пошуку без індексу?',
          explanation: 'Без індексу виконується повне сканування O(n).',
          tags: ['Index', 'Complexity'],
          difficulty: 'Hard',
          options: [
            { text: 'O(1)' },
            { text: 'O(log n)' },
            { text: 'O(n)', correct: true },
            { text: 'O(n²)' }
          ]
        },
        {
          text: 'INNER JOIN повертає…',
          explanation: 'INNER JOIN повертає тільки рядки з співпадінням в обох таблицях.',
          tags: ['JOIN'],
          difficulty: 'Easy',
          options: [
            { text: 'Усі рядки з лівої таблиці' },
            { text: 'Тільки співпадіння', correct: true },
            { text: 'Усі рядки з обох таблиць' },
            { text: 'Декартів добуток' }
          ]
        },
        {
          text: 'Яка різниця між WHERE та HAVING?',
          explanation: 'WHERE фільтрує перед групуванням, HAVING - після.',
          tags: ['SQL', 'Filtering'],
          difficulty: 'Medium',
          options: [
            { text: 'Немає різниці' },
            { text: 'WHERE до GROUP BY, HAVING після', correct: true },
            { text: 'HAVING швидший' },
            { text: 'WHERE тільки для чисел' }
          ]
        },
        {
          text: 'Що робить GROUP BY?',
          explanation: 'GROUP BY групує рядки за вказаними стовпцями для агрегації.',
          tags: ['SQL', 'Aggregate'],
          difficulty: 'Easy',
          options: [
            { text: 'Сортує результати' },
            { text: 'Групує рядки для агрегації', correct: true },
            { text: 'Видаляє дублікати' },
            { text: 'Об\'єднує таблиці' }
          ]
        },
        {
          text: 'NULL = NULL повертає…',
          explanation: 'Порівняння з NULL завжди дає UNKNOWN, потрібно IS NULL.',
          tags: ['SQL', 'NULL'],
          difficulty: 'Medium',
          options: [
            { text: 'TRUE' },
            { text: 'FALSE' },
            { text: 'NULL/UNKNOWN', correct: true },
            { text: 'Помилку' }
          ]
        },
        {
          text: 'Яка функція повертає унікальні значення?',
          explanation: 'DISTINCT видаляє дублікати з результату.',
          tags: ['SQL', 'Functions'],
          difficulty: 'Easy',
          options: [
            { text: 'UNIQUE' },
            { text: 'DISTINCT', correct: true },
            { text: 'SINGLE' },
            { text: 'DEDUPE' }
          ]
        },
        {
          text: 'Що таке транзакція в SQL?',
          explanation: 'Транзакція - група операцій, які виконуються атомарно.',
          tags: ['SQL', 'Transactions'],
          difficulty: 'Medium',
          options: [
            { text: 'Запит на вибірку даних' },
            { text: 'Атомарна група операцій', correct: true },
            { text: 'З\'єднання з базою' },
            { text: 'Індекс таблиці' }
          ]
        },
        {
          text: 'ACID в базах даних - що це?',
          explanation: 'Atomicity, Consistency, Isolation, Durability - властивості транзакцій.',
          tags: ['SQL', 'Transactions'],
          difficulty: 'Medium',
          options: [
            { text: 'Типи даних' },
            { text: 'Властивості транзакцій', correct: true },
            { text: 'Рівні ізоляції' },
            { text: 'Типи індексів' }
          ]
        },
        {
          text: 'Що робить ORDER BY?',
          explanation: 'ORDER BY сортує результати за вказаними стовпцями.',
          tags: ['SQL', 'Sorting'],
          difficulty: 'Easy',
          options: [
            { text: 'Групує дані' },
            { text: 'Сортує результати', correct: true },
            { text: 'Фільтрує дані' },
            { text: 'Об\'єднує таблиці' }
          ]
        }
      ]
    }]
  })

  // Networks
  await upsertTopic('osi-model', {
    name: 'OSI Model',
    nameJson: { UA: 'Модель OSI', PL: 'Model OSI', EN: 'OSI Model' },
    description: '7 layers of network communication',
    descJson: { UA: '7 шарів мережевої комунікації', PL: '7 warstw komunikacji sieciowej', EN: '7 layers of network communication' },
    category: 'Networks',
    materials: [
      { title: 'OSI Model Overview', type: 'text', content: '**OSI 7 Layers (top to bottom):**\n\n7. **Application**: HTTP, FTP, SMTP\n6. **Presentation**: SSL/TLS, encryption\n5. **Session**: Session management\n4. **Transport**: TCP, UDP\n3. **Network**: IP, routing\n2. **Data Link**: MAC, Ethernet\n1. **Physical**: Cables, signals\n\n**Mnemonic**: All People Seem To Need Data Processing' },
      { title: 'OSI vs TCP/IP', type: 'video', url: 'https://www.youtube.com/watch?v=3b_TAYtzuho' },
      { title: 'Network Protocols Guide', type: 'link', url: 'https://www.cloudflare.com/learning/network-layer/what-is-a-protocol/' },
    ],
    quizzes: [{
      title: 'OSI & Networking',
      durationSec: 150,
      questions: [
        {
          text: 'Скільки шарів у моделі OSI?',
          explanation: 'Модель OSI має 7 шарів: Physical, Data Link, Network, Transport, Session, Presentation, Application.',
          tags: ['OSI', 'Basics'],
          difficulty: 'Easy',
          options: [
            { text: '4' },
            { text: '5' },
            { text: '7', correct: true },
            { text: '8' }
          ]
        },
        {
          text: 'На якому рівні працює HTTP?',
          explanation: 'HTTP працює на прикладному (Application) рівні - 7-й шар.',
          tags: ['OSI', 'Protocols'],
          difficulty: 'Easy',
          options: [
            { text: 'Transport' },
            { text: 'Network' },
            { text: 'Application', correct: true },
            { text: 'Session' }
          ]
        },
        {
          text: 'TCP працює на рівні…',
          explanation: 'TCP - протокол транспортного рівня (4-й шар).',
          tags: ['OSI', 'TCP'],
          difficulty: 'Easy',
          options: [
            { text: 'Network' },
            { text: 'Transport', correct: true },
            { text: 'Application' },
            { text: 'Data Link' }
          ]
        },
        {
          text: 'Різниця між TCP та UDP?',
          explanation: 'TCP гарантує доставку та порядок, UDP - ні.',
          tags: ['Protocols', 'TCP', 'UDP'],
          difficulty: 'Medium',
          options: [
            { text: 'TCP швидший' },
            { text: 'TCP надійний, UDP швидший', correct: true },
            { text: 'UDP надійний' },
            { text: 'Немає різниці' }
          ]
        },
        {
          text: 'IP-адресація на якому рівні?',
          explanation: 'IP працює на мережевому рівні (3-й шар).',
          tags: ['OSI', 'IP'],
          difficulty: 'Easy',
          options: [
            { text: 'Data Link' },
            { text: 'Network', correct: true },
            { text: 'Transport' },
            { text: 'Physical' }
          ]
        },
        {
          text: 'Що таке MAC-адреса?',
          explanation: 'MAC - унікальний ідентифікатор мережевого адаптера на рівні Data Link.',
          tags: ['OSI', 'MAC'],
          difficulty: 'Medium',
          options: [
            { text: 'IP-адреса комп\'ютера' },
            { text: 'Апаратна адреса мережевого адаптера', correct: true },
            { text: 'Адреса веб-сайту' },
            { text: 'Номер порту' }
          ]
        },
        {
          text: 'HTTPS використовує шифрування на рівні…',
          explanation: 'TLS/SSL працює між Application та Transport рівнями.',
          tags: ['Security', 'HTTPS'],
          difficulty: 'Medium',
          options: [
            { text: 'Application' },
            { text: 'Transport' },
            { text: 'Presentation/Transport', correct: true },
            { text: 'Network' }
          ]
        },
        {
          text: 'Що робить DNS?',
          explanation: 'DNS перетворює доменні імена на IP-адреси.',
          tags: ['DNS', 'Protocols'],
          difficulty: 'Easy',
          options: [
            { text: 'Шифрує трафік' },
            { text: 'Перетворює домени на IP', correct: true },
            { text: 'Маршрутизує пакети' },
            { text: 'Керує сесіями' }
          ]
        },
        {
          text: 'Порт 443 використовується для…',
          explanation: 'HTTPS за замовчуванням використовує порт 443.',
          tags: ['Ports', 'HTTPS'],
          difficulty: 'Easy',
          options: [
            { text: 'HTTP' },
            { text: 'HTTPS', correct: true },
            { text: 'FTP' },
            { text: 'SSH' }
          ]
        },
        {
          text: 'Що таке subnet mask?',
          explanation: 'Маска підмережі визначає межі мережі та хостів.',
          tags: ['IP', 'Subnetting'],
          difficulty: 'Medium',
          options: [
            { text: 'Пароль мережі' },
            { text: 'Визначає межі мережі', correct: true },
            { text: 'MAC-адреса роутера' },
            { text: 'Порт з\'єднання' }
          ]
        }
      ]
    }]
  })

  // Web Development
  await upsertTopic('html-css-basics', {
    name: 'HTML & CSS Basics',
    nameJson: { UA: 'Основи HTML та CSS', PL: 'Podstawy HTML i CSS', EN: 'HTML & CSS Basics' },
    description: 'Web page structure and styling',
    descJson: { UA: 'Структура та стилізація веб-сторінок', PL: 'Struktura i stylizacja stron', EN: 'Web page structure and styling' },
    category: 'WebDevelopment',
    materials: [
      { title: 'HTML Fundamentals', type: 'text', content: '**HTML Structure:**\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Page Title</title>\n</head>\n<body>\n  <h1>Heading</h1>\n  <p>Paragraph</p>\n</body>\n</html>\n```\n\n**Common Tags:**\n- `<div>`: Container\n- `<span>`: Inline container\n- `<a>`: Links\n- `<img>`: Images\n- `<ul>/<ol>`: Lists' },
      { title: 'CSS Basics', type: 'text', content: '**CSS Selectors:**\n- `.class` - class selector\n- `#id` - id selector\n- `element` - tag selector\n- `element.class` - combined\n\n**Box Model:**\ncontent → padding → border → margin\n\n**Flexbox:**\n```css\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n```' },
      { title: 'HTML/CSS Tutorial', type: 'video', url: 'https://www.youtube.com/watch?v=UB1O30fR-EE' },
    ],
    quizzes: [{
      title: 'HTML & CSS Quiz',
      durationSec: 150,
      questions: [
        {
          text: 'Який тег створює посилання?',
          explanation: 'Тег <a> (anchor) використовується для створення гіперпосилань.',
          tags: ['HTML', 'Tags'],
          difficulty: 'Easy',
          options: [
            { text: '<link>' },
            { text: '<a>', correct: true },
            { text: '<href>' },
            { text: '<url>' }
          ]
        },
        {
          text: 'CSS селектор для класу?',
          explanation: 'Класи в CSS позначаються крапкою перед назвою.',
          tags: ['CSS', 'Selectors'],
          difficulty: 'Easy',
          options: [
            { text: '#classname' },
            { text: '.classname', correct: true },
            { text: '@classname' },
            { text: '*classname' }
          ]
        },
        {
          text: 'Що таке Box Model?',
          explanation: 'Box Model: content + padding + border + margin.',
          tags: ['CSS', 'Layout'],
          difficulty: 'Medium',
          options: [
            { text: 'Спосіб створення форм' },
            { text: 'Модель розміру елемента', correct: true },
            { text: 'Тип списку' },
            { text: 'Метод анімації' }
          ]
        },
        {
          text: 'display: flex робить…',
          explanation: 'Flexbox дозволяє легко вирівнювати та розподіляти елементи.',
          tags: ['CSS', 'Flexbox'],
          difficulty: 'Easy',
          options: [
            { text: 'Приховує елемент' },
            { text: 'Створює гнучкий контейнер', correct: true },
            { text: 'Робить елемент блоковим' },
            { text: 'Центрує текст' }
          ]
        },
        {
          text: 'Різниця між id та class?',
          explanation: 'Id унікальний на сторінці, class можна використовувати багаторазово.',
          tags: ['HTML', 'CSS'],
          difficulty: 'Easy',
          options: [
            { text: 'Немає різниці' },
            { text: 'id унікальний, class - ні', correct: true },
            { text: 'class унікальний' },
            { text: 'id тільки для CSS' }
          ]
        },
        {
          text: 'position: absolute позиціонує відносно…',
          explanation: 'Absolute позиціонується відносно найближчого positioned предка.',
          tags: ['CSS', 'Position'],
          difficulty: 'Medium',
          options: [
            { text: 'Вікна браузера' },
            { text: 'Батьківського елемента з position', correct: true },
            { text: 'Самого себе' },
            { text: 'Документа' }
          ]
        },
        {
          text: 'Що робить z-index?',
          explanation: 'z-index керує порядком накладання елементів.',
          tags: ['CSS', 'Stacking'],
          difficulty: 'Easy',
          options: [
            { text: 'Змінює розмір' },
            { text: 'Керує порядком накладання', correct: true },
            { text: 'Задає відступи' },
            { text: 'Приховує елемент' }
          ]
        },
        {
          text: 'Яка одиниця відносна до шрифту батька?',
          explanation: 'em відносний до font-size батьківського елемента.',
          tags: ['CSS', 'Units'],
          difficulty: 'Medium',
          options: [
            { text: 'px' },
            { text: 'em', correct: true },
            { text: 'vh' },
            { text: '%' }
          ]
        },
        {
          text: 'Як центрувати елемент горизонтально?',
          explanation: 'margin: 0 auto центрує блоковий елемент з фіксованою шириною.',
          tags: ['CSS', 'Layout'],
          difficulty: 'Easy',
          options: [
            { text: 'text-align: center' },
            { text: 'margin: 0 auto', correct: true },
            { text: 'padding: center' },
            { text: 'align: middle' }
          ]
        },
        {
          text: 'Що таке responsive design?',
          explanation: 'Responsive design адаптує сторінку до різних розмірів екрану.',
          tags: ['CSS', 'Responsive'],
          difficulty: 'Easy',
          options: [
            { text: 'Швидкий дизайн' },
            { text: 'Адаптивний дизайн', correct: true },
            { text: 'Анімований дизайн' },
            { text: 'Мінімалістичний дизайн' }
          ]
        }
      ]
    }]
  })

  // JavaScript basics
  await upsertTopic('javascript-basics', {
    name: 'JavaScript Basics',
    nameJson: { UA: 'Основи JavaScript', PL: 'Podstawy JavaScript', EN: 'JavaScript Basics' },
    description: 'Variables, functions, DOM',
    descJson: { UA: 'Змінні, функції, DOM', PL: 'Zmienne, funkcje, DOM', EN: 'Variables, functions, DOM' },
    category: 'WebDevelopment',
    materials: [
      { title: 'JS Variables', type: 'text', content: '**Variable Declaration:**\n```javascript\nlet x = 10;      // block scope, reassignable\nconst y = 20;    // block scope, constant\nvar z = 30;      // function scope (avoid)\n```\n\n**Data Types:**\n- string, number, boolean\n- null, undefined\n- object, array, function' },
      { title: 'JS Functions', type: 'text', content: '**Function Types:**\n```javascript\n// Declaration\nfunction add(a, b) { return a + b; }\n\n// Expression\nconst add = function(a, b) { return a + b; };\n\n// Arrow function\nconst add = (a, b) => a + b;\n```' },
      { title: 'JavaScript Course', type: 'video', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg' },
    ],
    quizzes: [{
      title: 'JavaScript Fundamentals',
      durationSec: 180,
      questions: [
        {
          text: 'Різниця між let та const?',
          explanation: 'let можна перепризначити, const - константа.',
          tags: ['JS', 'Variables'],
          difficulty: 'Easy',
          options: [
            { text: 'Немає різниці' },
            { text: 'let можна змінити, const - ні', correct: true },
            { text: 'const швидший' },
            { text: 'let для чисел' }
          ]
        },
        {
          text: 'Що поверне typeof null?',
          explanation: 'Історична помилка JS: typeof null === "object".',
          tags: ['JS', 'Types'],
          difficulty: 'Medium',
          options: [
            { text: '"null"' },
            { text: '"undefined"' },
            { text: '"object"', correct: true },
            { text: '"number"' }
          ]
        },
        {
          text: '=== vs == в JavaScript?',
          explanation: '=== перевіряє тип і значення, == робить приведення типів.',
          tags: ['JS', 'Operators'],
          difficulty: 'Easy',
          options: [
            { text: 'Однакові' },
            { text: '=== строге порівняння', correct: true },
            { text: '== строге порівняння' },
            { text: '=== повільніший' }
          ]
        },
        {
          text: 'Що таке closure?',
          explanation: 'Closure - функція що запам\'ятовує своє лексичне оточення.',
          tags: ['JS', 'Functions'],
          difficulty: 'Hard',
          options: [
            { text: 'Закритий клас' },
            { text: 'Функція з доступом до зовнішніх змінних', correct: true },
            { text: 'Приватний метод' },
            { text: 'Тип циклу' }
          ]
        },
        {
          text: 'Що таке hoisting?',
          explanation: 'Hoisting - підняття оголошень змінних та функцій на початок.',
          tags: ['JS', 'Scope'],
          difficulty: 'Medium',
          options: [
            { text: 'Сортування масиву' },
            { text: 'Підняття оголошень', correct: true },
            { text: 'Очищення пам\'яті' },
            { text: 'Асинхронність' }
          ]
        },
        {
          text: 'Promise в JavaScript це…',
          explanation: 'Promise представляє майбутнє значення асинхронної операції.',
          tags: ['JS', 'Async'],
          difficulty: 'Medium',
          options: [
            { text: 'Тип даних' },
            { text: 'Об\'єкт для асинхронних операцій', correct: true },
            { text: 'Метод масиву' },
            { text: 'Функція колбеку' }
          ]
        },
        {
          text: 'Що робить Array.map()?',
          explanation: 'map створює новий масив, застосовуючи функцію до кожного елемента.',
          tags: ['JS', 'Arrays'],
          difficulty: 'Easy',
          options: [
            { text: 'Фільтрує масив' },
            { text: 'Трансформує кожен елемент', correct: true },
            { text: 'Сортує масив' },
            { text: 'Знаходить елемент' }
          ]
        },
        {
          text: 'this у стрілковій функції…',
          explanation: 'Стрілкові функції не мають власного this, беруть з оточення.',
          tags: ['JS', 'Functions'],
          difficulty: 'Hard',
          options: [
            { text: 'Завжди undefined' },
            { text: 'Береться з лексичного оточення', correct: true },
            { text: 'Посилається на window' },
            { text: 'Визначається при виклику' }
          ]
        },
        {
          text: 'Що таке event bubbling?',
          explanation: 'Bubbling - подія спливає від цільового елемента до батьків.',
          tags: ['JS', 'DOM'],
          difficulty: 'Medium',
          options: [
            { text: 'Анімація елементів' },
            { text: 'Спливання події від дитини до батька', correct: true },
            { text: 'Створення подій' },
            { text: 'Видалення подій' }
          ]
        },
        {
          text: 'Різниця між null та undefined?',
          explanation: 'undefined - не визначено, null - явно встановлене порожнє значення.',
          tags: ['JS', 'Types'],
          difficulty: 'Easy',
          options: [
            { text: 'Однакові' },
            { text: 'null - явно порожнє, undefined - не визначено', correct: true },
            { text: 'null для чисел' },
            { text: 'undefined тільки для об\'єктів' }
          ]
        }
      ]
    }]
  })

  // Security basics
  await upsertTopic('web-security', {
    name: 'Web Security',
    nameJson: { UA: 'Веб-безпека', PL: 'Bezpieczeństwo webowe', EN: 'Web Security' },
    description: 'XSS, CSRF, SQL Injection',
    descJson: { UA: 'XSS, CSRF, SQL Injection', PL: 'XSS, CSRF, SQL Injection', EN: 'XSS, CSRF, SQL Injection' },
    category: 'Security',
    materials: [
      { title: 'Common Vulnerabilities', type: 'text', content: '**OWASP Top 10:**\n\n1. **Injection**: SQL, NoSQL, OS commands\n2. **Broken Authentication**\n3. **Sensitive Data Exposure**\n4. **XXE**: XML External Entities\n5. **Broken Access Control**\n6. **Security Misconfiguration**\n7. **XSS**: Cross-Site Scripting\n8. **Insecure Deserialization**\n9. **Using Components with Known Vulnerabilities**\n10. **Insufficient Logging & Monitoring**' },
      { title: 'Web Security Video', type: 'video', url: 'https://www.youtube.com/watch?v=WlmKwIe9z1Q' },
    ],
    quizzes: [{
      title: 'Security Fundamentals',
      durationSec: 150,
      questions: [
        {
          text: 'Що таке XSS?',
          explanation: 'XSS - впровадження шкідливого JavaScript коду в веб-сторінку.',
          tags: ['Security', 'XSS'],
          difficulty: 'Easy',
          options: [
            { text: 'SQL атака' },
            { text: 'Cross-Site Scripting', correct: true },
            { text: 'Brute force' },
            { text: 'DDOS атака' }
          ]
        },
        {
          text: 'CSRF атака це…',
          explanation: 'CSRF змушує користувача виконати небажану дію на сайті де він авторизований.',
          tags: ['Security', 'CSRF'],
          difficulty: 'Medium',
          options: [
            { text: 'Впровадження SQL' },
            { text: 'Підробка міжсайтових запитів', correct: true },
            { text: 'Крадіжка паролів' },
            { text: 'Переповнення буфера' }
          ]
        },
        {
          text: 'Як захиститися від SQL Injection?',
          explanation: 'Параметризовані запити та ORM захищають від SQL Injection.',
          tags: ['Security', 'SQL'],
          difficulty: 'Medium',
          options: [
            { text: 'Більше фаєрволів' },
            { text: 'Параметризовані запити', correct: true },
            { text: 'HTTPS' },
            { text: 'Сильніші паролі' }
          ]
        },
        {
          text: 'Що робить HTTPS?',
          explanation: 'HTTPS шифрує трафік між клієнтом та сервером.',
          tags: ['Security', 'HTTPS'],
          difficulty: 'Easy',
          options: [
            { text: 'Прискорює сайт' },
            { text: 'Шифрує трафік', correct: true },
            { text: 'Блокує рекламу' },
            { text: 'Валідує HTML' }
          ]
        },
        {
          text: 'Що таке JWT?',
          explanation: 'JWT - JSON Web Token для авторизації без стану.',
          tags: ['Security', 'Auth'],
          difficulty: 'Medium',
          options: [
            { text: 'Мова програмування' },
            { text: 'Токен авторизації', correct: true },
            { text: 'Тип бази даних' },
            { text: 'Протокол мережі' }
          ]
        },
        {
          text: 'CORS захищає від…',
          explanation: 'CORS обмежує крос-доменні запити з браузера.',
          tags: ['Security', 'CORS'],
          difficulty: 'Medium',
          options: [
            { text: 'SQL Injection' },
            { text: 'Несанкціонованих крос-доменних запитів', correct: true },
            { text: 'Вірусів' },
            { text: 'DDoS' }
          ]
        },
        {
          text: 'Як безпечно зберігати паролі?',
          explanation: 'Паролі хешуються з сіллю (bcrypt, argon2).',
          tags: ['Security', 'Passwords'],
          difficulty: 'Medium',
          options: [
            { text: 'В plain text' },
            { text: 'Хешування з сіллю', correct: true },
            { text: 'Base64 кодування' },
            { text: 'MD5 хеш' }
          ]
        },
        {
          text: 'Що таке 2FA?',
          explanation: 'Two-Factor Authentication - додатковий рівень захисту.',
          tags: ['Security', 'Auth'],
          difficulty: 'Easy',
          options: [
            { text: 'Два паролі' },
            { text: 'Двофакторна авторизація', correct: true },
            { text: 'Двійкове шифрування' },
            { text: 'Дві бази даних' }
          ]
        }
      ]
    }]
  })

  console.log('')

  // ===== 3. Translations =====
  console.log('🌐 Seeding translations...')
  
  // Category translations
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
    if (!exists) {
      await prisma.categoryTranslation.create({ data: cat })
    }
  }
  console.log('  ✓ Category translations')

  // Daily Goal Templates
  const existingGoals = await prisma.dailyGoalTemplate.count()
  if (existingGoals === 0) {
    await prisma.dailyGoalTemplate.createMany({
      data: [
        { category: 'quiz', weight: 1, translations: { UA: 'Пройти 1 квіз', PL: 'Zrób 1 quiz', EN: 'Complete 1 quiz' } },
        { category: 'quiz', weight: 1, translations: { UA: 'Пройти 2 квізи', PL: 'Zrób 2 quizy', EN: 'Complete 2 quizzes' } },
        { category: 'quiz', weight: 2, translations: { UA: 'Отримати 100% у квізі', PL: 'Zdobądź 100% w quizie', EN: 'Get 100% in a quiz' } },
        { category: 'materials', weight: 1, translations: { UA: 'Переглянути 3 матеріали', PL: 'Obejrzyj 3 materiały', EN: 'View 3 materials' } },
        { category: 'materials', weight: 1, translations: { UA: 'Подивитись 1 відео', PL: 'Obejrzyj 1 wideo', EN: 'Watch 1 video' } },
        { category: 'learning', weight: 1, translations: { UA: 'Завчити нове поняття', PL: 'Naucz się nowej koncepcji', EN: 'Learn a new concept' } },
        { category: 'practice', weight: 1, translations: { UA: 'Вирішити 3 задачі', PL: 'Rozwiąż 3 zadania', EN: 'Solve 3 problems' } },
        { category: 'review', weight: 1, translations: { UA: 'Переглянути помилки у квізах', PL: 'Przejrzyj błędy w quizach', EN: 'Review quiz mistakes' } },
      ]
    })
    console.log('  ✓ Daily goal templates')
  }

  // Weak Spot Templates
  const existingWeakSpots = await prisma.weakSpotTemplate.count()
  if (existingWeakSpots === 0) {
    await prisma.weakSpotTemplate.createMany({
      data: [
        { category: 'algorithms', weight: 1, translations: { topic: { UA: 'Рекурсія', PL: 'Rekurencja', EN: 'Recursion' }, advice: { UA: 'Перегляньте конспект та пройдіть додаткові тести', PL: 'Przejrzyj notatki i zrób dodatkowe testy', EN: 'Review notes and take additional tests' } } },
        { category: 'sql', weight: 1, translations: { topic: { UA: 'SQL INNER JOIN', PL: 'SQL INNER JOIN', EN: 'SQL INNER JOIN' }, advice: { UA: 'Практикуйте з реальними прикладами даних', PL: 'Praktykuj z rzeczywistymi przykładami danych', EN: 'Practice with real data examples' } } },
        { category: 'complexity', weight: 1, translations: { topic: { UA: 'Big-O нотація', PL: 'Notacja Big-O', EN: 'Big-O Notation' }, advice: { UA: 'Подивіться відео-пояснення та вирішіть 3 задачі', PL: 'Zobacz wyjaśnienie wideo i rozwiąż 3 zadania', EN: 'Watch video explanation and solve 3 problems' } } },
      ]
    })
    console.log('  ✓ Weak spot templates')
  }

  // Achievement Templates
  const existingAchievements = await prisma.achievementTemplate.count()
  if (existingAchievements === 0) {
    await prisma.achievementTemplate.createMany({
      data: [
        { code: 'first_quiz', icon: '🎯', xpReward: 50, translations: { name: { UA: 'Перший квіз', PL: 'Pierwszy quiz', EN: 'First Quiz' }, description: { UA: 'Пройдіть свій перший квіз', PL: 'Ukończ swój pierwszy quiz', EN: 'Complete your first quiz' } } },
        { code: 'week_streak', icon: '🔥', xpReward: 100, translations: { name: { UA: 'Тиждень поспіль', PL: 'Tydzień z rzędu', EN: 'Week Streak' }, description: { UA: 'Навчайтесь 7 днів поспіль', PL: 'Ucz się przez 7 dni z rzędu', EN: 'Study for 7 days in a row' } } },
        { code: 'perfect_score', icon: '💯', xpReward: 75, translations: { name: { UA: 'Ідеальний результат', PL: 'Idealny wynik', EN: 'Perfect Score' }, description: { UA: 'Отримайте 100% в будь-якому квізі', PL: 'Zdobądź 100% w dowolnym quizie', EN: 'Get 100% in any quiz' } } },
      ]
    })
    console.log('  ✓ Achievement templates')
  }

  // UI Translations (тільки якщо немає)
  const existingUi = await prisma.uiTranslation.count()
  if (existingUi === 0) {
    const uiKeys = [
      // Common
      { key: 'common.loading', translations: { UA: 'Завантаження...', PL: 'Ładowanie...', EN: 'Loading...' } },
      { key: 'common.save', translations: { UA: 'Зберегти', PL: 'Zapisz', EN: 'Save' } },
      { key: 'common.cancel', translations: { UA: 'Скасувати', PL: 'Anuluj', EN: 'Cancel' } },
      { key: 'common.delete', translations: { UA: 'Видалити', PL: 'Usuń', EN: 'Delete' } },
      { key: 'common.edit', translations: { UA: 'Редагувати', PL: 'Edytuj', EN: 'Edit' } },
      { key: 'common.create', translations: { UA: 'Створити', PL: 'Utwórz', EN: 'Create' } },
      { key: 'common.search', translations: { UA: 'Пошук', PL: 'Szukaj', EN: 'Search' } },
      { key: 'common.refresh', translations: { UA: 'Оновити', PL: 'Odśwież', EN: 'Refresh' } },
      { key: 'common.actions', translations: { UA: 'Дії', PL: 'Akcje', EN: 'Actions' } },
      { key: 'common.status', translations: { UA: 'Статус', PL: 'Status', EN: 'Status' } },
      { key: 'common.name', translations: { UA: 'Назва', PL: 'Nazwa', EN: 'Name' } },
      { key: 'common.email', translations: { UA: 'Email', PL: 'Email', EN: 'Email' } },
      { key: 'common.role', translations: { UA: 'Роль', PL: 'Rola', EN: 'Role' } },
      { key: 'common.total', translations: { UA: 'Всього', PL: 'Łącznie', EN: 'Total' } },
      { key: 'common.page', translations: { UA: 'Сторінка', PL: 'Strona', EN: 'Page' } },
      { key: 'common.of', translations: { UA: 'з', PL: 'z', EN: 'of' } },
      
      // Nav
      { key: 'nav.dashboard', translations: { UA: 'Дашборд', PL: 'Panel', EN: 'Dashboard' } },
      { key: 'nav.materials', translations: { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials' } },
      { key: 'nav.quiz', translations: { UA: 'Квізи', PL: 'Quiz', EN: 'Quiz' } },
      { key: 'nav.leaderboard', translations: { UA: 'Рейтинг', PL: 'Ranking', EN: 'Leaderboard' } },
      { key: 'nav.profile', translations: { UA: 'Профіль', PL: 'Profil', EN: 'Profile' } },
      { key: 'nav.admin', translations: { UA: 'Адмін', PL: 'Admin', EN: 'Admin' } },
      { key: 'nav.logout', translations: { UA: 'Вийти', PL: 'Wyloguj', EN: 'Logout' } },
      
      // Quiz
      { key: 'quiz.title', translations: { UA: 'Квізи', PL: 'Quiz', EN: 'Quizzes' } },
      { key: 'quiz.completed', translations: { UA: 'Квіз завершено!', PL: 'Quiz ukończony!', EN: 'Quiz completed!' } },
      
      // Materials
      { key: 'materials.title', translations: { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials' } },
      
      // Auth
      { key: 'auth.login', translations: { UA: 'Вхід', PL: 'Logowanie', EN: 'Login' } },
      { key: 'auth.register', translations: { UA: 'Реєстрація', PL: 'Rejestracja', EN: 'Register' } },
      
      // Admin Panel
      { key: 'admin.panel', translations: { UA: 'Панель адміністратора', PL: 'Panel administracyjny', EN: 'Admin Panel' } },
      { key: 'admin.dashboard', translations: { UA: 'Дашборд', PL: 'Tablica', EN: 'Dashboard' } },
      { key: 'admin.dashboardDescription', translations: { UA: 'Огляд системи та статистика', PL: 'Przegląd systemu i statystyki', EN: 'System overview and statistics' } },
      { key: 'admin.users', translations: { UA: 'Користувачі', PL: 'Użytkownicy', EN: 'Users' } },
      { key: 'admin.usersDescription', translations: { UA: 'Керування обліковими записами', PL: 'Zarządzanie kontami', EN: 'Manage user accounts' } },
      { key: 'admin.content', translations: { UA: 'Контент', PL: 'Treści', EN: 'Content' } },
      { key: 'admin.contentDescription', translations: { UA: 'Теми, матеріали та квізи', PL: 'Tematy, materiały i quizy', EN: 'Topics, materials and quizzes' } },
      { key: 'admin.files', translations: { UA: 'Файли', PL: 'Pliki', EN: 'Files' } },
      { key: 'admin.filesDescription', translations: { UA: 'Медіафайли та документи', PL: 'Pliki multimedialne i dokumenty', EN: 'Media files and documents' } },
      { key: 'admin.translations', translations: { UA: 'Переклади', PL: 'Tłumaczenia', EN: 'Translations' } },
      { key: 'admin.auditLogs', translations: { UA: 'Журнал дій', PL: 'Dziennik działań', EN: 'Audit Logs' } },
      { key: 'admin.auditLogsDescription', translations: { UA: 'Історія системних дій', PL: 'Historia działań systemowych', EN: 'System activity history' } },
      { key: 'admin.settings', translations: { UA: 'Налаштування', PL: 'Ustawienia', EN: 'Settings' } },
      { key: 'admin.totalUsers', translations: { UA: 'Всього користувачів', PL: 'Łącznie użytkowników', EN: 'Total Users' } },
      { key: 'admin.totalTopics', translations: { UA: 'Всього тем', PL: 'Łącznie tematów', EN: 'Total Topics' } },
      { key: 'admin.totalMaterials', translations: { UA: 'Всього матеріалів', PL: 'Łącznie materiałów', EN: 'Total Materials' } },
      { key: 'admin.totalFiles', translations: { UA: 'Всього файлів', PL: 'Łącznie plików', EN: 'Total Files' } },
      { key: 'admin.usersByRole', translations: { UA: 'Користувачі за ролями', PL: 'Użytkownicy według ról', EN: 'Users by Role' } },
      { key: 'admin.recentActivity', translations: { UA: 'Остання активність', PL: 'Ostatnia aktywność', EN: 'Recent Activity' } },
      { key: 'admin.searchUsers', translations: { UA: 'Пошук користувачів...', PL: 'Szukaj użytkowników...', EN: 'Search users...' } },
      { key: 'admin.createUser', translations: { UA: 'Створити користувача', PL: 'Utwórz użytkownika', EN: 'Create User' } },
      { key: 'admin.allRoles', translations: { UA: 'Всі ролі', PL: 'Wszystkie role', EN: 'All Roles' } },
      { key: 'admin.changeRole', translations: { UA: 'Змінити роль', PL: 'Zmień rolę', EN: 'Change Role' } },
      { key: 'admin.deleteUser', translations: { UA: 'Видалити користувача', PL: 'Usuń użytkownika', EN: 'Delete User' } },
      { key: 'admin.deleteUserConfirm', translations: { UA: 'Ви впевнені, що хочете видалити цього користувача?', PL: 'Czy na pewno chcesz usunąć tego użytkownika?', EN: 'Are you sure you want to delete this user?' } },
      { key: 'admin.noUsersFound', translations: { UA: 'Користувачів не знайдено', PL: 'Nie znaleziono użytkowników', EN: 'No users found' } },
      { key: 'admin.verified', translations: { UA: 'Підтверджений', PL: 'Zweryfikowany', EN: 'Verified' } },
      { key: 'admin.unverified', translations: { UA: 'Не підтверджений', PL: 'Niezweryfikowany', EN: 'Unverified' } },
      { key: 'admin.deleteFile', translations: { UA: 'Видалити файл', PL: 'Usuń plik', EN: 'Delete File' } },
      { key: 'admin.deleteFileConfirm', translations: { UA: 'Ви впевнені, що хочете видалити цей файл?', PL: 'Czy na pewno chcesz usunąć ten plik?', EN: 'Are you sure you want to delete this file?' } },
      { key: 'admin.noFilesFound', translations: { UA: 'Файлів не знайдено', PL: 'Nie znaleziono plików', EN: 'No files found' } },
      { key: 'admin.noLogsFound', translations: { UA: 'Записів не знайдено', PL: 'Nie znaleziono wpisów', EN: 'No logs found' } },
      { key: 'admin.viewDetails', translations: { UA: 'Детальніше', PL: 'Szczegóły', EN: 'View Details' } },
    ]
    await prisma.uiTranslation.createMany({ data: uiKeys })
    console.log('  ✓ UI translations (basic set)')
  }

  console.log('\n✅ Seed completed successfully!')
  console.log('   Existing user data has been PRESERVED.')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
