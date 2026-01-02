// scripts/add-missing-translations.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const allTranslations = [
  // App
  { key: 'app.name', translations: { UA: 'E-Learning', PL: 'E-Learning', EN: 'E-Learning' } },
  
  // Dashboard
  { key: 'dashboard.welcome', translations: { UA: 'Вітаємо', PL: 'Witaj', EN: 'Welcome' } },
  { key: 'dashboard.level', translations: { UA: 'Рівень', PL: 'Poziom', EN: 'Level' } },
  { key: 'dashboard.nextLevel', translations: { UA: 'До наступного рівня', PL: 'Do następnego poziomu', EN: 'To next level' } },
  { key: 'dashboard.streak', translations: { UA: 'Серія', PL: 'Seria', EN: 'Streak' } },
  { key: 'dashboard.days', translations: { UA: 'днів', PL: 'dni', EN: 'days' } },
  { key: 'dashboard.attempts', translations: { UA: 'Спроб', PL: 'Prób', EN: 'Attempts' } },
  { key: 'dashboard.last7days', translations: { UA: 'останні 7 днів', PL: 'ostatnie 7 dni', EN: 'last 7 days' } },
  { key: 'dashboard.time', translations: { UA: 'Час', PL: 'Czas', EN: 'Time' } },
  { key: 'dashboard.dailyGoals', translations: { UA: 'Щоденні цілі', PL: 'Dzienne cele', EN: 'Daily Goals' } },
  { key: 'dashboard.recentActivity', translations: { UA: 'Остання активність', PL: 'Ostatnia aktywność', EN: 'Recent Activity' } },
  { key: 'dashboard.startLearning', translations: { UA: 'Почати навчання', PL: 'Rozpocznij naukę', EN: 'Start Learning' } },
  { key: 'dashboard.community', translations: { UA: 'Спільнота', PL: 'Społeczność', EN: 'Community' } },
  { key: 'dashboard.goToCourseChat', translations: { UA: 'Перейти до чату курсу', PL: 'Przejdź do czatu kursu', EN: 'Go to Course Chat' } },
  { key: 'dashboard.quickLinks', translations: { UA: 'Швидкі посилання', PL: 'Szybkie linki', EN: 'Quick Links' } },
  { key: 'dashboard.achievements', translations: { UA: 'Досягнення', PL: 'Osiągnięcia', EN: 'Achievements' } },
  
  // Dashboard Achievements
  { key: 'dashboard.achievement.firstQuiz', translations: { UA: 'Перший квіз', PL: 'Pierwszy quiz', EN: 'First Quiz' } },
  { key: 'dashboard.achievement.weekStreak', translations: { UA: 'Тиждень поспіль', PL: 'Tydzień z rzędu', EN: 'Week Streak' } },
  { key: 'dashboard.achievement.fastAnswer', translations: { UA: 'Швидка відповідь', PL: 'Szybka odpowiedź', EN: 'Fast Answer' } },
  { key: 'dashboard.achievement.sqlMaster', translations: { UA: 'Майстер SQL', PL: 'Mistrz SQL', EN: 'SQL Master' } },
  
  // Quiz
  { key: 'quiz.noHistory', translations: { UA: 'Історія порожня', PL: 'Brak historii', EN: 'No history' } },
  { key: 'quiz.start', translations: { UA: 'Почати квіз', PL: 'Rozpocznij quiz', EN: 'Start Quiz' } },
  { key: 'quiz.question', translations: { UA: 'Питання', PL: 'Pytanie', EN: 'Question' } },
  { key: 'quiz.next', translations: { UA: 'Далі', PL: 'Dalej', EN: 'Next' } },
  { key: 'quiz.finish', translations: { UA: 'Завершити', PL: 'Zakończ', EN: 'Finish' } },
  { key: 'quiz.results', translations: { UA: 'Результати', PL: 'Wyniki', EN: 'Results' } },
  { key: 'quiz.score', translations: { UA: 'Результат', PL: 'Wynik', EN: 'Score' } },
  { key: 'quiz.correct', translations: { UA: 'Правильно', PL: 'Poprawnie', EN: 'Correct' } },
  { key: 'quiz.incorrect', translations: { UA: 'Неправильно', PL: 'Niepoprawnie', EN: 'Incorrect' } },
  
  // Materials
  { key: 'materials.all', translations: { UA: 'Всі матеріали', PL: 'Wszystkie materiały', EN: 'All Materials' } },
  { key: 'materials.video', translations: { UA: 'Відео', PL: 'Wideo', EN: 'Video' } },
  { key: 'materials.text', translations: { UA: 'Текст', PL: 'Tekst', EN: 'Text' } },
  { key: 'materials.link', translations: { UA: 'Посилання', PL: 'Link', EN: 'Link' } },
  { key: 'materials.sections', translations: { UA: 'Розділи', PL: 'Sekcje', EN: 'Sections' } },
  { key: 'materials.status.mainSection', translations: { UA: 'Головний розділ', PL: 'Główna sekcja', EN: 'Main Section' } },
  { key: 'materials.categoriesAvailable', translations: { UA: 'доступні категорії', PL: 'dostępne kategorie', EN: 'categories available' } },
  { key: 'materials.empty.noMaterials', translations: { UA: 'Немає матеріалів', PL: 'Brak materiałów', EN: 'No materials' } },
  { key: 'materials.progress', translations: { UA: 'Прогрес', PL: 'Postęp', EN: 'Progress' } },
  { key: 'materials.viewAllMaterials', translations: { UA: 'Переглянути всі матеріали', PL: 'Zobacz wszystkie materiały', EN: 'View All Materials' } },
  { key: 'materials.remaining', translations: { UA: 'залишилось', PL: 'pozostało', EN: 'remaining' } },
  
  // Leaderboard
  { key: 'leaderboard.title', translations: { UA: 'Таблиця лідерів', PL: 'Tabela liderów', EN: 'Leaderboard' } },
  { key: 'leaderboard.participants', translations: { UA: 'учасників', PL: 'uczestników', EN: 'participants' } },
  { key: 'leaderboard.user', translations: { UA: 'Користувач', PL: 'Użytkownik', EN: 'User' } },
  { key: 'leaderboard.level', translations: { UA: 'Рівень', PL: 'Poziom', EN: 'Level' } },
  { key: 'leaderboard.badges', translations: { UA: 'Значки', PL: 'Odznaki', EN: 'Badges' } },
  { key: 'leaderboard.you', translations: { UA: 'Ви', PL: 'Ty', EN: 'You' } },
  
  // Profile
  { key: 'profile.name', translations: { UA: 'Ім\'я', PL: 'Imię', EN: 'Name' } },
  { key: 'profile.email', translations: { UA: 'Email', PL: 'Email', EN: 'Email' } },
  { key: 'profile.xp', translations: { UA: 'Досвід', PL: 'Doświadczenie', EN: 'Experience' } },
  { key: 'profile.badges', translations: { UA: 'Значки', PL: 'Odznaki', EN: 'Badges' } },
  { key: 'profile.badge.risingStar', translations: { UA: 'Зірка, що сходить', PL: 'Wschodząca gwiazda', EN: 'Rising Star' } },
  { key: 'profile.badge.algorithmMaster', translations: { UA: 'Майстер алгоритмів', PL: 'Mistrz algorytmów', EN: 'Algorithm Master' } },
  { key: 'profile.settings', translations: { UA: 'Налаштування', PL: 'Ustawienia', EN: 'Settings' } },
  { key: 'profile.language', translations: { UA: 'Мова', PL: 'Język', EN: 'Language' } },
  { key: 'profile.theme', translations: { UA: 'Тема', PL: 'Motyw', EN: 'Theme' } },
  { key: 'profile.light', translations: { UA: 'Світла', PL: 'Jasny', EN: 'Light' } },
  { key: 'profile.dark', translations: { UA: 'Темна', PL: 'Ciemny', EN: 'Dark' } },
  { key: 'profile.action.changeEmail', translations: { UA: 'Змінити email', PL: 'Zmień email', EN: 'Change Email' } },
  { key: 'profile.label.newEmail', translations: { UA: 'Новий email', PL: 'Nowy email', EN: 'New Email' } },
  { key: 'profile.placeholder.newEmail', translations: { UA: 'Введіть новий email', PL: 'Wprowadź nowy email', EN: 'Enter new email' } },
  { key: 'profile.label.currentPassword', translations: { UA: 'Поточний пароль', PL: 'Obecne hasło', EN: 'Current Password' } },
  { key: 'profile.action.changePassword', translations: { UA: 'Змінити пароль', PL: 'Zmień hasło', EN: 'Change Password' } },
  { key: 'profile.label.newPassword', translations: { UA: 'Новий пароль', PL: 'Nowe hasło', EN: 'New Password' } },
  { key: 'profile.label.confirmNewPassword', translations: { UA: 'Підтвердіть новий пароль', PL: 'Potwierdź nowe hasło', EN: 'Confirm New Password' } },
  
  // Auth
  { key: 'auth.password', translations: { UA: 'Пароль', PL: 'Hasło', EN: 'Password' } },
  { key: 'auth.signIn', translations: { UA: 'Увійти', PL: 'Zaloguj się', EN: 'Sign In' } },
  { key: 'auth.signUp', translations: { UA: 'Зареєструватись', PL: 'Zarejestruj się', EN: 'Sign Up' } },
  { key: 'auth.forgotPassword', translations: { UA: 'Забули пароль?', PL: 'Zapomniałeś hasła?', EN: 'Forgot Password?' } },
  
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
  { key: 'common.yes', translations: { UA: 'Так', PL: 'Tak', EN: 'Yes' } },
  { key: 'common.no', translations: { UA: 'Ні', PL: 'Nie', EN: 'No' } },
  { key: 'common.close', translations: { UA: 'Закрити', PL: 'Zamknij', EN: 'Close' } },
  { key: 'common.confirm', translations: { UA: 'Підтвердити', PL: 'Potwierdź', EN: 'Confirm' } },
  { key: 'common.back', translations: { UA: 'Назад', PL: 'Wstecz', EN: 'Back' } },
  { key: 'common.next', translations: { UA: 'Далі', PL: 'Dalej', EN: 'Next' } },
  { key: 'common.previous', translations: { UA: 'Попередній', PL: 'Poprzedni', EN: 'Previous' } },
  { key: 'common.submit', translations: { UA: 'Надіслати', PL: 'Wyślij', EN: 'Submit' } },
  { key: 'common.reset', translations: { UA: 'Скинути', PL: 'Resetuj', EN: 'Reset' } },
  { key: 'common.filter', translations: { UA: 'Фільтр', PL: 'Filtr', EN: 'Filter' } },
  { key: 'common.sort', translations: { UA: 'Сортувати', PL: 'Sortuj', EN: 'Sort' } },
  { key: 'common.view', translations: { UA: 'Переглянути', PL: 'Zobacz', EN: 'View' } },
  { key: 'common.download', translations: { UA: 'Завантажити', PL: 'Pobierz', EN: 'Download' } },
  { key: 'common.upload', translations: { UA: 'Завантажити', PL: 'Prześlij', EN: 'Upload' } },
  { key: 'common.success', translations: { UA: 'Успіх', PL: 'Sukces', EN: 'Success' } },
  { key: 'common.error', translations: { UA: 'Помилка', PL: 'Błąd', EN: 'Error' } },
  { key: 'common.warning', translations: { UA: 'Попередження', PL: 'Ostrzeżenie', EN: 'Warning' } },
  { key: 'common.info', translations: { UA: 'Інформація', PL: 'Informacja', EN: 'Info' } },
  
  // Nav
  { key: 'nav.dashboard', translations: { UA: 'Головна', PL: 'Panel', EN: 'Dashboard' } },
  { key: 'nav.materials', translations: { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials' } },
  { key: 'nav.quiz', translations: { UA: 'Квізи', PL: 'Quizy', EN: 'Quizzes' } },
  { key: 'nav.leaderboard', translations: { UA: 'Рейтинг', PL: 'Ranking', EN: 'Leaderboard' } },
  { key: 'nav.profile', translations: { UA: 'Профіль', PL: 'Profil', EN: 'Profile' } },
  { key: 'nav.admin', translations: { UA: 'Адмін', PL: 'Admin', EN: 'Admin' } },
  { key: 'nav.logout', translations: { UA: 'Вийти', PL: 'Wyloguj', EN: 'Logout' } },
]

async function main() {
  console.log('🔄 Syncing UI translations...\n')

  let added = 0
  let updated = 0

  for (const translation of allTranslations) {
    const existing = await prisma.uiTranslation.findUnique({ where: { key: translation.key } })

    if (existing) {
      await prisma.uiTranslation.update({
        where: { id: existing.id },
        data: { translations: translation.translations },
      })
      console.log(`↻ Updated: ${translation.key}`)
      updated++
    } else {
      await prisma.uiTranslation.create({ data: translation })
      console.log(`✓ Added: ${translation.key}`)
      added++
    }
  }

  const total = await prisma.uiTranslation.count()

  console.log(`\n✅ Complete!`)
  console.log(`   Added: ${added}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Total in database: ${total}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
