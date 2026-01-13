import { useAuth } from '@/auth/AuthContext'
import { Star, Trophy, Target, TrendingUp, Clock, Flame, Zap, Users, BookOpen, Play, FileText, Award, LucideIcon } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { getTodayGoals, saveDailyGoals, getGoalText, DailyGoal } from '@/utils/dailyGoals'
import { getTodayWeakSpots, getTodayTip, getWeakSpotText, getTipText } from '@/utils/weakSpots'
import { logGoalComplete } from '@/utils/activity'
import { useActivityTracker } from '@/hooks/useActivityTracker'
import QuizHistory from '@/components/QuizHistory'
import { http } from '@/lib/http'
import { Link } from 'react-router-dom'
import {
  ProgressBar,
  StatCard,
  CourseCard,
  WeakSpotItem,
  StreakDay,
  AchievementBadge,
  SectionHeader,
} from '@/components/dashboard/DashboardComponents'

export default function Dashboard(){
  const { user } = useAuth()
  const { t, lang } = useTranslation()
  useActivityTracker() // Трекінг активності
  
  const xp = user?.xp ?? 0
  const level = Math.floor(xp / 100) + 1
  const nextLevelAt = level * 100
  const progressToNext = Math.min(100, Math.round(((xp % 100) / 100) * 100))

  // Continue Learning - дані з API
  interface RecentTopic {
    id: string
    name: string
    nameJson: Record<string, string> | null
    slug: string
    progress: number
    totalMaterials: number
    viewedMaterials: number
  }
  const [recentTopics, setRecentTopics] = useState<RecentTopic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(true)

  // Streak та активність з API
  const [streakData, setStreakData] = useState<{ 
    current: number
    longest: number
    lastActiveDate: string | null
    weekDays: boolean[]
  }>({ current: 0, longest: 0, lastActiveDate: null, weekDays: [false, false, false, false, false, false, false] })
  const [last7DaysStats, setLast7DaysStats] = useState({ timeHours: '0.0', attempts: 0 })

  const streakDays = [
    t('dashboard.weekday.mon'),
    t('dashboard.weekday.tue'),
    t('dashboard.weekday.wed'),
    t('dashboard.weekday.thu'),
    t('dashboard.weekday.fri'),
    t('dashboard.weekday.sat'),
    t('dashboard.weekday.sun'),
  ]

  const achievements = [
    { id: 1, name: t('dashboard.achievement.firstQuiz'), earned: true },
    { id: 2, name: t('dashboard.achievement.weekStreak'), earned: true },
    { id: 3, name: t('dashboard.achievement.fastAnswer'), earned: false },
    { id: 4, name: t('dashboard.achievement.sqlMaster'), earned: false },
  ]

  const [goals, setGoals] = useState<DailyGoal[]>([])
  const [weakSpots, setWeakSpots] = useState<{ topic: string; advice: string }[]>([])
  const [dailyTip, setDailyTip] = useState<string>('')

  // Завантаження даних з API
  useEffect(() => {
    async function loadData() {
      try {
        // Спочатку записуємо візит (для streak)
        await http.post('/progress/visit', {})
        
        // Завантаження останніх тем паралельно зі streak
        const [topicsRes, streakRes, activityRes] = await Promise.all([
          http.get<{ topics: RecentTopic[] }>('/progress/recent-topics?limit=2'),
          http.get<{ current: number; longest: number; lastActiveDate: string | null }>('/progress/streak'),
          http.get<Array<{ date: string; timeSpent: number; quizAttempts: number }>>('/progress/activity?days=7'),
        ])
        
        setRecentTopics(topicsRes.topics)
        
        // Обробка streak та weekDays
        const today = new Date()
        const weekDays: boolean[] = []
        const activityDates = new Set(activityRes.map(a => a.date.split('T')[0]))
        
        // Визначаємо день тижня (0 = неділя, потрібно пн = 0)
        const todayDayOfWeek = (today.getDay() + 6) % 7 // Пн=0, Вт=1, ..., Нд=6
        
        // Заповнюємо масив активності для кожного дня тижня
        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(today)
          dayDate.setDate(today.getDate() - todayDayOfWeek + i)
          const dateStr = dayDate.toISOString().split('T')[0]
          weekDays.push(activityDates.has(dateStr))
        }
        
        setStreakData({
          current: streakRes.current,
          longest: streakRes.longest,
          lastActiveDate: streakRes.lastActiveDate,
          weekDays,
        })
        
        // Статистика за 7 днів
        const totalTime = activityRes.reduce((sum, a) => sum + a.timeSpent, 0)
        const totalAttempts = activityRes.reduce((sum, a) => sum + a.quizAttempts, 0)
        setLast7DaysStats({
          timeHours: (totalTime / 3600).toFixed(1),
          attempts: totalAttempts,
        })
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoadingTopics(false)
      }
    }
    
    loadData()
  }, [])

  // Ініціалізація goals
  useEffect(() => {
    const todayGoals = getTodayGoals()
    setGoals(todayGoals)
  }, [])

  // Зберігання goals при зміні
  useEffect(() => {
    if (goals.length > 0) {
      // Перевіряємо чи щось змінилося на "done"
      const previousGoalsStr = localStorage.getItem('daily_goals')
      const previousGoals: DailyGoal[] = previousGoalsStr ? JSON.parse(previousGoalsStr) : []
      goals.forEach(g => {
        const prev = previousGoals.find((p) => p.id === g.id)
        if (g.done && (!prev || !prev.done)) {
          logGoalComplete()
        }
      })
      
      saveDailyGoals(goals)
    }
  }, [goals])

  // Оновлення weakSpots та tips при зміні мови
  useEffect(() => {
    const spots = getTodayWeakSpots()
    setWeakSpots(spots.map(s => getWeakSpotText(s, lang)))
    
    const tip = getTodayTip()
    setDailyTip(getTipText(tip, lang))
  }, [lang])

  return (
    <div className="space-y-6">
      {/* Hero Panel */}
      <div className="card">
        <div className="grid md:grid-cols-[1fr_auto] gap-6">
          {/* Left: Avatar + Greeting + Level */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-display font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {t('dashboard.welcome')}, {user?.name || 'Student'}!
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                {t('dashboard.level')} {level} • {xp} XP
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('dashboard.nextLevel')}</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{progressToNext}%</span>
                </div>
                <ProgressBar value={progressToNext} />
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Flame} label={t('dashboard.streak')} value={streakData.current} sub={t('dashboard.days')}/>
            <StatCard icon={Target} label={t('dashboard.attempts')} value={last7DaysStats.attempts} sub={t('dashboard.last7days')}/>
            <StatCard icon={Clock} label={t('dashboard.time')} value={`${last7DaysStats.timeHours}h`} sub={t('dashboard.last7days')}/>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: Main Content */}
        <div className="space-y-6">
          {/* Continue Learning - показуємо тільки якщо є переглянуті теми */}
          {!loadingTopics && recentTopics.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-4">
                {t('dashboard.continueLearning')}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {recentTopics.map(topic => {
                  const topicName = topic.nameJson?.[lang] || topic.name
                  return (
                    <div key={topic.id} className="card hover:shadow-neo-lg">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-display font-semibold text-neutral-900 dark:text-white">{topicName}</h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {topic.viewedMaterials}/{topic.totalMaterials} {t('materials.materialsViewed')}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                            <span>{t('materials.progress')}</span>
                            <span className="font-semibold">{topic.progress}%</span>
                          </div>
                          <ProgressBar value={topic.progress} />
                        </div>

                        <div className="flex gap-2">
                          <Link to={`/materials?topic=${topic.slug}`} className="btn flex-1">
                            <Play size={16} className="inline mr-1"/>{t('common.continue')}
                          </Link>
                          <Link to="/materials" className="btn-outline">
                            <FileText size={16} className="inline mr-1"/>{t('nav.materials')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weak Spots */}
          <div className="card">
            <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              {t('dashboard.recommended')}
            </h2>
            <ul className="space-y-2 mb-4">
              {weakSpots.map((spot, idx) => (
                <WeakSpotItem key={idx} {...spot} />
              ))}
            </ul>

            {/* Motivational Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-accent-50 to-primary-50 dark:from-accent-950 dark:to-primary-950 border border-accent-200 dark:border-accent-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-600 to-accent-700 flex items-center justify-center">
                  <Zap size={20} className="text-white"/>
                </div>
                <div>
                  <div className="font-semibold text-sm text-neutral-900 dark:text-white">
                    💡 {t('dashboard.tipOfDay')}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    {dailyTip}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Goals */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} className="text-primary-600 dark:text-primary-400"/>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                {t('dashboard.dailyGoals')}
              </h3>
            </div>
            <ul className="space-y-2">
              {goals.map(g=> (
                <li key={g.id} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      checked={g.done} 
                      onChange={()=> setGoals(s=> s.map(x=> x.id===g.id ? {...x, done:!x.done} : x))}
                      className="rounded-lg"
                    />
                    <span className={`font-medium ${g.done ? 'line-through text-neutral-400 dark:text-neutral-600' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {getGoalText(g.templateId, lang)}
                    </span>
                  </label>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    g.done 
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' 
                      : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}>
                    {g.done ? t('dashboard.done') : t('dashboard.pending')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Achievements */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Award size={20} className="text-primary-600 dark:text-primary-400"/>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                {t('dashboard.achievements')}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.map(ach => (
                <span 
                  key={ach.id} 
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    ach.earned
                      ? 'bg-primary-100 text-primary-700 border border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-800'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-600 dark:border-neutral-800 opacity-50'
                  }`}
                >
                  {ach.earned ? '🏆' : '🔒'} {ach.name}
                </span>
              ))}
            </div>
          </div>

          {/* Streak Calendar */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={20} className="text-primary-600 dark:text-primary-400"/>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                {t('dashboard.streak')} — {streakData.current} {t('dashboard.days')}
              </h3>
            </div>
            <div className="flex justify-between">
              {streakDays.map((day, idx) => (
                <StreakDay key={idx} day={day} active={streakData.weekDays[idx]} />
              ))}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 text-center">
              {t('dashboard.keepStreak')}
            </p>
          </div>

          {/* Quiz History */}
          <QuizHistory />

          {/* Community */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-primary-600 dark:text-primary-400"/>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                {t('dashboard.community')}
              </h3>
            </div>
            <a 
              href="/community" 
              className="flex items-center justify-between p-3 rounded-2xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium transition-colors group"
            >
              <span>{t('dashboard.goToCourseChat')}</span>
              <div className="w-8 h-8 rounded-lg bg-primary-600 dark:bg-primary-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={16} className="text-white"/>
              </div>
            </a>
          </div>

          {/* Quick Links */}
          <div className="card">
            <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-4">
              {t('dashboard.quickLinks')}
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/materials" className="flex items-center gap-3 p-3 rounded-2xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium transition-colors">
                  <BookOpen size={20}/> {t('nav.materials')}
                </a>
              </li>
              <li>
                <a href="/quiz" className="flex items-center gap-3 p-3 rounded-2xl bg-accent-50 hover:bg-accent-100 dark:bg-accent-950 dark:hover:bg-accent-900 text-accent-700 dark:text-accent-300 font-medium transition-colors">
                  <Trophy size={20}/> {t('nav.quiz')}
                </a>
              </li>
              <li>
                <a href="/leaderboard" className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900 text-green-700 dark:text-green-300 font-medium transition-colors">
                  <TrendingUp size={20}/> {t('nav.leaderboard')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
