/**
 * Seed translations from frontend translations.ts to database
 * Run: npx tsx scripts/seed-translations.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define namespace from key prefix
function getNamespace(key: string): string {
  const prefix = key.split('.')[0]
  const namespaceMap: Record<string, string> = {
    'app': 'common',
    'common': 'common',
    'nav': 'navigation',
    'dashboard': 'dashboard',
    'materials': 'materials',
    'category': 'categories',
    'quiz': 'quiz',
    'lesson': 'lesson',
    'profile': 'profile',
    'auth': 'auth',
    'editor': 'editor',
    'error': 'error',
    'badge': 'badge',
    'leaderboard': 'leaderboard',
    'empty': 'empty',
    'search': 'search',
    'dialog': 'dialog',
  }
  return namespaceMap[prefix] || 'common'
}

// All translations extracted from frontend (JSON format: { UA, PL, EN })
const translationsData: Record<string, { UA: string; PL: string; EN: string; description?: string }> = {
  // Common
  'app.name': { UA: 'E-Learn', PL: 'E-Learn', EN: 'E-Learn', description: 'Application name' },
  'common.loading': { UA: 'Завантаження...', PL: 'Ładowanie...', EN: 'Loading...', description: 'Loading state text' },
  'common.error': { UA: 'Помилка', PL: 'Błąd', EN: 'Error', description: 'Generic error label' },
  'common.loadFailed': { UA: 'Не вдалося завантажити дані', PL: 'Nie udało się załadować danych', EN: 'Failed to load data', description: 'Data loading error message' },
  'common.save': { UA: 'Зберегти', PL: 'Zapisz', EN: 'Save', description: 'Save button text' },
  'common.cancel': { UA: 'Скасувати', PL: 'Anuluj', EN: 'Cancel', description: 'Cancel button text' },
  'common.delete': { UA: 'Видалити', PL: 'Usuń', EN: 'Delete', description: 'Delete button text' },
  'common.edit': { UA: 'Редагувати', PL: 'Edytuj', EN: 'Edit', description: 'Edit button text' },
  'common.create': { UA: 'Створити', PL: 'Utwórz', EN: 'Create', description: 'Create button text' },
  'common.close': { UA: 'Закрити', PL: 'Zamknij', EN: 'Close', description: 'Close button text' },
  'common.continue': { UA: 'Продовжити', PL: 'Kontynuuj', EN: 'Continue', description: 'Continue button text' },
  'common.back': { UA: 'Назад', PL: 'Wstecz', EN: 'Back', description: 'Back button text' },
  'common.completed': { UA: 'Завершено', PL: 'Ukończono', EN: 'Completed', description: 'Completed status' },
  'common.saving': { UA: 'Збереження...', PL: 'Zapisywanie...', EN: 'Saving...', description: 'Saving state' },
  'common.processing': { UA: 'Обробка...', PL: 'Przetwarzanie...', EN: 'Processing...', description: 'Processing state' },
  'common.goHome': { UA: 'На головну', PL: 'Na stronę główną', EN: 'Go Home', description: 'Home link' },
  'common.goBack': { UA: 'Назад', PL: 'Wstecz', EN: 'Go Back', description: 'Back link' },
  'common.seconds': { UA: 'секунд', PL: 'sekund', EN: 'seconds', description: 'Seconds unit' },
  'common.update': { UA: 'Оновити', PL: 'Aktualizuj', EN: 'Update', description: 'Update button' },

  // Navigation
  'nav.dashboard': { UA: 'Дашборд', PL: 'Panel', EN: 'Dashboard', description: 'Dashboard nav link' },
  'nav.materials': { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials', description: 'Materials nav link' },
  'nav.quiz': { UA: 'Квізи', PL: 'Quiz', EN: 'Quiz', description: 'Quiz nav link' },
  'nav.leaderboard': { UA: 'Рейтинг', PL: 'Ranking', EN: 'Leaderboard', description: 'Leaderboard nav link' },
  'nav.profile': { UA: 'Профіль', PL: 'Profil', EN: 'Profile', description: 'Profile nav link' },
  'nav.editor': { UA: 'Редактор', PL: 'Edytor', EN: 'Editor', description: 'Editor nav link' },
  'nav.login': { UA: 'Увійти', PL: 'Zaloguj', EN: 'Login', description: 'Login nav link' },
  'nav.register': { UA: 'Реєстрація', PL: 'Rejestracja', EN: 'Register', description: 'Register nav link' },
  'nav.logout': { UA: 'Вийти', PL: 'Wyloguj', EN: 'Logout', description: 'Logout nav link' },

  // Dashboard
  'dashboard.welcome': { UA: 'Вітаємо', PL: 'Witaj', EN: 'Welcome', description: 'Welcome greeting' },
  'dashboard.level': { UA: 'Рівень', PL: 'Poziom', EN: 'Level', description: 'User level label' },
  'dashboard.nextLevel': { UA: 'До наступного рівня', PL: 'Do następnego poziomu', EN: 'To next level', description: 'Next level progress label' },
  'dashboard.streak': { UA: 'Стрік', PL: 'Seria', EN: 'Streak', description: 'Learning streak label' },
  'dashboard.days': { UA: 'днів', PL: 'dni', EN: 'days', description: 'Days unit' },
  'dashboard.attempts': { UA: 'Спроби', PL: 'Próby', EN: 'Attempts', description: 'Quiz attempts label' },
  'dashboard.time': { UA: 'Час', PL: 'Czas', EN: 'Time', description: 'Time label' },
  'dashboard.achievements': { UA: 'Досягнення', PL: 'Osiągnięcia', EN: 'Achievements', description: 'Achievements section title' },
  'dashboard.dailyGoals': { UA: 'Щоденні цілі', PL: 'Cele dzienne', EN: 'Daily Goals', description: 'Daily goals section title' },
  'dashboard.continueLearning': { UA: 'Продовжити навчання', PL: 'Kontynuuj naukę', EN: 'Continue Learning', description: 'Continue learning section title' },
  'dashboard.recommended': { UA: 'Рекомендовано підтягнути', PL: 'Zalecane do poprawy', EN: 'Recommended to improve', description: 'Weak spots section title' },
  'dashboard.quickLinks': { UA: 'Швидкі посилання', PL: 'Szybkie linki', EN: 'Quick Links', description: 'Quick links section title' },
  'dashboard.community': { UA: 'Спільнота', PL: 'Społeczność', EN: 'Community', description: 'Community section' },
  'dashboard.tipOfDay': { UA: 'Порада дня', PL: 'Porada dnia', EN: 'Tip of the day', description: 'Daily tip title' },
  'dashboard.tipMessage': { UA: 'Приділяйте 15 хвилин щодня практиці — це покращить результати на 40%!', PL: 'Poświęcaj 15 minut dziennie na praktykę — to poprawi wyniki o 40%!', EN: 'Spend 15 minutes daily on practice — it will improve results by 40%!', description: 'Daily tip content' },
  'dashboard.done': { UA: 'Виконано', PL: 'Ukończone', EN: 'Done', description: 'Done status' },
  'dashboard.pending': { UA: 'В процесі', PL: 'W toku', EN: 'Pending', description: 'Pending status' },
  'dashboard.keepStreak': { UA: 'Продовжуй навчатися щодня, щоб зберегти стрік!', PL: 'Ucz się codziennie, aby utrzymać serię!', EN: 'Keep learning daily to maintain your streak!', description: 'Streak motivation message' },
  'dashboard.goToCourseChat': { UA: 'Перейти до чату курсу', PL: 'Przejdź do czatu kursu', EN: 'Go to course chat', description: 'Course chat link' },
  'dashboard.last7days': { UA: 'за 7 днів', PL: 'ostatnie 7 dni', EN: 'last 7 days', description: 'Last 7 days label' },
  'dashboard.recentActivity': { UA: 'Остання активність', PL: 'Ostatnia aktywność', EN: 'Recent Activity', description: 'Recent activity section' },
  'dashboard.allQuizzes': { UA: 'Всі квізи', PL: 'Wszystkie quizy', EN: 'All quizzes', description: 'All quizzes link' },
  'dashboard.startLearning': { UA: 'Почати навчання', PL: 'Zacznij naukę', EN: 'Start learning', description: 'Start learning CTA' },
  'dashboard.course.algorithms': { UA: 'Основи Алгоритмів', PL: 'Podstawy Algorytmów', EN: 'Algorithm Basics', description: 'Course name' },
  'dashboard.course.sql': { UA: 'SQL для початківців', PL: 'SQL dla początkujących', EN: 'SQL for Beginners', description: 'Course name' },
  'dashboard.lesson.quicksort': { UA: 'Урок 5: QuickSort', PL: 'Lekcja 5: QuickSort', EN: 'Lesson 5: QuickSort', description: 'Lesson title' },
  'dashboard.lesson.joins': { UA: 'Урок 3: JOIN операції', PL: 'Lekcja 3: Operacje JOIN', EN: 'Lesson 3: JOIN Operations', description: 'Lesson title' },
  'dashboard.goal.quiz': { UA: 'Пройти 1 квіз', PL: 'Zrób 1 quiz', EN: 'Complete 1 quiz', description: 'Daily goal' },
  'dashboard.goal.materials': { UA: 'Переглянути 3 матеріали', PL: 'Obejrzyj 3 materiały', EN: 'View 3 materials', description: 'Daily goal' },
  'dashboard.goal.concept': { UA: 'Завчити нове поняття', PL: 'Naucz się nowej koncepcji', EN: 'Learn a new concept', description: 'Daily goal' },
  'dashboard.weak.recursion': { UA: 'Рекурсія', PL: 'Rekurencja', EN: 'Recursion', description: 'Weak spot topic' },
  'dashboard.weak.recursion.advice': { UA: 'Перегляньте конспект та пройдіть додаткові тести', PL: 'Przejrzyj notatki i zrób dodatkowe testy', EN: 'Review notes and take additional tests', description: 'Weak spot advice' },
  'dashboard.weak.sqlJoin': { UA: 'SQL INNER JOIN', PL: 'SQL INNER JOIN', EN: 'SQL INNER JOIN', description: 'Weak spot topic' },
  'dashboard.weak.sqlJoin.advice': { UA: 'Практикуйте з реальними прикладами даних', PL: 'Praktykuj z rzeczywistymi przykładami danych', EN: 'Practice with real data examples', description: 'Weak spot advice' },
  'dashboard.weak.bigO': { UA: 'Big-O нотація', PL: 'Notacja Big-O', EN: 'Big-O Notation', description: 'Weak spot topic' },
  'dashboard.weak.bigO.advice': { UA: 'Подивіться відео-пояснення та вирішіть 3 задачі', PL: 'Zobacz wyjaśnienie wideo i rozwiąż 3 zadania', EN: 'Watch video explanation and solve 3 problems', description: 'Weak spot advice' },
  'dashboard.achievement.firstQuiz': { UA: 'Перший квіз', PL: 'Pierwszy quiz', EN: 'First Quiz', description: 'Achievement name' },
  'dashboard.achievement.weekStreak': { UA: 'Тиждень поспіль', PL: 'Tydzień z rzędu', EN: 'Week Streak', description: 'Achievement name' },
  'dashboard.achievement.fastAnswer': { UA: 'Швидка відповідь', PL: 'Szybka odpowiedź', EN: 'Fast Answer', description: 'Achievement name' },
  'dashboard.achievement.sqlMaster': { UA: 'Майстер SQL', PL: 'Mistrz SQL', EN: 'SQL Master', description: 'Achievement name' },
  'dashboard.weekday.mon': { UA: 'Пн', PL: 'Pn', EN: 'Mon', description: 'Monday' },
  'dashboard.weekday.tue': { UA: 'Вт', PL: 'Wt', EN: 'Tue', description: 'Tuesday' },
  'dashboard.weekday.wed': { UA: 'Ср', PL: 'Śr', EN: 'Wed', description: 'Wednesday' },
  'dashboard.weekday.thu': { UA: 'Чт', PL: 'Cz', EN: 'Thu', description: 'Thursday' },
  'dashboard.weekday.fri': { UA: 'Пт', PL: 'Pt', EN: 'Fri', description: 'Friday' },
  'dashboard.weekday.sat': { UA: 'Сб', PL: 'So', EN: 'Sat', description: 'Saturday' },
  'dashboard.weekday.sun': { UA: 'Нд', PL: 'Nd', EN: 'Sun', description: 'Sunday' },

  // Materials
  'materials.title': { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials', description: 'Page title' },
  'materials.all': { UA: 'Усі', PL: 'Wszystkie', EN: 'All', description: 'All filter' },
  'materials.pdf': { UA: 'PDF', PL: 'PDF', EN: 'PDF', description: 'PDF filter' },
  'materials.video': { UA: 'Відео', PL: 'Wideo', EN: 'Video', description: 'Video filter' },
  'materials.text': { UA: 'Текст', PL: 'Tekst', EN: 'Text', description: 'Text filter' },
  'materials.link': { UA: 'Посилання', PL: 'Link', EN: 'Link', description: 'Link filter' },
  'materials.progress': { UA: 'Прогрес', PL: 'Postęp', EN: 'Progress', description: 'Progress label' },
  'materials.open': { UA: 'Відкрити', PL: 'Otwórz', EN: 'Open', description: 'Open button' },
  'materials.viewed': { UA: 'Переглянуто', PL: 'Obejrzane', EN: 'Viewed', description: 'Viewed status' },
  'materials.sections': { UA: 'Розділи', PL: 'Sekcje', EN: 'Sections', description: 'Sections label' },
  'materials.searchPlaceholder': { UA: 'Пошук матеріалів...', PL: 'Szukaj materiałów...', EN: 'Search materials...', description: 'Search placeholder' },
  'materials.suggestedNext': { UA: 'Рекомендовано далі', PL: 'Polecane dalej', EN: 'Suggested next', description: 'Suggested next section' },
  'materials.section': { UA: 'Розділ', PL: 'Sekcja', EN: 'Section', description: 'Section label' },
  'materials.materialsCount': { UA: 'Матеріалів', PL: 'Materiałów', EN: 'Materials', description: 'Materials count' },
  'materials.completedCount': { UA: 'Пройдено', PL: 'Ukończono', EN: 'Completed', description: 'Completed count' },
  'materials.chooseSectionTitle': { UA: 'Обери розділ і розпочни маршрут', PL: 'Wybierz sekcję i zacznij naukę', EN: 'Choose a section and start learning', description: 'Section prompt title' },
  'materials.chooseSectionDesc': { UA: 'Кожен розділ містить конспекти, відео та міні-задачі.', PL: 'Każda sekcja zawiera notatki, filmy i mini-zadania.', EN: 'Each section contains notes, videos and mini-tasks.', description: 'Section prompt desc' },
  'materials.subtopics': { UA: 'Підтеми', PL: 'Podtematy', EN: 'Subtopics', description: 'Subtopics label' },
  'materials.showAll': { UA: 'Показати всі', PL: 'Pokaż wszystko', EN: 'Show all', description: 'Show all button' },
  'materials.categoriesAvailable': { UA: 'категорій доступно', PL: 'dostępnych kategorii', EN: 'categories available', description: 'Categories available' },
  'materials.completed': { UA: 'Завершено', PL: 'Ukończono', EN: 'Completed', description: 'Completed status' },
  'materials.mainSection': { UA: 'Основний розділ', PL: 'Główna sekcja', EN: 'Main section', description: 'Main section' },
  'materials.subSection': { UA: 'Підрозділ', PL: 'Podsekcja', EN: 'Subsection', description: 'Subsection' },
  'materials.noMaterials': { UA: 'Матеріали відсутні', PL: 'Brak materiałów', EN: 'No materials available', description: 'Empty state' },
  'materials.openExternal': { UA: 'Відкрити', PL: 'Otwórz', EN: 'Open', description: 'Open external' },
  'materials.download': { UA: 'Завантажити', PL: 'Pobierz', EN: 'Download', description: 'Download button' },
  'materials.openInNewTab': { UA: 'Відкрити у новій вкладці', PL: 'Otwórz w nowej karcie', EN: 'Open in new tab', description: 'New tab button' },
  'materials.externalLink': { UA: 'Зовнішнє посилання', PL: 'Link zewnętrzny', EN: 'External link', description: 'External link' },
  'materials.externalLinkDesc': { UA: 'Цей матеріал знаходиться на зовнішньому ресурсі', PL: 'Ten materiał znajduje się na zewnętrznym zasobie', EN: 'This material is on external resource', description: 'External link desc' },
  'materials.goToResource': { UA: 'Перейти до ресурсу', PL: 'Przejdź do zasobu', EN: 'Go to resource', description: 'Go to resource' },
  'materials.noContent': { UA: 'Контент недоступний', PL: 'Treść niedostępna', EN: 'Content unavailable', description: 'No content' },
  'materials.viewTime': { UA: 'Час перегляду', PL: 'Czas oglądania', EN: 'View time', description: 'View time' },
  'materials.viewAllMaterials': { UA: 'Перегляньте всі матеріали, щоб розблокувати тест', PL: 'Obejrzyj wszystkie materiały, aby odblokować test', EN: 'View all materials to unlock the test', description: 'Unlock message' },
  'materials.remaining': { UA: 'Залишилось', PL: 'Pozostało', EN: 'Remaining', description: 'Remaining' },
  'materials.materialsViewed': { UA: 'матеріалів переглянуто', PL: 'materiałów obejrzanych', EN: 'materials viewed', description: 'Materials viewed' },
  'materials.noSections': { UA: 'Розділи ще не додані', PL: 'Sekcje nie zostały jeszcze dodane', EN: 'Sections not yet added', description: 'No sections' },
  'materials.status.completed': { UA: 'Завершено', PL: 'Ukończono', EN: 'Completed', description: 'Status' },
  'materials.status.mainSection': { UA: 'Основний розділ', PL: 'Główna sekcja', EN: 'Main section', description: 'Status' },
  'materials.status.subSection': { UA: 'Підрозділ', PL: 'Podsekcja', EN: 'Sub-section', description: 'Status' },
  'materials.count.materials': { UA: 'матеріалів', PL: 'materiałów', EN: 'materials', description: 'Count' },
  'materials.empty.noMaterials': { UA: 'Матеріали відсутні', PL: 'Brak materiałów', EN: 'No materials available', description: 'Empty' },
  'materials.type.pdf': { UA: 'PDF', PL: 'PDF', EN: 'PDF', description: 'Type' },
  'materials.type.video': { UA: 'Відео', PL: 'Wideo', EN: 'Video', description: 'Type' },
  'materials.type.link': { UA: 'Посилання', PL: 'Link', EN: 'Link', description: 'Type' },
  'materials.type.text': { UA: 'Текст', PL: 'Tekst', EN: 'Text', description: 'Type' },

  // Categories
  'category.programming': { UA: 'Програмування', PL: 'Programowanie', EN: 'Programming', description: 'Category' },
  'category.mathematics': { UA: 'Математика', PL: 'Matematyka', EN: 'Mathematics', description: 'Category' },
  'category.databases': { UA: 'Бази даних', PL: 'Bazy danych', EN: 'Databases', description: 'Category' },
  'category.networks': { UA: 'Мережі', PL: 'Sieci', EN: 'Networks', description: 'Category' },
  'category.webDevelopment': { UA: 'Веб-розробка', PL: 'Tworzenie stron', EN: 'Web Development', description: 'Category' },
  'category.mobileDevelopment': { UA: 'Мобільна розробка', PL: 'Rozwój mobilny', EN: 'Mobile Development', description: 'Category' },
  'category.machineLearning': { UA: 'Машинне навчання', PL: 'Uczenie maszynowe', EN: 'Machine Learning', description: 'Category' },
  'category.security': { UA: 'Кібербезпека', PL: 'Cyberbezpieczeństwo', EN: 'Cybersecurity', description: 'Category' },
  'category.devops': { UA: 'DevOps', PL: 'DevOps', EN: 'DevOps', description: 'Category' },
  'category.operatingSystems': { UA: 'Операційні системи', PL: 'Systemy operacyjne', EN: 'Operating Systems', description: 'Category' },

  // Quiz
  'quiz.title': { UA: 'Квізи', PL: 'Quiz', EN: 'Quizzes', description: 'Page title' },
  'quiz.mode': { UA: 'Режим', PL: 'Tryb', EN: 'Mode', description: 'Mode label' },
  'quiz.practice': { UA: 'Практика', PL: 'Praktyka', EN: 'Practice', description: 'Practice mode' },
  'quiz.exam': { UA: 'Екзамен', PL: 'Egzamin', EN: 'Exam', description: 'Exam mode' },
  'quiz.selectQuiz': { UA: 'Обери квіз', PL: 'Wybierz quiz', EN: 'Select quiz', description: 'Select quiz' },
  'quiz.question': { UA: 'Питання', PL: 'Pytanie', EN: 'Question', description: 'Question label' },
  'quiz.of': { UA: 'з', PL: 'z', EN: 'of', description: 'Of preposition' },
  'quiz.time': { UA: 'Час', PL: 'Czas', EN: 'Time', description: 'Time label' },
  'quiz.result': { UA: 'Результат', PL: 'Wynik', EN: 'Result', description: 'Result label' },
  'quiz.completed': { UA: 'Квіз завершено!', PL: 'Quiz ukończony!', EN: 'Quiz completed!', description: 'Completed message' },
  'quiz.congratulations': { UA: 'Вітаємо з завершенням квізу!', PL: 'Gratulacje ukończenia quizu!', EN: 'Congratulations!', description: 'Congrats message' },
  'quiz.correctAnswers': { UA: 'правильних відповідей', PL: 'poprawnych odpowiedzi', EN: 'correct answers', description: 'Correct answers' },
  'quiz.tryAgain': { UA: 'Спробувати знову', PL: 'Spróbuj ponownie', EN: 'Try again', description: 'Try again button' },
  'quiz.backToMaterials': { UA: 'Повернутись до матеріалів', PL: 'Powrót do materiałów', EN: 'Back to materials', description: 'Back button' },
  'quiz.hints': { UA: 'Підказки', PL: 'Podpowiedzi', EN: 'Hints', description: 'Hints section' },
  'quiz.checklist': { UA: 'Чек-лист', PL: 'Lista kontrolna', EN: 'Checklist', description: 'Checklist' },
  'quiz.answer': { UA: 'Відповісти', PL: 'Odpowiedz', EN: 'Answer', description: 'Answer button' },
  'quiz.skip': { UA: 'Пропустити', PL: 'Pomiń', EN: 'Skip', description: 'Skip button' },
  'quiz.next': { UA: 'Далі', PL: 'Dalej', EN: 'Next', description: 'Next button' },
  'quiz.finish': { UA: 'Завершити квіз', PL: 'Zakończ quiz', EN: 'Finish quiz', description: 'Finish button' },
  'quiz.explanation': { UA: 'Пояснення', PL: 'Wyjaśnienie', EN: 'Explanation', description: 'Explanation' },
  'quiz.loading': { UA: 'Завантаження квізу...', PL: 'Ładowanie quizu...', EN: 'Loading quiz...', description: 'Loading' },
  'quiz.explanationImmediate': { UA: 'Пояснення одразу', PL: 'Wyjaśnienie od razu', EN: 'Instant explanation', description: 'Immediate explanation' },
  'quiz.questionUnavailable': { UA: 'Питання недоступне', PL: 'Pytanie niedostępne', EN: 'Question unavailable', description: 'Unavailable' },
  'quiz.showAnswer': { UA: 'Показати відповідь', PL: 'Pokaż odpowiedź', EN: 'Show answer', description: 'Show answer' },
  'quiz.nextQuestion': { UA: 'Наступне питання', PL: 'Następne pytanie', EN: 'Next question', description: 'Next question' },
  'quiz.hint.practice': { UA: 'У режимі Практика ти отримуєш пояснення одразу', PL: 'W trybie Praktyka dostajesz wyjaśnienie od razu', EN: 'In Practice mode you get explanation immediately', description: 'Practice hint' },
  'quiz.hint.exam': { UA: 'У режимі Екзамен час обмежений і немає підказок', PL: 'W trybie Egzamin czas jest ograniczony', EN: 'In Exam mode time is limited', description: 'Exam hint' },
  'quiz.hint.reviewMaterials': { UA: 'Переглядай матеріали перед проходженням квізу', PL: 'Przejrzyj materiały przed quizem', EN: 'Review materials before quiz', description: 'Review hint' },
  'quiz.checklist.reviewMaterials': { UA: 'Переглянути матеріали', PL: 'Przejrzyj materiały', EN: 'Review materials', description: 'Checklist item' },
  'quiz.checklist.pickMode': { UA: 'Вибрати режим квізу', PL: 'Wybierz tryb quizu', EN: 'Choose quiz mode', description: 'Checklist item' },
  'quiz.checklist.answerAll': { UA: 'Відповісти на всі питання', PL: 'Odpowiedz na wszystkie pytania', EN: 'Answer all questions', description: 'Checklist item' },
  'quiz.checklist.score75': { UA: 'Отримати ≥75% правильних', PL: 'Zdobądź ≥75% poprawnych', EN: 'Score ≥75% correct', description: 'Checklist item' },
  'quiz.noQuizzes': { UA: 'Немає доступних квізів', PL: 'Brak dostępnych quizów', EN: 'No quizzes available', description: 'Empty state' },
  'quiz.history': { UA: 'Історія спроб', PL: 'Historia prób', EN: 'Attempt history', description: 'History' },
  'quiz.noHistory': { UA: 'Ще немає спроб', PL: 'Brak prób', EN: 'No attempts yet', description: 'No history' },
  'quiz.loadingQuestion': { UA: 'Завантаження питання...', PL: 'Ładowanie pytania...', EN: 'Loading question...', description: 'Loading question' },
  'quiz.error': { UA: 'Сталася помилка. Спробуйте інший квіз.', PL: 'Wystąpił błąd. Spróbuj inny quiz.', EN: 'An error occurred. Try another quiz.', description: 'Error' },
  'quiz.start': { UA: 'Почати тест', PL: 'Rozpocznij test', EN: 'Start test', description: 'Start button' },
  'quiz.tryAgainMessage': { UA: 'Спробуйте ще раз', PL: 'Spróbuj ponownie', EN: 'Try again', description: 'Try again message' },  'quiz.mode.practice': { UA: 'Практика', PL: 'Praktyka', EN: 'Practice', description: 'Practice mode' },
  'quiz.shortcuts.hide': { UA: 'Сховати', PL: 'Ukryj', EN: 'Hide', description: 'Hide shortcuts' },
  'quiz.shortcuts.show': { UA: 'Гарячі клавіші', PL: 'Skróty klawiszowe', EN: 'Keyboard shortcuts', description: 'Show shortcuts' },
  'quiz.shortcuts.selectAnswer': { UA: 'Вибрати відповідь', PL: 'Wybierz odpowiedź', EN: 'Select answer', description: 'Shortcut' },
  'quiz.shortcuts.confirm': { UA: 'Підтвердити', PL: 'Potwierdź', EN: 'Confirm', description: 'Shortcut' },
  'quiz.shortcuts.nextQuestion': { UA: 'Наступне питання', PL: 'Następne pytanie', EN: 'Next question', description: 'Shortcut' },
  'quiz.shortcuts.skip': { UA: 'Пропустити', PL: 'Pomiń', EN: 'Skip', description: 'Shortcut' },
  'quiz.achievement.firstQuiz': { UA: '🏆 Перший квіз', PL: '🏆 Pierwszy quiz', EN: '🏆 First Quiz', description: 'Achievement' },
  'quiz.achievement.perfectScore': { UA: '⚡ 10/10', PL: '⚡ 10/10', EN: '⚡ 10/10', description: 'Achievement' },
  'quiz.achievement.accuracy90': { UA: '🎯 Точність 90%', PL: '🎯 Dokładność 90%', EN: '🎯 90% Accuracy', description: 'Achievement' },
  'quiz.error.historyLoadFailed': { UA: 'Не вдалося завантажити історію', PL: 'Nie udało się załadować historii', EN: 'Failed to load history', description: 'Error' },
  // Lesson
  'lesson.breadcrumb.algorithms': { UA: 'Алгоритми', PL: 'Algorytmy', EN: 'Algorithms', description: 'Breadcrumb' },
  'lesson.breadcrumb.search': { UA: 'Пошук', PL: 'Wyszukiwanie', EN: 'Search', description: 'Breadcrumb' },
  'lesson.breadcrumb.binarySearch': { UA: 'Бінарний пошук', PL: 'Wyszukiwanie binarne', EN: 'Binary Search', description: 'Breadcrumb' },
  'lesson.toc': { UA: 'Зміст', PL: 'Spis treści', EN: 'Contents', description: 'TOC' },
  'lesson.progress': { UA: 'Прогрес', PL: 'Postęp', EN: 'Progress', description: 'Progress' },
  'lesson.progressRequirement': { UA: 'Умова: переглянути ≥1 матеріал + квіз ≥75%', PL: 'Warunek: obejrzeć ≥1 materiał + quiz ≥75%', EN: 'Requirement: view ≥1 material + quiz ≥75%', description: 'Requirement' },
  'lesson.content.notes': { UA: 'Конспект', PL: 'Notatki', EN: 'Notes', description: 'Notes tab' },
  'lesson.content.video': { UA: 'Відео', PL: 'Wideo', EN: 'Video', description: 'Video tab' },
  'lesson.content.quiz': { UA: 'Квіз', PL: 'Quiz', EN: 'Quiz', description: 'Quiz tab' },
  'lesson.content.code': { UA: 'Практика коду', PL: 'Praktyka kodu', EN: 'Code practice', description: 'Code tab' },
  'lesson.questionCounter': { UA: 'Питання', PL: 'Pytanie', EN: 'Question', description: 'Counter' },
  'lesson.explanationTitle': { UA: 'Пояснення', PL: 'Wyjaśnienie', EN: 'Explanation', description: 'Explanation title' },
  'lesson.placeholder': { UA: 'Контент буде тут', PL: 'Treść będzie tutaj', EN: 'Content will be here', description: 'Placeholder' },
  'lesson.run': { UA: 'Запустити', PL: 'Uruchom', EN: 'Run', description: 'Run button' },
  'lesson.tests': { UA: 'Тести', PL: 'Testy', EN: 'Tests', description: 'Tests' },
  'lesson.testTitle': { UA: 'Тест', PL: 'Test', EN: 'Test', description: 'Test title' },
  'lesson.hint.sortedOnly': { UA: 'Бінарний пошук працює лише на відсортованих масивах', PL: 'Wyszukiwanie binarne działa tylko na posortowanych tablicach', EN: 'Binary search works only on sorted arrays', description: 'Hint' },
  'lesson.hint.splitHalf': { UA: 'На кожному кроці масив ділиться навпіл', PL: 'Na każdym kroku tablica dzieli się na pół', EN: 'Each step splits the array in half', description: 'Hint' },
  'lesson.hint.complexity': { UA: 'Складність завжди O(log n) у гіршому випадку', PL: 'Złożoność to zawsze O(log n) w najgorszym przypadku', EN: 'Complexity is always O(log n) in worst case', description: 'Hint' },
  'lesson.step': { UA: 'Крок', PL: 'Krok', EN: 'Step', description: 'Step label' },
  'lesson.mock.questionText': { UA: 'Яка часова складність бінарного пошуку в відсортованому масиві?', PL: 'Jaka jest złożoność czasowa wyszukiwania binarnego w posortowanej tablicy?', EN: 'What is the time complexity of binary search in a sorted array?', description: 'Mock question' },
  'lesson.mock.explanation': { UA: 'Бінарний пошук ділить масив навпіл на кожному кроці, тому складність O(log n).', PL: 'Wyszukiwanie binarne dzieli tablicę na pół na każdym kroku, więc złożoność to O(log n).', EN: 'Binary search divides the array in half at each step, so the complexity is O(log n).', description: 'Mock explanation' },
  'lesson.achievement.firstQuiz': { UA: '🏆 Перший квіз', PL: '🏆 Pierwszy quiz', EN: '🏆 First Quiz', description: 'Achievement' },
  'lesson.achievement.fastAnswer': { UA: '⚡ Швидка відповідь', PL: '⚡ Szybka odpowiedź', EN: '⚡ Fast Answer', description: 'Achievement' },
  'lesson.achievement.accuracy90': { UA: '🎯 Точність 90%', PL: '🎯 Dokładność 90%', EN: '🎯 90% Accuracy', description: 'Achievement' },
  'lesson.test.expected': { UA: 'Очікується:', PL: 'Oczekiwano:', EN: 'Expected:', description: 'Test expected' },
  'lesson.openPdf': { UA: 'Відкрити PDF', PL: 'Otwórz PDF', EN: 'Open PDF', description: 'Open PDF button' },
  'lesson.openLink': { UA: 'Відкрити посилання', PL: 'Otwórz link', EN: 'Open Link', description: 'Open link button' },
  'lesson.noContent': { UA: 'Контент недоступний', PL: 'Treść niedostępna', EN: 'Content not available', description: 'No content message' },
  'lesson.noVideo': { UA: 'Відео недоступне', PL: 'Wideo niedostępne', EN: 'Video not available', description: 'No video message' },

  // Profile
  'profile.title': { UA: 'Профіль', PL: 'Profil', EN: 'Profile', description: 'Page title' },
  'profile.name': { UA: "Ім'я", PL: 'Imię', EN: 'Name', description: 'Name field' },
  'profile.email': { UA: 'Email', PL: 'Email', EN: 'Email', description: 'Email field' },
  'profile.xp': { UA: 'XP', PL: 'XP', EN: 'XP', description: 'XP label' },
  'profile.badges': { UA: 'Бейджі', PL: 'Odznaki', EN: 'Badges', description: 'Badges' },
  'profile.settings': { UA: 'Налаштування', PL: 'Ustawienia', EN: 'Settings', description: 'Settings' },
  'profile.language': { UA: 'Мова інтерфейсу', PL: 'Język interfejsu', EN: 'Interface language', description: 'Language' },
  'profile.theme': { UA: 'Тема', PL: 'Motyw', EN: 'Theme', description: 'Theme' },
  'profile.light': { UA: 'Світла', PL: 'Jasny', EN: 'Light', description: 'Light theme' },
  'profile.dark': { UA: 'Темна', PL: 'Ciemny', EN: 'Dark', description: 'Dark theme' },
  'profile.badge.risingStar': { UA: 'Висхідна зірка', PL: 'Wschodząca gwiazda', EN: 'Rising Star', description: 'Badge' },
  'profile.badge.algorithmMaster': { UA: 'Майстер алгоритмів', PL: 'Mistrz algorytmów', EN: 'Algorithm Master', description: 'Badge' },
  'profile.error.selectImage': { UA: 'Будь ласка, виберіть зображення', PL: 'Proszę wybrać obraz', EN: 'Please select an image', description: 'Error' },
  'profile.error.imageTooLarge': { UA: 'Зображення не повинно перевищувати 300KB', PL: 'Obraz nie może przekraczać 300KB', EN: 'Image must not exceed 300KB', description: 'Error' },
  'profile.error.avatarUploadFailed': { UA: 'Не вдалося завантажити аватар', PL: 'Nie udało się przesłać awatara', EN: 'Failed to upload avatar', description: 'Error' },
  'profile.error.fileReadFailed': { UA: 'Не вдалося прочитати файл', PL: 'Nie udało się odczytać pliku', EN: 'Failed to read file', description: 'Error' },
  'profile.error.avatarDeleteFailed': { UA: 'Не вдалося видалити аватар', PL: 'Nie udało się usunąć awatara', EN: 'Failed to delete avatar', description: 'Error' },
  'profile.error.invalidEmail': { UA: 'Введіть коректну email адресу', PL: 'Wprowadź prawidłowy adres email', EN: 'Enter a valid email address', description: 'Error' },
  'profile.error.emailChangeFailed': { UA: 'Не вдалося змінити email', PL: 'Nie udało się zmienić emaila', EN: 'Failed to change email', description: 'Error' },
  'profile.error.passwordsNotMatch': { UA: 'Паролі не співпадають', PL: 'Hasła nie są zgodne', EN: 'Passwords dont match', description: 'Error' },
  'profile.error.passwordTooShort': { UA: 'Пароль повинен містити мінімум 8 символів', PL: 'Hasło musi mieć minimum 8 znaków', EN: 'Password must be at least 8 characters', description: 'Error' },
  'profile.error.passwordChangeFailed': { UA: 'Не вдалося змінити пароль', PL: 'Nie udało się zmienić hasła', EN: 'Failed to change password', description: 'Error' },
  'profile.action.removeAvatar': { UA: 'Видалити аватар', PL: 'Usuń awatar', EN: 'Remove avatar', description: 'Action' },
  'profile.action.changeEmail': { UA: 'Змінити email', PL: 'Zmień email', EN: 'Change email', description: 'Action' },
  'profile.action.changePassword': { UA: 'Змінити пароль', PL: 'Zmień hasło', EN: 'Change password', description: 'Action' },
  'profile.label.newEmail': { UA: 'Новий email', PL: 'Nowy email', EN: 'New email', description: 'Label' },
  'profile.label.currentPassword': { UA: 'Поточний пароль', PL: 'Obecne hasło', EN: 'Current password', description: 'Label' },
  'profile.label.newPassword': { UA: 'Новий пароль', PL: 'Nowe hasło', EN: 'New password', description: 'Label' },
  'profile.label.confirmNewPassword': { UA: 'Підтвердіть новий пароль', PL: 'Potwierdź nowe hasło', EN: 'Confirm new password', description: 'Label' },
  'profile.placeholder.newEmail': { UA: 'new@example.com', PL: 'new@example.com', EN: 'new@example.com', description: 'Placeholder' },
  'profile.success.emailChanged': { UA: 'Email успішно змінено!', PL: 'Email został zmieniony!', EN: 'Email changed successfully!', description: 'Success' },
  'profile.success.passwordChanged': { UA: 'Пароль успішно змінено!', PL: 'Hasło zostało zmienione!', EN: 'Password changed successfully!', description: 'Success' },

  // Auth
  'auth.login': { UA: 'Вхід', PL: 'Logowanie', EN: 'Login', description: 'Login page' },
  'auth.register': { UA: 'Реєстрація', PL: 'Rejestracja', EN: 'Register', description: 'Register page' },
  'auth.password': { UA: 'Пароль', PL: 'Hasło', EN: 'Password', description: 'Password field' },
  'auth.signIn': { UA: 'Увійти', PL: 'Zaloguj się', EN: 'Sign in', description: 'Sign in button' },
  'auth.createAccount': { UA: 'Створити акаунт', PL: 'Utwórz konto', EN: 'Create account', description: 'Create account' },
  'auth.noAccount': { UA: 'Немає акаунту?', PL: 'Nie masz konta?', EN: "Don't have an account?", description: 'No account' },
  'auth.hasAccount': { UA: 'Вже маєте акаунт?', PL: 'Masz już konto?', EN: 'Already have an account?', description: 'Has account' },
  'auth.confirmPassword': { UA: 'Підтвердіть пароль', PL: 'Potwierdź hasło', EN: 'Confirm password', description: 'Confirm password' },
  'auth.passwordsNotMatch': { UA: 'Паролі не співпадають', PL: 'Hasła nie pasują', EN: 'Passwords do not match', description: 'Mismatch error' },
  'auth.passwordMinLength': { UA: 'Пароль повинен містити мінімум 8 символів', PL: 'Hasło musi mieć minimum 8 znaków', EN: 'Password must be at least 8 characters', description: 'Length error' },
  'auth.namePlaceholder': { UA: 'Ваше імʼя', PL: 'Twoje imię', EN: 'Your name', description: 'Name placeholder' },
  'auth.error.loginFailed': { UA: 'Не вдалося увійти', PL: 'Logowanie nie powiodło się', EN: 'Login failed', description: 'Login error' },
  'auth.error.registrationFailed': { UA: 'Не вдалося зареєструватися', PL: 'Rejestracja nie powiodła się', EN: 'Registration failed', description: 'Registration error' },
  'auth.placeholder.email': { UA: 'your@email.com', PL: 'your@email.com', EN: 'your@email.com', description: 'Email placeholder' },

  // Error
  'error.pageNotFound': { UA: 'Сторінку не знайдено', PL: 'Strona nie znaleziona', EN: 'Page not found', description: '404 title' },
  'error.pageNotFoundDescription': { UA: 'Схоже, ця сторінка переїхала, була видалена, або ви ввели неправильну адресу.', PL: 'Wygląda na to, że ta strona została przeniesiona, usunięta lub wpisałeś nieprawidłowy adres.', EN: 'This page may have been moved, deleted, or you entered an incorrect address.', description: '404 description' },
  'error.youMightLookingFor': { UA: 'Можливо, ви шукали:', PL: 'Może szukasz:', EN: 'You might be looking for:', description: '404 suggestions' },
  'error.accessDenied': { UA: 'Доступ заборонено', PL: 'Dostęp zabroniony', EN: 'Access Denied', description: 'Access denied' },
  'error.noPermission': { UA: 'Ви не маєте дозволу на доступ до цієї сторінки.', PL: 'Nie masz uprawnień do tej strony.', EN: 'You dont have permission to access this page.', description: 'No permission' },

  // Badge
  'badge.firstSteps': { UA: 'Перші кроки', PL: 'Pierwsze kroki', EN: 'First Steps', description: 'Badge' },
  'badge.risingStar': { UA: 'Висхідна зірка', PL: 'Wschodząca gwiazda', EN: 'Rising Star', description: 'Badge' },
  'badge.dedicatedLearner': { UA: 'Відданий учень', PL: 'Oddany uczeń', EN: 'Dedicated Learner', description: 'Badge' },
  'badge.quizMaster': { UA: 'Майстер квізів', PL: 'Mistrz quizów', EN: 'Quiz Master', description: 'Badge' },
  'badge.expert': { UA: 'Експерт', PL: 'Ekspert', EN: 'Expert', description: 'Badge' },
  'badge.legend': { UA: 'Легенда', PL: 'Legenda', EN: 'Legend', description: 'Badge' },

  // Leaderboard
  'leaderboard.title': { UA: '🏆 Рейтинг', PL: '🏆 Ranking', EN: '🏆 Leaderboard', description: 'Leaderboard title' },
  'leaderboard.loading': { UA: 'Завантаження рейтингу...', PL: 'Ładowanie rankingu...', EN: 'Loading leaderboard...', description: 'Loading' },
  'leaderboard.participants': { UA: 'учасників', PL: 'uczestników', EN: 'participants', description: 'Participants count' },
  'leaderboard.level': { UA: 'Рівень', PL: 'Poziom', EN: 'Level', description: 'Level column' },
  'leaderboard.user': { UA: 'Користувач', PL: 'Użytkownik', EN: 'User', description: 'User column' },
  'leaderboard.badges': { UA: 'Бейджі', PL: 'Odznaki', EN: 'Badges', description: 'Badges column' },
  'leaderboard.you': { UA: 'Ви', PL: 'Ty', EN: 'You', description: 'Current user marker' },
  'leaderboard.error.loadFailed': { UA: 'Не вдалося завантажити рейтинг', PL: 'Nie udało się załadować rankingu', EN: 'Failed to load leaderboard', description: 'Error' },

  // Empty states
  'empty.materials.title': { UA: 'Матеріалів поки немає', PL: 'Brak materiałów', EN: 'No materials yet', description: 'Empty title' },
  'empty.materials.description': { UA: 'Тут зʼявляться навчальні матеріали, коли вони будуть додані', PL: 'Tu pojawią się materiały edukacyjne po ich dodaniu', EN: 'Learning materials will appear here when added', description: 'Empty desc' },
  'empty.materials.action': { UA: 'Переглянути категорії', PL: 'Zobacz kategorie', EN: 'View categories', description: 'Empty action' },
  'empty.search.title': { UA: 'Нічого не знайдено', PL: 'Nic nie znaleziono', EN: 'Nothing found', description: 'Empty title' },
  'empty.search.descriptionWithQuery': { UA: 'нічого не знайдено. Спробуйте інший пошуковий запит.', PL: 'nic nie znaleziono. Spróbuj innego zapytania.', EN: 'nothing found. Try another search query.', description: 'Empty desc with query' },
  'empty.search.descriptionNoQuery': { UA: 'Спробуйте змінити параметри пошуку', PL: 'Spróbuj zmienić parametry wyszukiwania', EN: 'Try changing search parameters', description: 'Empty desc no query' },
  'empty.search.action': { UA: 'Очистити пошук', PL: 'Wyczyść wyszukiwanie', EN: 'Clear search', description: 'Empty action' },
  'empty.leaderboard.title': { UA: 'Рейтинг порожній', PL: 'Ranking jest pusty', EN: 'Leaderboard is empty', description: 'Empty title' },
  'empty.leaderboard.description': { UA: 'Поки що ніхто не набрав балів. Станьте першим!', PL: 'Nikt jeszcze nie zdobył punktów. Bądź pierwszy!', EN: 'No one has scored yet. Be the first!', description: 'Empty desc' },
  'empty.quizHistory.title': { UA: 'Історія порожня', PL: 'Historia jest pusta', EN: 'History is empty', description: 'Empty title' },
  'empty.quizHistory.description': { UA: 'Ви ще не проходили жодного квізу. Почніть навчання зараз!', PL: 'Nie przeszedłeś jeszcze żadnego quizu. Zacznij naukę teraz!', EN: 'You havent taken any quizzes yet. Start learning now!', description: 'Empty desc' },
  'empty.quizHistory.action': { UA: 'Пройти квіз', PL: 'Rozwiąż quiz', EN: 'Take a quiz', description: 'Empty action' },
  'empty.progress.title': { UA: 'Прогресу поки немає', PL: 'Brak postępu', EN: 'No progress yet', description: 'Empty title' },
  'empty.progress.description': { UA: 'Почніть вивчати матеріали, щоб відстежувати свій прогрес', PL: 'Zacznij studiować materiały, aby śledzić swój postęp', EN: 'Start studying materials to track your progress', description: 'Empty desc' },
  'empty.progress.action': { UA: 'Почати навчання', PL: 'Rozpocznij naukę', EN: 'Start learning', description: 'Empty action' },
  'empty.topics.title': { UA: 'Топіків поки немає', PL: 'Brak tematów', EN: 'No topics yet', description: 'Empty title' },
  'empty.topics.description': { UA: 'Створіть перший топік для початку роботи', PL: 'Utwórz pierwszy temat, aby rozpocząć', EN: 'Create your first topic to get started', description: 'Empty desc' },
  'empty.topics.action': { UA: 'Створити топік', PL: 'Utwórz temat', EN: 'Create topic', description: 'Empty action' },
  'empty.recommendations.title': { UA: 'Рекомендацій поки немає', PL: 'Brak rekomendacji', EN: 'No recommendations yet', description: 'Empty title' },
  'empty.recommendations.description': { UA: 'Продовжуйте навчання, і система почне пропонувати персоналізовані рекомендації', PL: 'Kontynuuj naukę, a system zacznie proponować spersonalizowane rekomendacje', EN: 'Continue learning and the system will start offering personalized recommendations', description: 'Empty desc' },

  // Search
  'search.topicWith': { UA: 'Тема з', PL: 'Temat z', EN: 'Topic with', description: 'Search result' },
  'search.quizzes': { UA: 'квізами', PL: 'quizami', EN: 'quizzes', description: 'Search result' },
  'search.placeholder': { UA: 'Пошук...', PL: 'Szukaj...', EN: 'Search...', description: 'Search placeholder' },
  'search.fullPlaceholder': { UA: 'Шукати теми, квізи, матеріали...', PL: 'Szukaj tematów, quizów, materiałów...', EN: 'Search topics, quizzes, materials...', description: 'Search full placeholder' },
  'search.type.quiz': { UA: 'Квіз', PL: 'Quiz', EN: 'Quiz', description: 'Search type' },
  'search.type.topic': { UA: 'Тема', PL: 'Temat', EN: 'Topic', description: 'Search type' },
  'search.type.lesson': { UA: 'Урок', PL: 'Lekcja', EN: 'Lesson', description: 'Search type' },
  'search.noResults': { UA: 'Нічого не знайдено', PL: 'Nic nie znaleziono', EN: 'No results found', description: 'No results' },
  'search.tryAnother': { UA: 'Спробуйте інший запит', PL: 'Spróbuj innego zapytania', EN: 'Try another query', description: 'No results hint' },
  'search.startTyping': { UA: 'Почніть вводити для пошуку', PL: 'Zacznij pisać aby wyszukać', EN: 'Start typing to search', description: 'Search hint' },
  'search.hint.navigation': { UA: '↑↓ навігація', PL: '↑↓ nawigacja', EN: '↑↓ navigation', description: 'Keyboard hint' },
  'search.hint.select': { UA: 'Enter вибрати', PL: 'Enter wybierz', EN: 'Enter select', description: 'Keyboard hint' },
  'search.hint.close': { UA: 'Esc закрити', PL: 'Esc zamknij', EN: 'Esc close', description: 'Keyboard hint' },

  // Dialog
  'dialog.confirm': { UA: 'Підтвердити', PL: 'Potwierdź', EN: 'Confirm', description: 'Confirm button' },
  'dialog.cancel': { UA: 'Скасувати', PL: 'Anuluj', EN: 'Cancel', description: 'Cancel button' },
  'dialog.close': { UA: 'Закрити', PL: 'Zamknij', EN: 'Close', description: 'Close button' },
  'dialog.delete': { UA: 'Видалити', PL: 'Usuń', EN: 'Delete', description: 'Delete button' },
  'dialog.deleteConfirmation': { UA: 'Ви впевнені, що хочете видалити цей елемент? Цю дію неможливо скасувати.', PL: 'Czy na pewno chcesz usunąć ten element? Tej akcji nie można cofnąć.', EN: 'Are you sure you want to delete this item? This action cannot be undone.', description: 'Delete confirmation' },
  'dialog.logoutTitle': { UA: 'Вийти з акаунту?', PL: 'Wylogować się?', EN: 'Log out?', description: 'Logout title' },
  'dialog.logoutDescription': { UA: 'Ви будете перенаправлені на сторінку входу.', PL: 'Zostaniesz przekierowany na stronę logowania.', EN: 'You will be redirected to the login page.', description: 'Logout desc' },
  'dialog.logout': { UA: 'Вийти', PL: 'Wyloguj', EN: 'Log out', description: 'Logout button' },
  'dialog.stay': { UA: 'Залишитись', PL: 'Zostań', EN: 'Stay', description: 'Stay button' },
  'dialog.saveChangesTitle': { UA: 'Зберегти зміни?', PL: 'Zapisać zmiany?', EN: 'Save changes?', description: 'Save changes title' },
  'dialog.saveChangesDescription': { UA: 'Ви хочете зберегти внесені зміни перед виходом?', PL: 'Czy chcesz zapisać zmiany przed wyjściem?', EN: 'Do you want to save changes before leaving?', description: 'Save changes desc' },
  'dialog.save': { UA: 'Зберегти', PL: 'Zapisz', EN: 'Save', description: 'Save button' },
  'dialog.dontSave': { UA: 'Не зберігати', PL: 'Nie zapisuj', EN: 'Dont save', description: 'Dont save button' },

  // Editor
  'editor.topics': { UA: 'Теми', PL: 'Tematy', EN: 'Topics', description: 'Topics section' },
  'editor.materials': { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials', description: 'Materials section' },
  'editor.quizzes': { UA: 'Квізи', PL: 'Quizy', EN: 'Quizzes', description: 'Quizzes section' },
  'editor.create': { UA: 'Створити', PL: 'Utwórz', EN: 'Create', description: 'Create button' },
  'editor.edit': { UA: 'Редагувати', PL: 'Edytuj', EN: 'Edit', description: 'Edit button' },
  'editor.delete': { UA: 'Видалити', PL: 'Usuń', EN: 'Delete', description: 'Delete button' },
  'editor.title': { UA: 'Редактор', PL: 'Edytor', EN: 'Editor', description: 'Editor title' },
  'editor.tab.topics': { UA: 'Теми', PL: 'Tematy', EN: 'Topics', description: 'Topics tab' },
  'editor.tab.materials': { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials', description: 'Materials tab' },
  'editor.tab.quizzes': { UA: 'Квізи', PL: 'Quizy', EN: 'Quizzes', description: 'Quizzes tab' },
  'editor.label.activeTopic': { UA: 'Активна тема', PL: 'Aktywny temat', EN: 'Active topic', description: 'Label' },
  'editor.label.name': { UA: 'Назва', PL: 'Nazwa', EN: 'Name', description: 'Label' },
  'editor.label.slug': { UA: 'Slug', PL: 'Slug', EN: 'Slug', description: 'Label' },
  'editor.label.description': { UA: 'Опис', PL: 'Opis', EN: 'Description', description: 'Label' },
  'editor.label.category': { UA: 'Категорія', PL: 'Kategoria', EN: 'Category', description: 'Label' },
  'editor.label.title': { UA: 'Заголовок', PL: 'Tytuł', EN: 'Title', description: 'Label' },
  'editor.label.type': { UA: 'Тип', PL: 'Typ', EN: 'Type', description: 'Label' },
  'editor.label.language': { UA: 'Мова', PL: 'Język', EN: 'Language', description: 'Label' },
  'editor.label.url': { UA: 'URL', PL: 'URL', EN: 'URL', description: 'Label' },
  'editor.label.content': { UA: 'Контент', PL: 'Treść', EN: 'Content', description: 'Label' },
  'editor.label.quizTitle': { UA: 'Назва квізу', PL: 'Nazwa quizu', EN: 'Quiz Title', description: 'Label' },
  'editor.label.duration': { UA: 'Тривалість (секунди)', PL: 'Czas trwania (sekundy)', EN: 'Duration (seconds)', description: 'Label' },
  'editor.label.questions': { UA: 'питань', PL: 'pytań', EN: 'questions', description: 'Label' },
  'editor.label.questionText': { UA: 'Текст питання *', PL: 'Tekst pytania *', EN: 'Question Text *', description: 'Label' },
  'editor.label.explanation': { UA: 'Пояснення (показується після відповіді)', PL: 'Wyjaśnienie (pokazane po odpowiedzi)', EN: 'Explanation (shown after answer)', description: 'Label' },
  'editor.label.difficulty': { UA: 'Складність', PL: 'Trudność', EN: 'Difficulty', description: 'Label' },
  'editor.label.answerOptions': { UA: 'Варіанти відповідей *', PL: 'Opcje odpowiedzi *', EN: 'Answer Options *', description: 'Label' },
  'editor.title.editTopic': { UA: 'Редагувати тему', PL: 'Edytuj temat', EN: 'Edit topic', description: 'Title' },
  'editor.title.createTopic': { UA: 'Створити нову тему', PL: 'Utwórz nowy temat', EN: 'Create new topic', description: 'Title' },
  'editor.title.rootTopics': { UA: 'Кореневі теми', PL: 'Główne tematy', EN: 'Root topics', description: 'Title' },
  'editor.title.createMaterial': { UA: 'Створити матеріал', PL: 'Utwórz materiał', EN: 'Create material', description: 'Title' },
  'editor.title.structureTips': { UA: 'Поради щодо структури', PL: 'Wskazówki strukturalne', EN: 'Structure tips', description: 'Title' },
  'editor.title.materialsList': { UA: 'Список матеріалів', PL: 'Lista materiałów', EN: 'Materials list', description: 'Title' },
  'editor.title.editQuiz': { UA: 'Редагувати квіз', PL: 'Edytuj quiz', EN: 'Edit Quiz', description: 'Title' },
  'editor.title.createQuiz': { UA: 'Створити квіз', PL: 'Utwórz quiz', EN: 'Create Quiz', description: 'Title' },
  'editor.title.editQuestion': { UA: 'Редагувати питання', PL: 'Edytuj pytanie', EN: 'Edit Question', description: 'Title' },
  'editor.title.addQuestion': { UA: 'Додати питання', PL: 'Dodaj pytanie', EN: 'Add Question', description: 'Title' },
  'editor.placeholder.selectTopic': { UA: 'Оберіть тему...', PL: 'Wybierz temat...', EN: 'Select topic...', description: 'Placeholder' },
  'editor.placeholder.quizTitle': { UA: 'напр., Квіз з сортування', PL: 'np., Quiz o sortowaniu', EN: 'e.g., Sorting Algorithms Quiz', description: 'Placeholder' },
  'editor.placeholder.questionText': { UA: 'Введіть ваше питання...', PL: 'Wpisz swoje pytanie...', EN: 'Enter your question...', description: 'Placeholder' },
  'editor.placeholder.explanation': { UA: 'Поясніть правильну відповідь...', PL: 'Wyjaśnij prawidłową odpowiedź...', EN: 'Explain the correct answer...', description: 'Placeholder' },
  'editor.action.reloadList': { UA: 'Оновити список', PL: 'Odśwież listę', EN: 'Reload list', description: 'Action' },
  'editor.action.addQuestion': { UA: 'Додати питання', PL: 'Dodaj pytanie', EN: 'Add question', description: 'Action' },
  'editor.action.editQuiz': { UA: 'Редагувати квіз', PL: 'Edytuj quiz', EN: 'Edit quiz', description: 'Action' },
  'editor.action.deleteQuiz': { UA: 'Видалити квіз', PL: 'Usuń quiz', EN: 'Delete quiz', description: 'Action' },
  'editor.action.addOption': { UA: 'Додати варіант', PL: 'Dodaj opcję', EN: 'Add option', description: 'Action' },
  'editor.hint.selectTopic': { UA: 'Оберіть тему в бічній панелі.', PL: 'Wybierz temat w panelu bocznym.', EN: 'Select a topic in the left sidebar.', description: 'Hint' },
  'editor.hint.materialFields': { UA: 'Вкажіть заголовок, тип, мову, потім URL або контент.', PL: 'Podaj tytuł, typ, język, następnie URL lub treść.', EN: 'Provide title, type, language, then URL or content.', description: 'Hint' },
  'editor.hint.selectTopicForQuizzes': { UA: 'Оберіть тему в бічній панелі для керування квізами.', PL: 'Wybierz temat w panelu bocznym, aby zarządzać quizami.', EN: 'Select a topic in the left sidebar to manage quizzes.', description: 'Hint' },
  'editor.hint.correctAnswer': { UA: 'Правильна відповідь', PL: 'Prawidłowa odpowiedź', EN: 'Correct answer', description: 'Hint' },
  'editor.hint.markCorrect': { UA: 'Позначити як правильну', PL: 'Oznacz jako poprawną', EN: 'Mark as correct', description: 'Hint' },
  'editor.hint.optionsGuide': { UA: 'Натисніть на коло, щоб позначити правильну відповідь. Потрібно щонайменше 2 варіанти.', PL: 'Kliknij kółko, aby oznaczyć prawidłową odpowiedź. Wymagane min. 2 opcje.', EN: 'Click the circle to mark the correct answer. At least 2 options required.', description: 'Hint' },
  'editor.tip.clearTitles': { UA: 'Використовуйте зрозумілі назви (тема + формат).', PL: 'Używaj jasnych nazw (temat + format).', EN: 'Use clear titles (topic + format).', description: 'Tip' },
  'editor.tip.correctType': { UA: 'Оберіть правильний тип (pdf/video/link/text).', PL: 'Wybierz właściwy typ (pdf/video/link/text).', EN: 'Pick correct type (pdf/video/link/text).', description: 'Tip' },
  'editor.tip.matchLanguage': { UA: 'Встановіть мову відповідно до контенту.', PL: 'Ustaw język odpowiadający treści.', EN: 'Set language to match content.', description: 'Tip' },
  'editor.tip.textForNotes': { UA: 'Використовуйте text для швидких нотаток.', PL: 'Używaj text do szybkich notatek.', EN: 'Use text for quick summaries/notes.', description: 'Tip' },
  'editor.error.nameSlugRequired': { UA: 'Назва та slug обовʼязкові', PL: 'Nazwa i slug są wymagane', EN: 'Name and slug are required', description: 'Error' },
  'editor.error.selectTopicFirst': { UA: 'Спочатку оберіть тему', PL: 'Najpierw wybierz temat', EN: 'Select a topic first', description: 'Error' },
  'editor.error.titleTypeRequired': { UA: 'Заголовок та тип обовʼязкові', PL: 'Tytuł i typ są wymagane', EN: 'Title and type are required', description: 'Error' },
  'editor.error.loadTopicsFailed': { UA: 'Не вдалося завантажити теми', PL: 'Nie udało się załadować tematów', EN: 'Failed to load topics', description: 'Error' },
  'editor.error.titleRequired': { UA: 'Заголовок обовʼязковий', PL: 'Tytuł jest wymagany', EN: 'Title required', description: 'Error' },
  'editor.error.selectQuizFirst': { UA: 'Спочатку оберіть квіз', PL: 'Najpierw wybierz quiz', EN: 'Select a quiz first', description: 'Error' },
  'editor.error.questionTextRequired': { UA: 'Текст питання обовʼязковий', PL: 'Tekst pytania jest wymagany', EN: 'Question text required', description: 'Error' },
  'editor.error.minOptionsRequired': { UA: 'Потрібно щонайменше 2 варіанти', PL: 'Wymagane min. 2 opcje', EN: 'At least 2 options required', description: 'Error' },
  'editor.error.correctAnswerRequired': { UA: 'Потрібна хоча б одна правильна відповідь', PL: 'Wymagana min. 1 prawidłowa odpowiedź', EN: 'At least one correct answer required', description: 'Error' },
  'editor.success.topicUpdated': { UA: 'Тему оновлено', PL: 'Temat zaktualizowany', EN: 'Topic updated', description: 'Success' },
  'editor.success.topicCreated': { UA: 'Тему створено', PL: 'Temat utworzony', EN: 'Topic created', description: 'Success' },
  'editor.success.deleted': { UA: 'Видалено', PL: 'Usunięto', EN: 'Deleted', description: 'Success' },
  'editor.success.materialCreated': { UA: 'Матеріал створено', PL: 'Materiał utworzony', EN: 'Material created', description: 'Success' },
  'editor.success.quizUpdated': { UA: 'Квіз оновлено', PL: 'Quiz zaktualizowany', EN: 'Quiz updated', description: 'Success' },
  'editor.success.quizCreated': { UA: 'Квіз створено', PL: 'Quiz utworzony', EN: 'Quiz created', description: 'Success' },
  'editor.success.quizDeleted': { UA: 'Квіз видалено', PL: 'Quiz usunięty', EN: 'Quiz deleted', description: 'Success' },
  'editor.success.questionUpdated': { UA: 'Питання оновлено', PL: 'Pytanie zaktualizowane', EN: 'Question updated', description: 'Success' },
  'editor.success.questionCreated': { UA: 'Питання створено', PL: 'Pytanie utworzone', EN: 'Question created', description: 'Success' },
  'editor.success.questionDeleted': { UA: 'Питання видалено', PL: 'Pytanie usunięte', EN: 'Question deleted', description: 'Success' },
  'editor.confirm.deleteTopic': { UA: 'Видалити тему?', PL: 'Usunąć temat?', EN: 'Delete topic?', description: 'Confirm' },
  'editor.confirm.deleteQuiz': { UA: 'Видалити квіз і всі питання?', PL: 'Usunąć quiz i wszystkie pytania?', EN: 'Delete quiz and all questions?', description: 'Confirm' },
  'editor.confirm.deleteQuestion': { UA: 'Видалити це питання?', PL: 'Usunąć to pytanie?', EN: 'Delete this question?', description: 'Confirm' },
  'editor.empty.noTopics': { UA: 'Тем поки немає', PL: 'Brak tematów', EN: 'No topics yet', description: 'Empty' },
  'editor.empty.noMaterials': { UA: 'Матеріалів поки немає', PL: 'Brak materiałów', EN: 'No materials yet', description: 'Empty' },
  'editor.empty.noQuizzes': { UA: 'Квізів поки немає. Створіть один вище.', PL: 'Brak quizów. Utwórz jeden powyżej.', EN: 'No quizzes yet. Create one above.', description: 'Empty' },
  'editor.empty.noQuestions': { UA: 'Питань поки немає. Натисніть +, щоб додати.', PL: 'Brak pytań. Kliknij +, aby dodać.', EN: 'No questions yet. Click + to add one.', description: 'Empty' },
  'editor.loading.questions': { UA: 'Завантаження питань...', PL: 'Ładowanie pytań...', EN: 'Loading questions...', description: 'Loading' },
}

async function main() {
  console.log('🌍 Seeding translations...')
  
  let created = 0
  let updated = 0

  for (const [key, values] of Object.entries(translationsData)) {
    const namespace = getNamespace(key)
    const translations = { UA: values.UA, PL: values.PL, EN: values.EN }
    
    try {
      const existing = await prisma.uiTranslation.findUnique({
        where: { key }
      })

      if (existing) {
        await prisma.uiTranslation.update({
          where: { key },
          data: { 
            translations,
            namespace,
            description: values.description || null
          }
        })
        updated++
      } else {
        await prisma.uiTranslation.create({
          data: {
            key,
            translations,
            namespace,
            description: values.description || null
          }
        })
        created++
      }
    } catch (error) {
      console.error(`Error for ${key}:`, error)
    }
  }

  // Initialize TranslationVersion for each namespace
  const namespaces = [...new Set(Object.keys(translationsData).map(getNamespace))]
  
  for (const ns of namespaces) {
    await prisma.translationVersion.upsert({
      where: { namespace: ns },
      update: { version: { increment: 1 } },
      create: { namespace: ns, version: 1 }
    })
  }

  console.log(`✅ Translations seeded:`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Total keys: ${Object.keys(translationsData).length}`)
  console.log(`   Namespaces: ${namespaces.join(', ')}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
