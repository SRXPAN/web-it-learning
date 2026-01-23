import { useEffect, useState } from 'react'
import { http } from '@/lib/http'
import { Clock, CheckCircle, XCircle, History } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '@/auth/AuthContext'
import { EmptyQuizHistory } from './EmptyState'
import { SkeletonList } from './Skeletons'

interface QuizAttempt {
  quizId: string
  quizTitle: string
  correct: number
  total: number
  lastAttempt: string
}

interface QuizHistoryResponse {
  data: QuizAttempt[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function QuizHistory() {
  const { t, lang } = useTranslation()
  const { user } = useAuth()
  const [history, setHistory] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Don't fetch if user is not logged in
    if (!user) {
      setLoading(false)
      return
    }
    
    let mounted = true
    
    async function fetchHistory() {
      try {
        setLoading(true)
        const data = await http.get<QuizHistoryResponse>(`/quiz/user/history?limit=5&lang=${lang}`)
        if (mounted) {
          const list = Array.isArray(data?.data) ? data.data : []
          setHistory(list)
        }
      } catch (e) {
        // Don't show error for "No token" - user is just not authenticated
        if (e instanceof Error && e.message !== 'No token') {
          if (mounted) {
            setError('Failed to load history')
            console.error(e)
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    fetchHistory()
    
    return () => { mounted = false }
  }, [lang, user]) // Removed 't' from dependencies - it can cause infinite loops

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const locale = lang === 'UA' ? 'uk-UA' : lang === 'PL' ? 'pl-PL' : 'en-US'
      return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getScoreColor = (correct: number, total: number) => {
    if (total === 0) return 'text-neutral-500'
    const percentage = (correct / total) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <History size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
        </div>
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-100 dark:border-red-900/30">
        <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
          <History size={20} />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
        </div>
        <p className="text-neutral-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
        </div>
        <EmptyQuizHistory className="py-8" />
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
            <History size={20} />
          </div>
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity', 'Recent Activity')}</h3>
        </div>
      </div>

      <div className="space-y-4">
        {history.map((attempt) => {
          const percentage = attempt.total > 0 ? Math.round((attempt.correct / attempt.total) * 100) : 0
          
          return (
            <div
              key={`${attempt.quizId}-${attempt.lastAttempt}`}
              className="group p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {attempt.quizTitle}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(attempt.lastAttempt)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-base font-bold tabular-nums ${getScoreColor(attempt.correct, attempt.total)}`}>
                      {attempt.correct}/{attempt.total}
                    </div>
                  </div>
                  
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    percentage >= 80 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                      : percentage >= 60 
                      ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {percentage >= 60 ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden w-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 80 
                      ? 'bg-green-500' 
                      : percentage >= 60 
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}