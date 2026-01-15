import { useEffect, useState } from 'react'
import { http } from '@/lib/http'
import { Trophy, Clock, CheckCircle, XCircle, Loader2, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'

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
  const [history, setHistory] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        const data = await http.get<QuizHistoryResponse>(`/quiz/user/history?limit=5&lang=${lang}`)
        const list = Array.isArray(data?.data) ? data.data : []
        setHistory(list)
      } catch (e) {
        setError(t('quiz.error.historyLoadFailed'))
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [lang]) // Refetch when language changes

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = lang === 'UA' ? 'uk-UA' : lang === 'PL' ? 'pl-PL' : 'en-US'
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (correct: number, total: number) => {
    const percentage = (correct / total) * 100
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity')}</h3>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity')}</h3>
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
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity')}</h3>
        </div>
        <div className="text-center py-8">
          <Trophy size={40} className="mx-auto mb-3 text-neutral-300" />
          <p className="text-neutral-500">{t('quiz.noHistory')}</p>
          <Link to="/materials" className="btn mt-4 inline-flex">
            {t('dashboard.startLearning')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-display font-semibold">{t('dashboard.recentActivity')}</h3>
        </div>
        <Link to="/quiz" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
          {t('dashboard.allQuizzes')} →
        </Link>
      </div>

      <div className="space-y-3">
        {history.map((attempt) => {
          const percentage = Math.round((attempt.correct / attempt.total) * 100)
          
          return (
            <div
              key={`${attempt.quizId}-${attempt.lastAttempt}`}
              className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                    {attempt.quizTitle}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(attempt.lastAttempt)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getScoreColor(attempt.correct, attempt.total)}`}>
                      {attempt.correct}/{attempt.total}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {percentage}%
                    </div>
                  </div>
                  
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    percentage >= 80 
                      ? 'bg-green-100 dark:bg-green-900/50' 
                      : percentage >= 60 
                      ? 'bg-yellow-100 dark:bg-yellow-900/50'
                      : 'bg-red-100 dark:bg-red-900/50'
                  }`}>
                    {percentage >= 60 ? (
                      <CheckCircle size={20} className={getScoreColor(attempt.correct, attempt.total)} />
                    ) : (
                      <XCircle size={20} className={getScoreColor(attempt.correct, attempt.total)} />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
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
