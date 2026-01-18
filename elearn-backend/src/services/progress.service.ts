// src/services/progress.service.ts
import { prisma } from '../db.js'

/**
 * Helper to get normalized UTC date (00:00:00.000 Z)
 * Ensures streaks work correctly regardless of server timezone
 */
function getUtcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Позначає матеріал як переглянутий
 */
export async function markMaterialViewed(
  userId: string, 
  materialId: string,
  timeSpent?: number
): Promise<void> {
  await prisma.materialView.upsert({
    where: {
      userId_materialId: { userId, materialId },
    },
    create: {
      userId,
      materialId,
      timeSpent: timeSpent || 0,
    },
    update: {
      viewedAt: new Date(),
      timeSpent: timeSpent ? { increment: timeSpent } : undefined,
    },
  })
  
  // Оновлюємо активність за сьогодні
  await updateDailyActivity(userId, { materialsViewed: 1 })
}

/**
 * Отримує список ID переглянутих матеріалів користувача
 */
export async function getViewedMaterialIds(userId: string): Promise<string[]> {
  const views = await prisma.materialView.findMany({
    where: { userId },
    select: { materialId: true },
  })
  return views.map(v => v.materialId)
}

/**
 * Перевіряє чи матеріал переглянутий
 */
export async function isMaterialViewed(userId: string, materialId: string): Promise<boolean> {
  const view = await prisma.materialView.findUnique({
    where: { userId_materialId: { userId, materialId } },
  })
  return !!view
}

/**
 * Отримує статистику переглядів для матеріалів
 */
export async function getMaterialViewStats(materialIds: string[]): Promise<Record<string, number>> {
  const stats = await prisma.materialView.groupBy({
    by: ['materialId'],
    where: { materialId: { in: materialIds } },
    _count: { materialId: true },
  })
  
  return Object.fromEntries(stats.map(s => [s.materialId, s._count.materialId]))
}

/**
 * Оновлює щоденну активність користувача
 */
export async function updateDailyActivity(
  userId: string,
  updates: {
    timeSpent?: number
    quizAttempts?: number
    materialsViewed?: number
    goalsCompleted?: number
  }
): Promise<void> {
  const today = getUtcToday() // Use UTC normalized date
  
  await prisma.userActivity.upsert({
    where: {
      userId_date: { userId, date: today },
    },
    create: {
      userId,
      date: today,
      timeSpent: updates.timeSpent ?? 0,
      quizAttempts: updates.quizAttempts ?? 0,
      materialsViewed: updates.materialsViewed ?? 0,
      goalsCompleted: updates.goalsCompleted ?? 0,
    },
    update: {
      timeSpent: updates.timeSpent ? { increment: updates.timeSpent } : undefined,
      quizAttempts: updates.quizAttempts ? { increment: updates.quizAttempts } : undefined,
      materialsViewed: updates.materialsViewed ? { increment: updates.materialsViewed } : undefined,
      goalsCompleted: updates.goalsCompleted ? { increment: updates.goalsCompleted } : undefined,
    },
  })
}

/**
 * Отримує активність за останні N днів
 */
export async function getRecentActivity(userId: string, days: number = 7) {
  const startDate = getUtcToday()
  startDate.setDate(startDate.getDate() - days)
  
  const activities = await prisma.userActivity.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
    orderBy: { date: 'asc' },
  })
  
  return activities
}

/**
 * Обчислює streak (серію днів активності)
 */
export async function calculateStreak(userId: string): Promise<{
  current: number
  longest: number
  lastActiveDate: Date | null
}> {
  const activities = await prisma.userActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' }, // Newest first
    select: { date: true },
  })
  
  if (activities.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null }
  }
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1
  
  const today = getUtcToday()
  const lastActivityDate = new Date(activities[0].date)
  
  // 1. Calculate Current Streak
  const msPerDay = 1000 * 60 * 60 * 24
  const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / msPerDay)
  
  // Streak is only active if activity was Today (0) or Yesterday (1)
  if (daysDiff <= 1) {
    currentStreak = 1
    for (let i = 1; i < activities.length; i++) {
      const prevDate = new Date(activities[i - 1].date)
      const currDate = new Date(activities[i].date)
      
      const diff = Math.round((prevDate.getTime() - currDate.getTime()) / msPerDay)
      
      if (diff === 1) {
        currentStreak++
      } else {
        break // Streak broken
      }
    }
  } else {
    currentStreak = 0 // User missed more than 1 day
  }
  
  

  // 2. Calculate Longest Streak (Iterate full history)
  tempStreak = 1
  // Start with at least 1 if we have any activity
  longestStreak = activities.length > 0 ? 1 : 0; 

  for (let i = 1; i < activities.length; i++) {
    const prevDate = new Date(activities[i - 1].date)
    const currDate = new Date(activities[i].date)
    
    const diff = Math.round((prevDate.getTime() - currDate.getTime()) / msPerDay)
    
    if (diff === 1) {
      tempStreak++
    } else {
      tempStreak = 1 // Reset counter
    }
    longestStreak = Math.max(longestStreak, tempStreak)
  }
  
  return {
    current: currentStreak,
    longest: Math.max(longestStreak, currentStreak),
    lastActiveDate: activities[0]?.date ?? null,
  }
}

/**
 * Отримує повну статистику користувача
 */
export async function getUserStats(userId: string) {
  const [streak, recentActivity, totalViewed] = await Promise.all([
    calculateStreak(userId),
    getRecentActivity(userId, 7),
    prisma.materialView.count({ where: { userId } }),
  ])
  
  const totalTimeSpent = recentActivity.reduce((sum, a) => sum + a.timeSpent, 0)
  const totalQuizAttempts = recentActivity.reduce((sum, a) => sum + a.quizAttempts, 0)
  
  return {
    streak: streak.current,
    longestStreak: streak.longest,
    lastActiveDate: streak.lastActiveDate,
    totalTimeSpent,
    totalQuizAttempts,
    totalMaterialsViewed: totalViewed,
    last7DaysActivity: recentActivity,
  }
}

/**
 * Синхронізує локальні дані з сервером
 */
export async function syncViewedMaterials(
  userId: string, 
  localMaterialIds: string[]
): Promise<string[]> {
  // Get what exists on server
  const serverViewed = await getViewedMaterialIds(userId)
  const serverSet = new Set(serverViewed)
  
  // Find strictly new materials
  const newLocal = localMaterialIds.filter(id => !serverSet.has(id))
  
  // Insert new ones
  if (newLocal.length > 0) {
    await prisma.materialView.createMany({
      data: newLocal.map(materialId => ({ userId, materialId })),
      skipDuplicates: true,
    })
  }
  
  // Return merged list
  return [...new Set([...serverViewed, ...newLocal])]
}