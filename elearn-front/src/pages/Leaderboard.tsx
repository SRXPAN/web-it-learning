import { useEffect, useState } from 'react'
import { Trophy, Medal, Award, Crown, Star, Flame } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { api } from '@/lib/http'
import { useTranslation } from '@/i18n/useTranslation'
import { SkeletonList } from '@/components/Skeletons'
import type { TranslationKey } from '@/i18n/types'

interface LeaderboardUser {
  id: string
  name: string
  xp: number
  rank: number
  level: number
  badges: string[]
  createdAt: string
}

interface BadgeConfig {
  icon: typeof Trophy
  labelKey: TranslationKey
  color: string
  bg: string
}

const BADGE_INFO: Record<string, BadgeConfig> = {
  first_steps: { icon: Star, labelKey: 'badge.firstSteps', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  rising_star: { icon: Flame, labelKey: 'badge.risingStar', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  dedicated_learner: { icon: Medal, labelKey: 'badge.dedicatedLearner', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  quiz_master: { icon: Award, labelKey: 'badge.quizMaster', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  expert: { icon: Trophy, labelKey: 'badge.expert', color: 'text-green-500', bg: 'bg-green-500/10' },
  legend: { icon: Crown, labelKey: 'badge.legend', color: 'text-amber-500', bg: 'bg-amber-500/10' },
}

export default function Leaderboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    async function fetchLeaderboard() {
      try {
        setLoading(true)
        // Використовуємо новий api клієнт
        const data = await api<LeaderboardUser[]>('/auth/leaderboard?limit=50', {
          signal: controller.signal,
        })
        if (mounted) {
          // Ensure data is an array (defensive check)
          setLeaderboard(Array.isArray(data) ? data : [])
        }
      } catch (e) {
        if (mounted && !controller.signal.aborted) {
          setError(t('leaderboard.error.loadFailed', 'Failed to load leaderboard'))
          console.error(e)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchLeaderboard()
    
    return () => {
      mounted = false
      controller.abort()
    }
  }, [t])

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-lg shadow-orange-700/30'
    return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="card">
          <SkeletonList count={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 text-red-500">
          <Trophy size={32} />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('common.error', 'Error')}</h3>
        <p className="text-neutral-500 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-sm">
          {t('common.tryAgain', 'Try Again')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white">
            {t('leaderboard.title', 'Leaderboard')}
          </h1>
          <p className="text-neutral-500 mt-1">
            {t('leaderboard.loading', 'Top learners this week')}
          </p>
        </div>
        <div className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
          {leaderboard.length} {t('leaderboard.participants', 'participants')}
        </div>
      </div>

      {/* Top 3 Podium with Crowns (Only show if we have at least 3 users) */}
      {leaderboard.length >= 3 && (
        <div className="relative pt-8 pb-8 px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-end justify-center gap-4 sm:gap-8 text-center">
            
            {/* 2nd Place - Silver Crown */}
            <div className="flex flex-col items-center order-1 w-24 sm:w-32 group">
              <Medal className="text-slate-400 mb-2" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(100,116,139,0.4))' }} />
              <div className="relative mb-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-neutral-900 z-10 relative group-hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl font-bold text-slate-600 dark:text-slate-200">2</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {leaderboard[1].level} LVL
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base truncate w-full text-neutral-900 dark:text-white mb-0.5">
                {leaderboard[1].name}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {leaderboard[1].xp.toLocaleString()} XP
              </p>
            </div>
            
            {/* 1st Place - Gold Crown */}
            <div className="flex flex-col items-center order-0 w-28 sm:w-40 z-10 -mt-8 group">
              <Crown className="text-yellow-500 mb-2 animate-bounce drop-shadow-lg" size={40} />
              <div className="relative mb-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/20 ring-4 ring-white dark:ring-neutral-900 z-10 relative group-hover:scale-105 transition-transform duration-300">
                  <span className="text-4xl font-bold text-white">1</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm border border-white dark:border-neutral-900">
                  {leaderboard[0].level} LVL
                </div>
              </div>
              <h3 className="font-bold text-base sm:text-lg truncate w-full text-neutral-900 dark:text-white mb-0.5">
                {leaderboard[0].name}
              </h3>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {leaderboard[0].xp.toLocaleString()} XP
              </p>
            </div>
            
            {/* 3rd Place - Bronze Crown */}
            <div className="flex flex-col items-center order-2 w-24 sm:w-32 group">
              <Trophy className="text-orange-700 mb-2" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(180,83,9,0.4))' }} />
              <div className="relative mb-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-300 to-amber-700 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-neutral-900 z-10 relative group-hover:scale-105 transition-transform duration-300">
                  <span className="text-2xl font-bold text-white/90">3</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {leaderboard[2].level} LVL
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base truncate w-full text-neutral-900 dark:text-white mb-0.5">
                {leaderboard[2].name}
              </h3>
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                {leaderboard[2].xp.toLocaleString()} XP
              </p>
            </div>
          </div>
        </div>
      )}

      {/* List (Starting from 4th place onwards - Top 3 only on podium) */}
      <div className="card p-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-left border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4 font-semibold text-xs text-neutral-500 uppercase tracking-wider w-16 text-center">#</th>
                <th className="py-3 px-4 font-semibold text-xs text-neutral-500 uppercase tracking-wider">{t('leaderboard.user', 'User')}</th>
                <th className="py-3 px-4 font-semibold text-xs text-neutral-500 uppercase tracking-wider text-center w-24">{t('leaderboard.level', 'Level')}</th>
                <th className="py-3 px-4 font-semibold text-xs text-neutral-500 uppercase tracking-wider text-right w-32">XP</th>
                <th className="py-3 px-4 font-semibold text-xs text-neutral-500 uppercase tracking-wider hidden md:table-cell w-48">{t('leaderboard.badges', 'Badges')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {(Array.isArray(leaderboard) ? leaderboard : []).filter(u => u.rank > 3).map((u) => {
                const isCurrentUser = user && u.id === user.id
                return (
                  <tr 
                    key={u.id} 
                    className={`transition-colors ${
                      isCurrentUser 
                        ? 'bg-primary-50/60 dark:bg-primary-900/10 hover:bg-primary-100/50 dark:hover:bg-primary-900/20' 
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${getRankStyle(u.rank)}`}>
                        {u.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-600 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-medium text-sm ${isCurrentUser ? 'text-primary-700 dark:text-primary-400' : 'text-neutral-900 dark:text-white'}`}>
                            {u.name}
                            {isCurrentUser && <span className="ml-2 text-[10px] bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-bold">{t('leaderboard.you', 'YOU')}</span>}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {u.level}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-neutral-900 dark:text-white">
                      {u.xp.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex gap-1.5">
                        {u.badges.slice(0, 3).map(badge => {
                          const info = BADGE_INFO[badge]
                          if (!info) return null
                          const Icon = info.icon
                          return (
                            <div 
                              key={badge} 
                              className={`p-1.5 rounded-lg ${info.bg} ${info.color} hover:scale-110 transition-transform cursor-help`}
                              title={t(info.labelKey)}
                            >
                              <Icon size={14} />
                            </div>
                          )
                        })}
                        {u.badges.length > 3 && (
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500">
                            +{u.badges.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('leaderboard.error.loadFailed', 'Leaderboard is empty')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
