// src/utils/gamification.ts

export function getBadges(xp: number): string[] {
  const badges: string[] = []
  if (xp >= 10) badges.push('first_steps')
  if (xp >= 50) badges.push('rising_star')
  if (xp >= 100) badges.push('dedicated_learner')
  if (xp >= 250) badges.push('quiz_master')
  if (xp >= 500) badges.push('expert')
  if (xp >= 1000) badges.push('legend')
  return badges
}
