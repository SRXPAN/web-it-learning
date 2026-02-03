// src/utils/gamification.ts

export function getBadges(xp: number): string[] {
  const badges: string[] = []
  if (xp >= 10) badges.push('first_steps')      // Перші кроки
  if (xp >= 50) badges.push('rising_star')      // Зірка, що сходить
  if (xp >= 100) badges.push('dedicated_learner') // Відданий учень
  if (xp >= 200) badges.push('bookworm')        // Книжковий хробак
  if (xp >= 350) badges.push('quiz_master')     // Майстер тестів
  if (xp >= 500) badges.push('scholar')         // Вчений
  if (xp >= 750) badges.push('expert')          // Експерт
  if (xp >= 1000) badges.push('guru')           // Гуру
  if (xp >= 1500) badges.push('legend')         // Легенда
  return badges
}
