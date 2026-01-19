import { Lang } from '@elearn/shared'

export type WeakSpotTemplate = {
  id: string
  category: 'algorithms' | 'sql' | 'dataStructures' | 'programming' | 'networks' | 'math'
  translations: {
    topic: Record<Lang, string>
    advice: Record<Lang, string>
  }
  weight?: number
}

export const weakSpotsDatabase: WeakSpotTemplate[] = [
  // Algorithms
  {
    id: 'w1',
    category: 'algorithms',
    weight: 1,
    translations: {
      topic: { UA: 'Рекурсія', PL: 'Rekurencja', EN: 'Recursion' },
      advice: { UA: 'Перегляньте конспект та пройдіть додаткові тести', PL: 'Przejrzyj notatki i zrób dodatkowe testy', EN: 'Review notes and take additional tests' }
    }
  },
  {
    id: 'w2',
    category: 'algorithms',
    weight: 1,
    translations: {
      topic: { UA: 'Big-O нотація', PL: 'Notacja Big-O', EN: 'Big-O Notation' },
      advice: { UA: 'Подивіться відео-пояснення та вирішіть 3 задачі', PL: 'Zobacz wyjaśnienie wideo i rozwiąż 3 zadania', EN: 'Watch video explanation and solve 3 problems' }
    }
  },
  {
    id: 'w3',
    category: 'algorithms',
    weight: 1,
    translations: {
      topic: { UA: 'QuickSort', PL: 'QuickSort', EN: 'QuickSort' },
      advice: { UA: 'Практикуйте реалізацію алгоритму вручну', PL: 'Ćwicz ręczną implementację algorytmu', EN: 'Practice manual algorithm implementation' }
    }
  },
  {
    id: 'w4',
    category: 'algorithms',
    weight: 1,
    translations: {
      topic: { UA: 'Бінарний пошук', PL: 'Wyszukiwanie binarne', EN: 'Binary Search' },
      advice: { UA: 'Вирішіть 5 задач на відсортованих масивах', PL: 'Rozwiąż 5 zadań na posortowanych tablicach', EN: 'Solve 5 problems on sorted arrays' }
    }
  },
  {
    id: 'w5',
    category: 'algorithms',
    weight: 1,
    translations: {
      topic: { UA: 'Динамічне програмування', PL: 'Programowanie dynamiczne', EN: 'Dynamic Programming' },
      advice: { UA: 'Почніть з задачі Fibonacci та поступово ускладнюйте', PL: 'Zacznij od problemu Fibonacciego i stopniowo komplikuj', EN: 'Start with Fibonacci problem and gradually increase complexity' }
    }
  },
  
  // SQL
  {
    id: 'w6',
    category: 'sql',
    weight: 1,
    translations: {
      topic: { UA: 'SQL INNER JOIN', PL: 'SQL INNER JOIN', EN: 'SQL INNER JOIN' },
      advice: { UA: 'Практикуйте з реальними прикладами даних', PL: 'Praktykuj z rzeczywistymi przykładami danych', EN: 'Practice with real data examples' }
    }
  },
  {
    id: 'w7',
    category: 'sql',
    weight: 1,
    translations: {
      topic: { UA: 'LEFT vs RIGHT JOIN', PL: 'LEFT vs RIGHT JOIN', EN: 'LEFT vs RIGHT JOIN' },
      advice: { UA: 'Створіть діаграму Венна для візуалізації', PL: 'Stwórz diagram Venna dla wizualizacji', EN: 'Create Venn diagram for visualization' }
    }
  },
  {
    id: 'w8',
    category: 'sql',
    weight: 1,
    translations: {
      topic: { UA: 'GROUP BY та агрегації', PL: 'GROUP BY i agregacje', EN: 'GROUP BY and aggregations' },
      advice: { UA: 'Вирішіть 10 задач на групування даних', PL: 'Rozwiąż 10 zadań grupowania danych', EN: 'Solve 10 data grouping problems' }
    }
  },
  {
    id: 'w9',
    category: 'sql',
    weight: 1,
    translations: {
      topic: { UA: 'Підзапити (Subqueries)', PL: 'Podzapytania (Subqueries)', EN: 'Subqueries' },
      advice: { UA: 'Перепишіть 3 JOIN запити у вигляді підзапитів', PL: 'Przepisz 3 zapytania JOIN jako podzapytania', EN: 'Rewrite 3 JOIN queries as subqueries' }
    }
  },
  {
    id: 'w10',
    category: 'sql',
    weight: 1,
    translations: {
      topic: { UA: 'Індекси та оптимізація', PL: 'Indeksy i optymalizacja', EN: 'Indexes and optimization' },
      advice: { UA: 'Вивчіть EXPLAIN PLAN для 5 повільних запитів', PL: 'Naucz się EXPLAIN PLAN dla 5 wolnych zapytań', EN: 'Learn EXPLAIN PLAN for 5 slow queries' }
    }
  },
  
  // Data Structures
  {
    id: 'w11',
    category: 'dataStructures',
    weight: 1,
    translations: {
      topic: { UA: 'Хеш-таблиці', PL: 'Tablice mieszające', EN: 'Hash Tables' },
      advice: { UA: 'Реалізуйте власну хеш-таблицю з нуля', PL: 'Zaimplementuj własną tablicę mieszającą od zera', EN: 'Implement your own hash table from scratch' }
    }
  },
  {
    id: 'w12',
    category: 'dataStructures',
    weight: 1,
    translations: {
      topic: { UA: 'Графи - обхід в глибину', PL: 'Grafy - przeszukiwanie w głąb', EN: 'Graphs - DFS' },
      advice: { UA: 'Візуалізуйте обхід на 3 різних графах', PL: 'Zwizualizuj przeszukiwanie na 3 różnych grafach', EN: 'Visualize traversal on 3 different graphs' }
    }
  },
  {
    id: 'w13',
    category: 'dataStructures',
    weight: 1,
    translations: {
      topic: { UA: 'Дерева пошуку (BST)', PL: 'Drzewa wyszukiwań (BST)', EN: 'Binary Search Trees' },
      advice: { UA: 'Реалізуйте вставку, видалення та пошук', PL: 'Zaimplementuj wstawianie, usuwanie i wyszukiwanie', EN: 'Implement insert, delete and search' }
    }
  },
  {
    id: 'w14',
    category: 'dataStructures',
    weight: 1,
    translations: {
      topic: { UA: 'Черги та стеки', PL: 'Kolejki i stosy', EN: 'Queues and Stacks' },
      advice: { UA: 'Вирішіть 5 задач з використанням обох структур', PL: 'Rozwiąż 5 zadań używając obu struktur', EN: 'Solve 5 problems using both structures' }
    }
  },
  {
    id: 'w15',
    category: 'dataStructures',
    weight: 1,
    translations: {
      topic: { UA: 'Зв\'язані списки', PL: 'Listy powiązane', EN: 'Linked Lists' },
      advice: { UA: 'Попрактикуйте реверс списку та знаходження циклів', PL: 'Poćwicz odwracanie listy i znajdowanie cykli', EN: 'Practice list reversal and cycle detection' }
    }
  },
  
  // Programming
  {
    id: 'w16',
    category: 'programming',
    weight: 1,
    translations: {
      topic: { UA: 'ООП принципи', PL: 'Zasady OOP', EN: 'OOP Principles' },
      advice: { UA: 'Перегляньте приклади SOLID принципів', PL: 'Przejrzyj przykłady zasad SOLID', EN: 'Review SOLID principles examples' }
    }
  },
  {
    id: 'w17',
    category: 'programming',
    weight: 1,
    translations: {
      topic: { UA: 'Асинхронне програмування', PL: 'Programowanie asynchroniczne', EN: 'Asynchronous Programming' },
      advice: { UA: 'Вивчіть Promise, async/await на 10 прикладах', PL: 'Naucz się Promise, async/await na 10 przykładach', EN: 'Learn Promise, async/await with 10 examples' }
    }
  },
  {
    id: 'w18',
    category: 'programming',
    weight: 1,
    translations: {
      topic: { UA: 'Шаблони проектування', PL: 'Wzorce projektowe', EN: 'Design Patterns' },
      advice: { UA: 'Реалізуйте Factory, Observer, Singleton', PL: 'Zaimplementuj Factory, Observer, Singleton', EN: 'Implement Factory, Observer, Singleton' }
    }
  },
  {
    id: 'w19',
    category: 'programming',
    weight: 1,
    translations: {
      topic: { UA: 'Тестування коду', PL: 'Testowanie kodu', EN: 'Code Testing' },
      advice: { UA: 'Напишіть unit-тести для 3 модулів', PL: 'Napisz testy jednostkowe dla 3 modułów', EN: 'Write unit tests for 3 modules' }
    }
  },
  {
    id: 'w20',
    category: 'programming',
    weight: 1,
    translations: {
      topic: { UA: 'Git workflow', PL: 'Git workflow', EN: 'Git Workflow' },
      advice: { UA: 'Попрактикуйте merge, rebase, cherry-pick', PL: 'Poćwicz merge, rebase, cherry-pick', EN: 'Practice merge, rebase, cherry-pick' }
    }
  },
  
  // Networks
  {
    id: 'w21',
    category: 'networks',
    weight: 1,
    translations: {
      topic: { UA: 'OSI модель', PL: 'Model OSI', EN: 'OSI Model' },
      advice: { UA: 'Створіть mind-map з усіма 7 рівнями', PL: 'Stwórz mapę myśli z wszystkimi 7 warstwami', EN: 'Create mind-map with all 7 layers' }
    }
  },
  {
    id: 'w22',
    category: 'networks',
    weight: 1,
    translations: {
      topic: { UA: 'TCP vs UDP', PL: 'TCP vs UDP', EN: 'TCP vs UDP' },
      advice: { UA: 'Порівняйте протоколи на реальних прикладах', PL: 'Porównaj protokoły na rzeczywistych przykładach', EN: 'Compare protocols with real examples' }
    }
  },
  {
    id: 'w23',
    category: 'networks',
    weight: 1,
    translations: {
      topic: { UA: 'HTTP методи та коди', PL: 'Metody i kody HTTP', EN: 'HTTP Methods and Codes' },
      advice: { UA: 'Вивчіть всі коди статусів 2xx-5xx', PL: 'Naucz się wszystkich kodów statusów 2xx-5xx', EN: 'Learn all status codes 2xx-5xx' }
    }
  },
  {
    id: 'w24',
    category: 'networks',
    weight: 1,
    translations: {
      topic: { UA: 'REST API дизайн', PL: 'Projektowanie REST API', EN: 'REST API Design' },
      advice: { UA: 'Спроектуйте API для 2 різних систем', PL: 'Zaprojektuj API dla 2 różnych systemów', EN: 'Design API for 2 different systems' }
    }
  },
  {
    id: 'w25',
    category: 'networks',
    weight: 1,
    translations: {
      topic: { UA: 'DNS та маршрутизація', PL: 'DNS i routing', EN: 'DNS and Routing' },
      advice: { UA: 'Проаналізуйте traceroute для 5 доменів', PL: 'Przeanalizuj traceroute dla 5 domen', EN: 'Analyze traceroute for 5 domains' }
    }
  },
  
  // Math
  {
    id: 'w26',
    category: 'math',
    weight: 1,
    translations: {
      topic: { UA: 'Лінійна алгебра', PL: 'Algebra liniowa', EN: 'Linear Algebra' },
      advice: { UA: 'Вирішіть 10 задач з матрицями', PL: 'Rozwiąż 10 zadań z macierzami', EN: 'Solve 10 matrix problems' }
    }
  },
  {
    id: 'w27',
    category: 'math',
    weight: 1,
    translations: {
      topic: { UA: 'Теорія ймовірностей', PL: 'Rachunek prawdopodobieństwa', EN: 'Probability Theory' },
      advice: { UA: 'Попрактикуйте задачі з комбінаторики', PL: 'Poćwicz zadania z kombinatoryki', EN: 'Practice combinatorics problems' }
    }
  },
  {
    id: 'w28',
    category: 'math',
    weight: 1,
    translations: {
      topic: { UA: 'Дискретна математика', PL: 'Matematyka dyskretna', EN: 'Discrete Mathematics' },
      advice: { UA: 'Вивчіть графи, дерева та теорію множин', PL: 'Naucz się grafów, drzew i teorii zbiorów', EN: 'Learn graphs, trees and set theory' }
    }
  },
  {
    id: 'w29',
    category: 'math',
    weight: 1,
    translations: {
      topic: { UA: 'Логіка та докази', PL: 'Logika i dowody', EN: 'Logic and Proofs' },
      advice: { UA: 'Попрактикуйте математичну індукцію', PL: 'Poćwicz indukcję matematyczną', EN: 'Practice mathematical induction' }
    }
  },
  {
    id: 'w30',
    category: 'math',
    weight: 1,
    translations: {
      topic: { UA: 'Числові методи', PL: 'Metody numeryczne', EN: 'Numerical Methods' },
      advice: { UA: 'Реалізуйте метод Ньютона та бісекції', PL: 'Zaimplementuj metodę Newtona i bisekcji', EN: 'Implement Newton and bisection methods' }
    }
  },
]

export type TipTemplate = {
  id: string
  translations: Record<Lang, string>
}

export const tipsDatabase: TipTemplate[] = [
  {
    id: 't1',
    translations: {
      UA: 'Приділяйте 15 хвилин щодня практиці — це покращить результати на 40%!',
      PL: 'Poświęcaj 15 minut dziennie na praktykę — to poprawi wyniki o 40%!',
      EN: 'Spend 15 minutes daily on practice — it will improve results by 40%!'
    }
  },
  {
    id: 't2',
    translations: {
      UA: 'Робіть перерву кожні 25 хвилин (техніка Pomodoro)',
      PL: 'Rób przerwę co 25 minut (technika Pomodoro)',
      EN: 'Take a break every 25 minutes (Pomodoro technique)'
    }
  },
  {
    id: 't3',
    translations: {
      UA: 'Навчайтеся вранці - мозок працює найефективніше',
      PL: 'Ucz się rano - mózg działa najefektywniej',
      EN: 'Study in the morning - brain works most effectively'
    }
  },
  {
    id: 't4',
    translations: {
      UA: 'Пояснюйте вивчене іншим - це закріплює знання',
      PL: 'Wyjaśniaj nauczone innym - to utrwala wiedzę',
      EN: 'Explain learned material to others - it reinforces knowledge'
    }
  },
  {
    id: 't5',
    translations: {
      UA: 'Повторюйте матеріал через день, тиждень і місяць',
      PL: 'Powtarzaj materiał po dniu, tygodniu i miesiącu',
      EN: 'Review material after a day, week and month'
    }
  },
  {
    id: 't6',
    translations: {
      UA: 'Використовуйте метод Feynman: поясніть тему простими словами',
      PL: 'Użyj metody Feynmana: wyjaśnij temat prostymi słowami',
      EN: 'Use Feynman technique: explain topic in simple words'
    }
  },
  {
    id: 't7',
    translations: {
      UA: 'Ставте конкретні цілі на день, тиждень і місяць',
      PL: 'Ustalaj konkretne cele na dzień, tydzień i miesiąc',
      EN: 'Set specific goals for day, week and month'
    }
  },
  {
    id: 't8',
    translations: {
      UA: 'Практикуйте активний recall - намагайтеся згадати без підказок',
      PL: 'Ćwicz aktywne przypominanie - próbuj przypomnieć bez podpowiedzi',
      EN: 'Practice active recall - try to remember without hints'
    }
  },
  {
    id: 't9',
    translations: {
      UA: 'Створюйте mind-maps для візуалізації зв\'язків між темами',
      PL: 'Twórz mapy myśli do wizualizacji powiązań między tematami',
      EN: 'Create mind-maps to visualize connections between topics'
    }
  },
  {
    id: 't10',
    translations: {
      UA: 'Навчайтеся в тихому місці без відволікаючих факторів',
      PL: 'Ucz się w cichym miejscu bez czynników rozpraszających',
      EN: 'Study in quiet place without distractions'
    }
  },
]
