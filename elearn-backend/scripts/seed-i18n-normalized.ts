/**
 * Seed normalized i18n tables (I18nKey + I18nValue) from existing UiTranslation
 * 
 * Run: npx tsx scripts/seed-i18n-normalized.ts
 * Or:  npm run i18n:seed:normalized
 * 
 * This script:
 * 1. Copies data from UiTranslation (JSON format) -> I18nKey + I18nValue (normalized)
 * 2. Keeps old UiTranslation table untouched
 * 3. Shows inserted/updated counts
 */
import { PrismaClient, Lang } from '@prisma/client'

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
    'admin': 'admin',
  }
  return namespaceMap[prefix] || 'common'
}

async function migrateFromUiTranslation() {
  console.log('📦 Migrating from UiTranslation to I18nKey/I18nValue...\n')
  
  // Get all existing UiTranslation records
  const uiTranslations = await prisma.uiTranslation.findMany()
  
  if (uiTranslations.length === 0) {
    console.log('⚠️ No UiTranslation records found. Running seed instead...')
    return { keysCreated: 0, valuesCreated: 0, keysUpdated: 0, valuesUpdated: 0 }
  }
  
  let keysCreated = 0
  let keysUpdated = 0
  let valuesCreated = 0
  let valuesUpdated = 0
  
  for (const ut of uiTranslations) {
    const namespace = getNamespace(ut.key)
    const translations = ut.translations as Record<string, string>
    
    // Upsert I18nKey
    const existingKey = await prisma.i18nKey.findUnique({
      where: { namespace_key: { namespace, key: ut.key } }
    })
    
    let i18nKey: { id: string }
    
    if (existingKey) {
      i18nKey = await prisma.i18nKey.update({
        where: { id: existingKey.id },
        data: {
          description: ut.description,
          updatedAt: new Date(),
        },
      })
      keysUpdated++
    } else {
      i18nKey = await prisma.i18nKey.create({
        data: {
          key: ut.key,
          namespace,
          description: ut.description,
        },
      })
      keysCreated++
    }
    
    // Upsert I18nValue for each language
    const languages: Lang[] = ['UA', 'PL', 'EN']
    
    for (const lang of languages) {
      const value = translations?.[lang]
      if (!value) continue
      
      const existingValue = await prisma.i18nValue.findUnique({
        where: { keyId_lang: { keyId: i18nKey.id, lang } }
      })
      
      if (existingValue) {
        await prisma.i18nValue.update({
          where: { id: existingValue.id },
          data: { value, updatedAt: new Date() },
        })
        valuesUpdated++
      } else {
        await prisma.i18nValue.create({
          data: {
            keyId: i18nKey.id,
            lang,
            value,
          },
        })
        valuesCreated++
      }
    }
  }
  
  return { keysCreated, valuesCreated, keysUpdated, valuesUpdated }
}

async function seedMinimalTranslations() {
  console.log('🌱 Seeding minimal translations for common/auth/quiz namespaces...\n')
  
  // Minimal translations for key namespaces (if UiTranslation is empty)
  const minimalTranslations: Record<string, { UA: string; PL: string; EN: string; description?: string }> = {
    // Common (30+ keys)
    'app.name': { UA: 'E-Learn', PL: 'E-Learn', EN: 'E-Learn', description: 'Application name' },
    'common.loading': { UA: 'Завантаження...', PL: 'Ładowanie...', EN: 'Loading...' },
    'common.error': { UA: 'Помилка', PL: 'Błąd', EN: 'Error' },
    'common.save': { UA: 'Зберегти', PL: 'Zapisz', EN: 'Save' },
    'common.cancel': { UA: 'Скасувати', PL: 'Anuluj', EN: 'Cancel' },
    'common.delete': { UA: 'Видалити', PL: 'Usuń', EN: 'Delete' },
    'common.edit': { UA: 'Редагувати', PL: 'Edytuj', EN: 'Edit' },
    'common.create': { UA: 'Створити', PL: 'Utwórz', EN: 'Create' },
    'common.close': { UA: 'Закрити', PL: 'Zamknij', EN: 'Close' },
    'common.continue': { UA: 'Продовжити', PL: 'Kontynuuj', EN: 'Continue' },
    'common.back': { UA: 'Назад', PL: 'Wstecz', EN: 'Back' },
    'common.completed': { UA: 'Завершено', PL: 'Ukończono', EN: 'Completed' },
    'common.saving': { UA: 'Збереження...', PL: 'Zapisywanie...', EN: 'Saving...' },
    'common.processing': { UA: 'Обробка...', PL: 'Przetwarzanie...', EN: 'Processing...' },
    'common.goHome': { UA: 'На головну', PL: 'Na stronę główną', EN: 'Go Home' },
    'common.goBack': { UA: 'Назад', PL: 'Wstecz', EN: 'Go Back' },
    'common.seconds': { UA: 'секунд', PL: 'sekund', EN: 'seconds' },
    'common.update': { UA: 'Оновити', PL: 'Aktualizuj', EN: 'Update' },
    'common.total': { UA: 'всього', PL: 'razem', EN: 'total' },
    'common.search': { UA: 'Пошук', PL: 'Szukaj', EN: 'Search' },
    'common.page': { UA: 'Сторінка', PL: 'Strona', EN: 'Page' },
    'common.of': { UA: 'з', PL: 'z', EN: 'of' },
    'common.name': { UA: 'Ім\'я', PL: 'Imię', EN: 'Name' },
    'common.email': { UA: 'Email', PL: 'Email', EN: 'Email' },
    'common.password': { UA: 'Пароль', PL: 'Hasło', EN: 'Password' },
    'common.role': { UA: 'Роль', PL: 'Rola', EN: 'Role' },
    'common.user': { UA: 'Користувач', PL: 'Użytkownik', EN: 'User' },
    'common.status': { UA: 'Статус', PL: 'Status', EN: 'Status' },
    'common.created': { UA: 'Створено', PL: 'Utworzono', EN: 'Created' },
    'common.actions': { UA: 'Дії', PL: 'Akcje', EN: 'Actions' },
    'common.filters': { UA: 'Фільтри', PL: 'Filtry', EN: 'Filters' },
    'common.all': { UA: 'Усі', PL: 'Wszystkie', EN: 'All' },
    'common.clear': { UA: 'Очистити', PL: 'Wyczyść', EN: 'Clear' },
    'common.apply': { UA: 'Застосувати', PL: 'Zastosuj', EN: 'Apply' },
    'common.date': { UA: 'Дата', PL: 'Data', EN: 'Date' },
    'common.minutes': { UA: 'хв', PL: 'min', EN: 'min' },
    'common.download': { UA: 'Завантажити', PL: 'Pobierz', EN: 'Download' },
    'common.refresh': { UA: 'Оновити', PL: 'Odśwież', EN: 'Refresh' },
    'common.retry': { UA: 'Повторити', PL: 'Ponów', EN: 'Retry' },
    'common.loadFailed': { UA: 'Не вдалося завантажити', PL: 'Nie udało się załadować', EN: 'Failed to load' },
    
    // Navigation
    'nav.dashboard': { UA: 'Дашборд', PL: 'Panel', EN: 'Dashboard' },
    'nav.materials': { UA: 'Матеріали', PL: 'Materiały', EN: 'Materials' },
    'nav.quiz': { UA: 'Квізи', PL: 'Quiz', EN: 'Quiz' },
    'nav.leaderboard': { UA: 'Рейтинг', PL: 'Ranking', EN: 'Leaderboard' },
    'nav.profile': { UA: 'Профіль', PL: 'Profil', EN: 'Profile' },
    'nav.editor': { UA: 'Редактор', PL: 'Edytor', EN: 'Editor' },
    'nav.login': { UA: 'Увійти', PL: 'Zaloguj', EN: 'Login' },
    'nav.register': { UA: 'Реєстрація', PL: 'Rejestracja', EN: 'Register' },
    'nav.logout': { UA: 'Вийти', PL: 'Wyloguj', EN: 'Logout' },
    'nav.admin': { UA: 'Адмін', PL: 'Admin', EN: 'Admin' },
    
    // Auth (30+ keys)
    'auth.login': { UA: 'Вхід', PL: 'Logowanie', EN: 'Login' },
    'auth.register': { UA: 'Реєстрація', PL: 'Rejestracja', EN: 'Register' },
    'auth.password': { UA: 'Пароль', PL: 'Hasło', EN: 'Password' },
    'auth.signIn': { UA: 'Увійти', PL: 'Zaloguj się', EN: 'Sign in' },
    'auth.createAccount': { UA: 'Створити акаунт', PL: 'Utwórz konto', EN: 'Create account' },
    'auth.noAccount': { UA: 'Немає акаунту?', PL: 'Nie masz konta?', EN: "Don't have an account?" },
    'auth.hasAccount': { UA: 'Вже маєте акаунт?', PL: 'Masz już konto?', EN: 'Already have an account?' },
    'auth.confirmPassword': { UA: 'Підтвердіть пароль', PL: 'Potwierdź hasło', EN: 'Confirm password' },
    'auth.passwordsNotMatch': { UA: 'Паролі не співпадають', PL: 'Hasła nie pasują', EN: 'Passwords do not match' },
    'auth.passwordMinLength': { UA: 'Пароль повинен містити мінімум 8 символів', PL: 'Hasło musi mieć minimum 8 znaków', EN: 'Password must be at least 8 characters' },
    'auth.namePlaceholder': { UA: 'Ваше імʼя', PL: 'Twoje imię', EN: 'Your name' },
    'auth.error.loginFailed': { UA: 'Помилка входу. Перевірте дані.', PL: 'Błąd logowania. Sprawdź dane.', EN: 'Login failed. Please check your credentials.' },
    'auth.error.registrationFailed': { UA: 'Помилка реєстрації. Спробуйте знову.', PL: 'Błąd rejestracji. Spróbuj ponownie.', EN: 'Registration failed. Please try again.' },
    'auth.placeholder.email': { UA: 'your@email.com', PL: 'twoj@email.com', EN: 'your@email.com' },
    'auth.forgotPassword': { UA: 'Забули пароль?', PL: 'Zapomniałeś hasła?', EN: 'Forgot password?' },
    'auth.resetPassword': { UA: 'Скинути пароль', PL: 'Zresetuj hasło', EN: 'Reset password' },
    'auth.verifyEmail': { UA: 'Підтвердіть email', PL: 'Potwierdź email', EN: 'Verify email' },
    'auth.emailSent': { UA: 'Лист надіслано', PL: 'Email wysłany', EN: 'Email sent' },
    'auth.checkEmail': { UA: 'Перевірте пошту', PL: 'Sprawdź pocztę', EN: 'Check your email' },
    'auth.invalidToken': { UA: 'Недійсний токен', PL: 'Nieprawidłowy token', EN: 'Invalid token' },
    'auth.tokenExpired': { UA: 'Токен прострочено', PL: 'Token wygasł', EN: 'Token expired' },
    'auth.emailVerified': { UA: 'Email підтверджено', PL: 'Email potwierdzony', EN: 'Email verified' },
    'auth.passwordChanged': { UA: 'Пароль змінено', PL: 'Hasło zmienione', EN: 'Password changed' },
    'auth.accountCreated': { UA: 'Акаунт створено', PL: 'Konto utworzone', EN: 'Account created' },
    'auth.welcomeBack': { UA: 'З поверненням!', PL: 'Witaj ponownie!', EN: 'Welcome back!' },
    'auth.logoutSuccess': { UA: 'Вихід виконано', PL: 'Wylogowano', EN: 'Logged out successfully' },
    'auth.sessionExpired': { UA: 'Сесія закінчилась', PL: 'Sesja wygasła', EN: 'Session expired' },
    'auth.unauthorized': { UA: 'Неавторизовано', PL: 'Nieautoryzowany', EN: 'Unauthorized' },
    'auth.accessDenied': { UA: 'Доступ заборонено', PL: 'Dostęp zabroniony', EN: 'Access denied' },
    'auth.rememberMe': { UA: 'Запам\'ятати мене', PL: 'Zapamiętaj mnie', EN: 'Remember me' },
    
    // Quiz (30+ keys)
    'quiz.title': { UA: 'Квізи', PL: 'Quiz', EN: 'Quizzes' },
    'quiz.mode': { UA: 'Режим', PL: 'Tryb', EN: 'Mode' },
    'quiz.practice': { UA: 'Практика', PL: 'Praktyka', EN: 'Practice' },
    'quiz.exam': { UA: 'Екзамен', PL: 'Egzamin', EN: 'Exam' },
    'quiz.selectQuiz': { UA: 'Обери квіз', PL: 'Wybierz quiz', EN: 'Select quiz' },
    'quiz.question': { UA: 'Питання', PL: 'Pytanie', EN: 'Question' },
    'quiz.of': { UA: 'з', PL: 'z', EN: 'of' },
    'quiz.time': { UA: 'Час', PL: 'Czas', EN: 'Time' },
    'quiz.result': { UA: 'Результат', PL: 'Wynik', EN: 'Result' },
    'quiz.completed': { UA: 'Квіз завершено!', PL: 'Quiz ukończony!', EN: 'Quiz completed!' },
    'quiz.congratulations': { UA: 'Вітаємо з завершенням!', PL: 'Gratulacje!', EN: 'Congratulations!' },
    'quiz.correctAnswers': { UA: 'правильних відповідей', PL: 'poprawnych odpowiedzi', EN: 'correct answers' },
    'quiz.tryAgain': { UA: 'Спробувати знову', PL: 'Spróbuj ponownie', EN: 'Try again' },
    'quiz.backToMaterials': { UA: 'До матеріалів', PL: 'Do materiałów', EN: 'Back to materials' },
    'quiz.hints': { UA: 'Підказки', PL: 'Podpowiedzi', EN: 'Hints' },
    'quiz.checklist': { UA: 'Чек-лист', PL: 'Lista kontrolna', EN: 'Checklist' },
    'quiz.answer': { UA: 'Відповісти', PL: 'Odpowiedz', EN: 'Answer' },
    'quiz.skip': { UA: 'Пропустити', PL: 'Pomiń', EN: 'Skip' },
    'quiz.next': { UA: 'Далі', PL: 'Dalej', EN: 'Next' },
    'quiz.finish': { UA: 'Завершити', PL: 'Zakończ', EN: 'Finish' },
    'quiz.explanation': { UA: 'Пояснення', PL: 'Wyjaśnienie', EN: 'Explanation' },
    'quiz.loading': { UA: 'Завантаження...', PL: 'Ładowanie...', EN: 'Loading...' },
    'quiz.noQuizzes': { UA: 'Немає квізів', PL: 'Brak quizów', EN: 'No quizzes available' },
    'quiz.history': { UA: 'Історія', PL: 'Historia', EN: 'History' },
    'quiz.noHistory': { UA: 'Немає спроб', PL: 'Brak prób', EN: 'No attempts yet' },
    'quiz.error': { UA: 'Помилка', PL: 'Błąd', EN: 'Error' },
    'quiz.start': { UA: 'Почати', PL: 'Rozpocznij', EN: 'Start' },
    'quiz.showAnswer': { UA: 'Показати відповідь', PL: 'Pokaż odpowiedź', EN: 'Show answer' },
    'quiz.nextQuestion': { UA: 'Наступне питання', PL: 'Następne pytanie', EN: 'Next question' },
    'quiz.score': { UA: 'Бали', PL: 'Punkty', EN: 'Score' },
    'quiz.totalQuestions': { UA: 'Всього питань', PL: 'Wszystkich pytań', EN: 'Total questions' },
    'quiz.timeRemaining': { UA: 'Залишилось часу', PL: 'Pozostały czas', EN: 'Time remaining' },
    'quiz.submit': { UA: 'Надіслати', PL: 'Wyślij', EN: 'Submit' },
    'quiz.review': { UA: 'Переглянути', PL: 'Przejrzyj', EN: 'Review' },
    'quiz.correct': { UA: 'Правильно!', PL: 'Poprawnie!', EN: 'Correct!' },
    'quiz.incorrect': { UA: 'Неправильно', PL: 'Niepoprawnie', EN: 'Incorrect' },
    'quiz.yourAnswer': { UA: 'Ваша відповідь', PL: 'Twoja odpowiedź', EN: 'Your answer' },
    'quiz.correctAnswer': { UA: 'Правильна відповідь', PL: 'Poprawna odpowiedź', EN: 'Correct answer' },
    'quiz.xpEarned': { UA: 'Отримано XP', PL: 'Zdobyto XP', EN: 'XP earned' },
  }
  
  let keysCreated = 0
  let valuesCreated = 0
  
  for (const [key, trans] of Object.entries(minimalTranslations)) {
    const namespace = getNamespace(key)
    
    // Create I18nKey
    const i18nKey = await prisma.i18nKey.upsert({
      where: { namespace_key: { namespace, key } },
      create: {
        key,
        namespace,
        description: trans.description,
      },
      update: {
        description: trans.description,
      },
    })
    keysCreated++
    
    // Create I18nValue for each language
    const languages: { lang: Lang; value: string }[] = [
      { lang: 'UA', value: trans.UA },
      { lang: 'PL', value: trans.PL },
      { lang: 'EN', value: trans.EN },
    ]
    
    for (const { lang, value } of languages) {
      await prisma.i18nValue.upsert({
        where: { keyId_lang: { keyId: i18nKey.id, lang } },
        create: { keyId: i18nKey.id, lang, value },
        update: { value },
      })
      valuesCreated++
    }
  }
  
  return { keysCreated, valuesCreated, keysUpdated: 0, valuesUpdated: 0 }
}

async function main() {
  console.log('🚀 Starting I18n Normalized Tables Seed...\n')
  console.log('=' .repeat(50))
  
  try {
    // Check if UiTranslation has data
    const uiCount = await prisma.uiTranslation.count()
    console.log(`📊 Found ${uiCount} UiTranslation records\n`)
    
    let result: { keysCreated: number; valuesCreated: number; keysUpdated: number; valuesUpdated: number }
    
    if (uiCount > 0) {
      // Migrate from UiTranslation
      result = await migrateFromUiTranslation()
    } else {
      // Seed minimal translations
      result = await seedMinimalTranslations()
    }
    
    // Update TranslationVersion
    const namespaces = ['common', 'navigation', 'auth', 'quiz', 'dashboard', 'materials', 'profile', 'editor', 'categories', 'lesson', 'error', 'badge', 'leaderboard', 'empty', 'search', 'dialog', 'admin']
    
    for (const ns of namespaces) {
      await prisma.translationVersion.upsert({
        where: { namespace: ns },
        create: { namespace: ns, version: 1 },
        update: { version: { increment: 1 }, updatedAt: new Date() },
      })
    }
    
    // Final counts
    const totalKeys = await prisma.i18nKey.count()
    const totalValues = await prisma.i18nValue.count()
    const byNamespace = await prisma.i18nKey.groupBy({
      by: ['namespace'],
      _count: { id: true },
    })
    const byLang = await prisma.i18nValue.groupBy({
      by: ['lang'],
      _count: { id: true },
    })
    
    console.log('\n' + '=' .repeat(50))
    console.log('✅ Seed completed!\n')
    console.log('📈 Results:')
    console.log(`   Keys created:   ${result.keysCreated}`)
    console.log(`   Keys updated:   ${result.keysUpdated}`)
    console.log(`   Values created: ${result.valuesCreated}`)
    console.log(`   Values updated: ${result.valuesUpdated}`)
    console.log('\n📊 Totals:')
    console.log(`   Total I18nKey:   ${totalKeys}`)
    console.log(`   Total I18nValue: ${totalValues}`)
    console.log('\n📂 By namespace:')
    byNamespace.forEach(ns => console.log(`   ${ns.namespace}: ${ns._count.id} keys`))
    console.log('\n🌐 By language:')
    byLang.forEach(l => console.log(`   ${l.lang}: ${l._count.id} values`))
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
