import { Lang } from '@/store/i18n'

export type DailyGoalTemplate = {
  id: string
  category: 'quiz' | 'materials' | 'learning' | 'practice' | 'review'
  translations: Record<Lang, string>
  weight?: number
}

export const dailyGoalsDatabase: DailyGoalTemplate[] = [
  // Quiz Goals
  { id: 'g1', category: 'quiz', translations: { UA: 'Пройти 1 квіз', PL: 'Zrób 1 quiz', EN: 'Complete 1 quiz' }, weight: 1 },
  { id: 'g2', category: 'quiz', translations: { UA: 'Пройти 2 квізи', PL: 'Zrób 2 quizy', EN: 'Complete 2 quizzes' }, weight: 1 },
  { id: 'g3', category: 'quiz', translations: { UA: 'Отримати 100% у квізі', PL: 'Zdobądź 100% w quizie', EN: 'Get 100% in a quiz' }, weight: 2 },
  { id: 'g4', category: 'quiz', translations: { UA: 'Пройти квіз без помилок', PL: 'Przejdź quiz bez błędów', EN: 'Pass quiz without mistakes' }, weight: 2 },
  { id: 'g5', category: 'quiz', translations: { UA: 'Відповісти на 10 питань', PL: 'Odpowiedz na 10 pytań', EN: 'Answer 10 questions' }, weight: 1 },
  
  // Materials Goals
  { id: 'g6', category: 'materials', translations: { UA: 'Переглянути 3 матеріали', PL: 'Obejrzyj 3 materiały', EN: 'View 3 materials' }, weight: 1 },
  { id: 'g7', category: 'materials', translations: { UA: 'Прочитати 2 конспекти', PL: 'Przeczytaj 2 notatki', EN: 'Read 2 notes' }, weight: 1 },
  { id: 'g8', category: 'materials', translations: { UA: 'Подивитись 1 відео', PL: 'Obejrzyj 1 wideo', EN: 'Watch 1 video' }, weight: 1 },
  { id: 'g9', category: 'materials', translations: { UA: 'Завантажити 2 PDF файли', PL: 'Pobierz 2 pliki PDF', EN: 'Download 2 PDF files' }, weight: 1 },
  { id: 'g10', category: 'materials', translations: { UA: 'Переглянути 5 матеріалів', PL: 'Obejrzyj 5 materiałów', EN: 'View 5 materials' }, weight: 2 },
  
  // Learning Goals
  { id: 'g11', category: 'learning', translations: { UA: 'Завчити нове поняття', PL: 'Naucz się nowej koncepcji', EN: 'Learn a new concept' }, weight: 1 },
  { id: 'g12', category: 'learning', translations: { UA: 'Повторити минулу тему', PL: 'Powtórz poprzedni temat', EN: 'Review previous topic' }, weight: 1 },
  { id: 'g13', category: 'learning', translations: { UA: 'Зробити нотатки з теми', PL: 'Zrób notatki z tematu', EN: 'Make notes on topic' }, weight: 1 },
  { id: 'g14', category: 'learning', translations: { UA: 'Вивчити 5 нових термінів', PL: 'Naucz się 5 nowych terminów', EN: 'Learn 5 new terms' }, weight: 2 },
  { id: 'g15', category: 'learning', translations: { UA: 'Завершити 1 розділ', PL: 'Ukończ 1 rozdział', EN: 'Complete 1 section' }, weight: 1 },
  
  // Practice Goals
  { id: 'g16', category: 'practice', translations: { UA: 'Вирішити 3 задачі', PL: 'Rozwiąż 3 zadania', EN: 'Solve 3 problems' }, weight: 1 },
  { id: 'g17', category: 'practice', translations: { UA: 'Написати код алгоритму', PL: 'Napisz kod algorytmu', EN: 'Write algorithm code' }, weight: 2 },
  { id: 'g18', category: 'practice', translations: { UA: 'Практикувати 30 хвилин', PL: 'Ćwicz przez 30 minut', EN: 'Practice for 30 minutes' }, weight: 1 },
  { id: 'g19', category: 'practice', translations: { UA: 'Виконати практичне завдання', PL: 'Wykonaj zadanie praktyczne', EN: 'Complete practical task' }, weight: 2 },
  { id: 'g20', category: 'practice', translations: { UA: 'Реалізувати приклад з уроку', PL: 'Zaimplementuj przykład z lekcji', EN: 'Implement example from lesson' }, weight: 1 },
  
  // Review Goals
  { id: 'g21', category: 'review', translations: { UA: 'Переглянути помилки у квізах', PL: 'Przejrzyj błędy w quizach', EN: 'Review quiz mistakes' }, weight: 1 },
  { id: 'g22', category: 'review', translations: { UA: 'Повторити слабкі теми', PL: 'Powtórz słabe tematy', EN: 'Review weak topics' }, weight: 1 },
  { id: 'g23', category: 'review', translations: { UA: 'Переглянути минулий урок', PL: 'Przejrzyj poprzednią lekцію', EN: 'Review previous lesson' }, weight: 1 },
  { id: 'g24', category: 'review', translations: { UA: 'Повторити ключові поняття', PL: 'Powtórz kluczowe pojęcia', EN: 'Review key concepts' }, weight: 2 },
  { id: 'g25', category: 'review', translations: { UA: 'Зробити підсумки тижня', PL: 'Zrób podsumowanie tygodnia', EN: 'Make weekly summary' }, weight: 1 },
  
  // Additional Goals
  { id: 'g26', category: 'quiz', translations: { UA: 'Пройти швидкий квіз за 5 хв', PL: 'Przejdź szybki quiz w 5 min', EN: 'Pass quick quiz in 5 min' }, weight: 1 },
  { id: 'g27', category: 'materials', translations: { UA: 'Вивчити новий підрозділ', PL: 'Naucz się nowej podsekcji', EN: 'Learn new subsection' }, weight: 1 },
  { id: 'g28', category: 'learning', translations: { UA: 'Зрозуміти складну тему', PL: 'Zrozum trudny temat', EN: 'Understand difficult topic' }, weight: 2 },
  { id: 'g29', category: 'practice', translations: { UA: 'Попрактикувати навички', PL: 'Poćwicz umiejętności', EN: 'Practice skills' }, weight: 1 },
  { id: 'g30', category: 'review', translations: { UA: 'Підготуватись до екзамену', PL: 'Przygotuj się do egzaminu', EN: 'Prepare for exam' }, weight: 1 },
  
  // More diverse goals
  { id: 'g31', category: 'quiz', translations: { UA: 'Набрати 75% у будь-якому квізі', PL: 'Zdobądź 75% w dowolnym quizie', EN: 'Score 75% in any quiz' }, weight: 1 },
  { id: 'g32', category: 'materials', translations: { UA: 'Вивчити 3 різні типи матеріалів', PL: 'Naucz się 3 różnych typów materiałów', EN: 'Study 3 different material types' }, weight: 1 },
  { id: 'g33', category: 'learning', translations: { UA: 'Створити mind-map з теми', PL: 'Stwórz mapę myśli z tematu', EN: 'Create mind-map of topic' }, weight: 2 },
  { id: 'g34', category: 'practice', translations: { UA: 'Запрограмувати рішення задачі', PL: 'Zaprogramuj rozwiązanie problemu', EN: 'Code problem solution' }, weight: 2 },
  { id: 'g35', category: 'review', translations: { UA: 'Переглянути всі нотатки за тиждень', PL: 'Przejrzyj wszystkie notatki z tygodnia', EN: 'Review all weekly notes' }, weight: 1 },
  
  { id: 'g36', category: 'quiz', translations: { UA: 'Пройти 3 легких квізи', PL: 'Przejdź 3 łatwe quizy', EN: 'Pass 3 easy quizzes' }, weight: 1 },
  { id: 'g37', category: 'materials', translations: { UA: 'Дослідити нову категорію', PL: 'Zbadaj nową kategorię', EN: 'Explore new category' }, weight: 1 },
  { id: 'g38', category: 'learning', translations: { UA: 'Вивчити практичний приклад', PL: 'Naucz się praktycznego przykładu', EN: 'Learn practical example' }, weight: 2 },
  { id: 'g39', category: 'practice', translations: { UA: 'Вирішити середню задачу', PL: 'Rozwiąż średnie zadanie', EN: 'Solve medium problem' }, weight: 1 },
  { id: 'g40', category: 'review', translations: { UA: 'Повторити 2 минулі теми', PL: 'Powtórz 2 poprzednie tematy', EN: 'Review 2 past topics' }, weight: 1 },
  
  { id: 'g41', category: 'quiz', translations: { UA: 'Отримати бейдж за квіз', PL: 'Zdobądź odznakę za quiz', EN: 'Earn quiz badge' }, weight: 1 },
  { id: 'g42', category: 'materials', translations: { UA: 'Переглянути всі PDF у розділі', PL: 'Obejrzyj wszystkie PDF w sekcji', EN: 'View all PDFs in section' }, weight: 1 },
  { id: 'g43', category: 'learning', translations: { UA: 'Зробити конспект з 3 тем', PL: 'Zrób notatki z 3 tematów', EN: 'Make notes on 3 topics' }, weight: 2 },
  { id: 'g44', category: 'practice', translations: { UA: 'Написати 50 рядків коду', PL: 'Napisz 50 linii kodu', EN: 'Write 50 lines of code' }, weight: 2 },
  { id: 'g45', category: 'review', translations: { UA: 'Перевірити свої знання тестом', PL: 'Sprawdź swoją wiedzę testem', EN: 'Test your knowledge' }, weight: 1 },
  
  { id: 'g46', category: 'quiz', translations: { UA: 'Пройти складний квіз', PL: 'Przejdź trudny quiz', EN: 'Pass difficult quiz' }, weight: 1 },
  { id: 'g47', category: 'materials', translations: { UA: 'Вивчити відео-урок повністю', PL: 'Naucz się całej lekcji wideo', EN: 'Complete video lesson fully' }, weight: 1 },
  { id: 'g48', category: 'learning', translations: { UA: 'Вивчити алгоритм із прикладами', PL: 'Naucz się algorytmu z przykładami', EN: 'Learn algorithm with examples' }, weight: 2 },
  { id: 'g49', category: 'practice', translations: { UA: 'Виправити минулі помилки', PL: 'Popraw wcześniejsze błędy', EN: 'Fix previous mistakes' }, weight: 1 },
  { id: 'g50', category: 'review', translations: { UA: 'Підсумувати 3 вивчені теми', PL: 'Podsumuj 3 nauczone tematy', EN: 'Summarize 3 learned topics' }, weight: 1 },
]
