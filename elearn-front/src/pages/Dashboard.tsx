import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Flame, Target, Clock, Zap, 
  Play, FileText, Award, CheckCircle 
} from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useTranslation } from '@/i18n/useTranslation'
import { useActivityTracker } from '@/hooks/useActivityTracker'
import { apiGet, apiPost } from '@/lib/http'
import { SkeletonDashboard } from '@/components/Skeletons'
import QuizHistory from '@/components/QuizHistory'
import { 
  ProgressBar, 
  StatCard, 
  StreakDay 
} from '@/components/dashboard/DashboardComponents'

// Типи даних, які очікуємо від бекенду
interface DashboardData {
  userXp: number;
  stats: {
    streak: { current: number; longest: number; lastActiveDate: Date | null; history: boolean[]; historyDates?: string[] };
    activity: { 
      timeSpent: number; 
      quizAttempts: number;
    };
  };
  recentTopics: Array<{
    id: string;
    name: string;
    slug: string;
    progress: number;
    totalMaterials: number;
    viewedMaterials: number;
  }>;
  dailyGoals: Array<{
    id: string;
    text: string;
    isCompleted: boolean;
  }>;
  weakSpots: Array<{
    topic: string;
    advice: string;
  }>;
  tipOfTheDay: string;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    earned: boolean;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth()
  const { t, lang } = useTranslation()
  useActivityTracker() // Активуємо пінг активності

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Розрахунок рівня (візуальний)
  const xp = user?.xp ?? 0
  const level = Math.floor(xp / 100) + 1
  const progressToNext = Math.min(100, Math.round(((xp % 100) / 100) * 100))

  const streakDays = [
    t('dashboard.weekday.mon', 'Mon'),
    t('dashboard.weekday.tue', 'Tue'),
    t('dashboard.weekday.wed', 'Wed'),
    t('dashboard.weekday.thu', 'Thu'),
    t('dashboard.weekday.fri', 'Fri'),
    t('dashboard.weekday.sat', 'Sat'),
    t('dashboard.weekday.sun', 'Sun'),
  ]

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      // Don't load if user is not authenticated
      if (!user) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        // В реальності ти можеш зробити один запит GET /dashboard/summary
        // або кілька паралельних, як тут:
        const response = await apiGet<DashboardData>(`/dashboard/summary?lang=${lang}`)
        
        if (mounted) {
          setData(response)
        }
      } catch (err) {
        // Don't log "No token" errors - user is just not authenticated
        if (err instanceof Error && err.message !== 'No token') {
          console.error('Dashboard load failed:', err)
          if (mounted) setError('Failed to load dashboard data')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDashboard()
    return () => { mounted = false }
  }, [lang, user]) // Перезавантажуємо при зміні мови або user

  // Функція для відмітки цілі як виконаної (оптимістичний UI)
  const toggleGoal = async (goalId: string, currentState: boolean) => {
    if (!data) return
    
    // Optimistic update
    setData(prev => prev ? ({
      ...prev,
      dailyGoals: prev.dailyGoals.map(g => g.id === goalId ? { ...g, isCompleted: !currentState } : g)
    }) : null)

    try {
      await apiPost(`/progress/goals/${goalId}/toggle`, {})
    } catch {
      // Revert if failed
      setData(prev => prev ? ({
        ...prev,
        dailyGoals: prev.dailyGoals.map(g => g.id === goalId ? { ...g, isCompleted: currentState } : g)
      }) : null)
    }
  }

  if (loading) return <SkeletonDashboard />
  
  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-500 mb-4">{t('common.loadFailed', 'Failed to load data')}</p>
        <button onClick={() => window.location.reload()} className="btn">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    )
  }

  if (!data) return null

  const localeMap: Record<string, string> = { UA: 'uk-UA', PL: 'pl-PL', EN: 'en-US' }
  const historyDates = data.stats.streak.historyDates
  const streakLabels = Array.isArray(historyDates) && historyDates.length === 7
    ? historyDates.map((dateStr) => {
        const d = new Date(`${dateStr}T00:00:00Z`)
        return d.toLocaleDateString(localeMap[lang] || 'en-US', { weekday: 'short' })
      })
    : streakDays
  const todayIndex = Array.isArray(historyDates) ? historyDates.length - 1 : streakLabels.length - 1

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Hero Section */}
      <div className="card bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-3xl font-display font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-neutral-900 dark:text-white">
                {t('dashboard.welcome', 'Welcome')}, {user?.name}!
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-medium">
                  {t('dashboard.level', 'Lvl')} {level}
                </span>
                <span>{xp} XP</span>
              </div>
              <div className="mt-3 max-w-xs space-y-1">
                <div className="flex justify-between text-xs font-medium text-neutral-500">
                  <span>{t('dashboard.nextLevel', 'Next Level')}</span>
                  <span>{progressToNext}%</span>
                </div>
                <ProgressBar value={progressToNext} className="h-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <StatCard 
              icon={Flame} 
              label={t('dashboard.streak', 'Streak')} 
              value={data.stats.streak.current} 
              sub={t('dashboard.days', 'days')}
              color="text-orange-500"
              bgColor="bg-orange-50 dark:bg-orange-900/20"
            />
            <StatCard 
              icon={Target} 
              label={t('dashboard.attempts', 'Attempts')} 
              value={data.stats.activity.quizAttempts} 
              sub={t('dashboard.last7days', '7 days')}
              color="text-blue-500"
              bgColor="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard 
              icon={Clock} 
              label={t('dashboard.time', 'Time')} 
              value={`${(data.stats.activity.timeSpent / 3600).toFixed(1)}h`} 
              sub={t('dashboard.last7days', '7 days')}
              color="text-green-500"
              bgColor="bg-green-50 dark:bg-green-900/20"
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* 2. Continue Learning */}
          {Array.isArray(data.recentTopics) && data.recentTopics.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white px-1">
                {t('dashboard.continueLearning', 'Continue Learning')}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.recentTopics.map(topic => (
                  <div key={topic.id} className="card group hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                    <div className="flex flex-col h-full">
                      <div className="mb-4">
                        <h4 className="font-display font-semibold text-lg text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {topic.name}
                        </h4>
                        <p className="text-sm text-neutral-500 mt-1">
                          {topic.viewedMaterials}/{topic.totalMaterials} {t('materials.materialsViewed', 'materials')}
                        </p>
                      </div>
                      
                      <div className="mt-auto space-y-4">
                        <ProgressBar value={topic.progress} className="h-1.5" />
                        <div className="flex gap-3">
                          <Link 
                            to={`/materials?topic=${topic.slug}`} 
                            className="btn btn-sm flex-1 flex items-center justify-center gap-2"
                          >
                            <Play size={16} fill="currentColor" />
                            {t('common.continue', 'Continue')}
                          </Link>
                          <Link 
                            to="/materials" 
                            className="btn-outline btn-sm px-3"
                            aria-label={t('materials.all', 'All materials')}
                          >
                            <FileText size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Goals */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                {t('dashboard.dailyGoals', 'Daily Goals')}
              </h3>
            </div>
            
            <ul className="space-y-3">
              {Array.isArray(data.dailyGoals) && data.dailyGoals.map(g => (
                <li 
                  key={g.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                    g.isCompleted 
                      ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' 
                      : 'bg-white border-neutral-100 dark:bg-neutral-800/50 dark:border-neutral-800'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      g.isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-green-500'
                    }`}>
                      {g.isCompleted && <CheckCircle size={14} />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={g.isCompleted} 
                      onChange={() => toggleGoal(g.id, g.isCompleted)}
                    />
                    <span className={`font-medium transition-colors ${
                      g.isCompleted 
                        ? 'text-green-700 dark:text-green-400 line-through decoration-green-500/30' 
                        : 'text-neutral-700 dark:text-neutral-200'
                    }`}>
                      {g.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. Weak Spots */}
          {Array.isArray(data.weakSpots) && data.weakSpots.length > 0 && (
            <div className="card bg-gradient-to-br from-white to-red-50/30 dark:from-neutral-900 dark:to-red-900/10 border-red-100 dark:border-red-900/20">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white">
                  {t('dashboard.recommended', 'Recommended Review')}
                </h3>
              </div>
              <div className="space-y-3">
                {Array.isArray(data.weakSpots) && data.weakSpots.map((spot, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm">
                    <div className="flex gap-3">
                      <div className="mt-1 text-red-500">
                        <Zap size={18} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white">{spot.topic}</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{spot.advice}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-6">
          
          {/* 5. Streak Calendar */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white leading-tight">
                  {data.stats.streak.current} {t('dashboard.days', 'Day Streak')}
                </h3>
                <p className="text-xs text-neutral-500">
                  {t('dashboard.keepStreak', 'Keep it up!')}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
              {streakLabels.map((day, idx) => (
                <StreakDay 
                  key={idx} 
                  day={day} 
                  active={data.stats.streak.history[idx]} 
                  isToday={idx === todayIndex}
                />
              ))}
            </div>
          </div>

          {/* 6. Tip of the Day */}
          <div className="card bg-accent-50 dark:bg-accent-900/10 border-accent-100 dark:border-accent-900/30">
            <div className="flex gap-3">
              <div className="shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div>
                <h4 className="font-bold text-accent-900 dark:text-accent-100 text-sm mb-1">
                  {t('dashboard.tipOfDay', 'Tip of the Day')}
                </h4>
                <p className="text-sm text-accent-800 dark:text-accent-200/80 leading-relaxed">
                  {data.tipOfTheDay}
                </p>
              </div>
            </div>
          </div>

          {/* 7. Achievements (Mini) */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Award size={18} className="text-purple-500" />
                {t('dashboard.achievements', 'Achievements')}
              </h3>
              <Link to="/profile" className="text-xs text-primary-600 hover:underline">
                {t('common.view', 'View All')}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(data.achievements) && data.achievements.slice(0, 4).map(ach => (
                <span 
                  key={ach.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                    ach.earned
                      ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-neutral-50 text-neutral-400 border-neutral-100 dark:bg-neutral-900 dark:text-neutral-600 dark:border-neutral-800 grayscale opacity-60'
                  }`}
                >
                  {ach.earned ? '🏆' : '🔒'} {ach.name}
                </span>
              ))}
            </div>
          </div>

          {/* 8. Recent History */}
          <QuizHistory />

        </div>
      </div>
    </div>
  )
}
