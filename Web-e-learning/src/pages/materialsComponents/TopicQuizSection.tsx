import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Award,
  Target,
  Lock,
  Loader2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { fetchQuiz, submitQuizAttempt } from '@/services/quiz'
import { useTranslation } from '@/i18n/useTranslation'
import { localize } from '@/utils/localize'
import { logQuizAttempt } from '@/utils/activity'
import type { Quiz, Question, QuizLite, Lang, LocalizedString } from '@elearn/shared'

interface TopicQuizSectionProps {
  quizzes: QuizLite[]
  topicName: string
  allMaterialsViewed: boolean
  materialsCount: number
  viewedCount: number
  lang: Lang
  onQuizComplete?: (passed: boolean) => void
}

type QuizState = 'locked' | 'ready' | 'in-progress' | 'completed'

export function TopicQuizSection({
  quizzes,
  topicName,
  allMaterialsViewed,
  materialsCount,
  viewedCount,
  lang,
  onQuizComplete,
}: TopicQuizSectionProps) {
  const { t } = useTranslation()
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [correctIds, setCorrectIds] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)

  // Timer
  useEffect(() => {
    if (!quizStarted || timeLeft <= 0 || showResults) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [quizStarted, timeLeft, showResults])

  const quizState: QuizState = useMemo(() => {
    if (!allMaterialsViewed) return 'locked'
    if (showResults) return 'completed'
    if (quizStarted) return 'in-progress'
    return 'ready'
  }, [allMaterialsViewed, showResults, quizStarted])

  const loadQuiz = useCallback(async (quizId: string) => {
    setLoading(true)
    try {
      const data = await fetchQuiz(quizId)
      setQuiz(data)
      setTimeLeft(data.durationSec)
      setSelectedQuizId(quizId)
    } catch (e) {
      console.error('Failed to load quiz:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const startQuiz = useCallback(() => {
    if (quiz) {
      setQuizStarted(true)
      setCurrentQuestion(0)
      setAnswers({})
      setShowResults(false)
      setScore(0)
    }
  }, [quiz])

  const handleAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!quiz) return

    const answerArray = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }))

    try {
      const result = await submitQuizAttempt(quiz.id, { 
        answers: answerArray, 
        lang,
        token: quiz.token 
      })
      setScore(result.correct)
      setCorrectIds(result.correctMap || {})
      setShowResults(true)
      setQuizStarted(false)

      const passed = result.correct >= quiz.questions.length * 0.75
      logQuizAttempt()
      onQuizComplete?.(passed)
    } catch (e) {
      console.error('Failed to submit quiz:', e)
    }
  }, [quiz, answers, onQuizComplete, lang])

  const resetQuiz = useCallback(() => {
    setQuiz(null)
    setSelectedQuizId(null)
    setQuizStarted(false)
    setShowResults(false)
    setAnswers({})
    setScore(0)
    setCurrentQuestion(0)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // No quizzes available
  if (quizzes.length === 0) return null

  const progress = materialsCount > 0 ? Math.round((viewedCount / materialsCount) * 100) : 0

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/20 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          quizState === 'locked' 
            ? 'bg-gray-200 dark:bg-gray-700' 
            : quizState === 'completed'
            ? 'bg-green-100 dark:bg-green-900/50'
            : 'bg-gradient-to-br from-blue-500 to-purple-600'
        }`}>
          {quizState === 'locked' ? (
            <Lock className="w-5 h-5 text-gray-400" />
          ) : quizState === 'completed' ? (
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Trophy className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('quiz.title') || 'Тест для закріплення'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {quizState === 'locked' 
              ? `${t('materials.progress') || 'Прогрес'}: ${viewedCount}/${materialsCount} (${progress}%)`
              : quizState === 'completed'
              ? `${t('quiz.completed') || 'Завершено'}: ${score}/${quiz?.questions.length || 0}`
              : `${quizzes.length} ${quizzes.length === 1 ? 'тест' : 'тести'}`
            }
          </p>
        </div>
      </div>

      {/* Locked State */}
      {quizState === 'locked' && (
        <div className="text-center py-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('materials.viewAllMaterials') || 'Перегляньте всі матеріали, щоб розблокувати тест'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t('materials.remaining') || 'Залишилось'}: {materialsCount - viewedCount} {materialsCount - viewedCount === 1 ? 'матеріал' : 'матеріалів'}
          </p>
        </div>
      )}

      {/* Ready State - Quiz Selection */}
      {quizState === 'ready' && !quiz && (
        <div className="space-y-2">
          {quizzes.map((q) => {
            const quizTitle = localize(q.titleJson as LocalizedString, q.title, lang)
            return (
              <button
                key={q.id}
                onClick={() => loadQuiz(q.id)}
                disabled={loading}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-900 dark:text-white">{quizTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {Math.floor(q.durationSec / 60)} хв
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Ready State - Quiz Preview */}
      {quizState === 'ready' && quiz && !quizStarted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {localize(quiz.titleJson as LocalizedString, quiz.title, lang)}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {quiz.questions.length} {t('quiz.question') || 'питань'} • {Math.floor(quiz.durationSec / 60)} хв
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetQuiz}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('quiz.hint.practice') || 'Для проходження потрібно набрати ≥75%'}
            </p>
          </div>

          <button
            onClick={startQuiz}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            {t('quiz.start') || 'Почати тест'}
          </button>
        </div>
      )}

      {/* In Progress State */}
      {quizState === 'in-progress' && quiz && (
        <div className="space-y-4">
          {/* Timer & Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('quiz.question') || 'Питання'} {currentQuestion + 1} / {quiz.questions.length}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              timeLeft < 30 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>

          {/* Question */}
          {quiz.questions[currentQuestion] && (
            <QuestionCard
              question={quiz.questions[currentQuestion]}
              selectedOption={answers[quiz.questions[currentQuestion].id]}
              onSelect={(optionId) => handleAnswer(quiz.questions[currentQuestion].id, optionId)}
              lang={lang}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('common.back') || 'Назад'}
            </button>

            {currentQuestion < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion((p) => p + 1)}
                disabled={!answers[quiz.questions[currentQuestion].id]}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {t('quiz.next') || 'Далі'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length < quiz.questions.length}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white font-medium rounded-lg transition-all flex items-center gap-2"
              >
                {t('quiz.finish') || 'Завершити'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completed State */}
      {quizState === 'completed' && quiz && (
        <div className="space-y-4">
          <div className={`text-center py-6 rounded-xl ${
            score >= quiz.questions.length * 0.75
              ? 'bg-green-50 dark:bg-green-900/30'
              : 'bg-orange-50 dark:bg-orange-900/30'
          }`}>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
              score >= quiz.questions.length * 0.75
                ? 'bg-green-100 dark:bg-green-800'
                : 'bg-orange-100 dark:bg-orange-800'
            }`}>
              {score >= quiz.questions.length * 0.75 ? (
                <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : (
                <Target className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              )}
            </div>
            <h4 className={`text-2xl font-bold ${
              score >= quiz.questions.length * 0.75
                ? 'text-green-600 dark:text-green-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {score} / {quiz.questions.length}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {score >= quiz.questions.length * 0.75
                ? t('quiz.congratulations') || 'Вітаємо! Тест пройдено!'
                : t('quiz.tryAgainMessage') || 'Спробуйте ще раз'}
            </p>
          </div>

          {/* Show answers */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {quiz.questions.map((q, idx) => {
              const questionText = localize(q.textJson as LocalizedString, q.text, lang)
              const isCorrect = answers[q.id] === correctIds[q.id]
              return (
                <div key={q.id} className={`p-3 rounded-xl border ${
                  isCorrect 
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30'
                }`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {idx + 1}. {questionText}
                      </p>
                      {q.explanation && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {localize(q.explanationJson as LocalizedString, q.explanation, lang)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={resetQuiz}
            className="w-full py-2.5 px-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t('quiz.tryAgain') || 'Спробувати ще раз'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}
    </div>
  )
}

// Question Card Component
interface QuestionCardProps {
  question: Question
  selectedOption?: string
  onSelect: (optionId: string) => void
  lang: Lang
}

function QuestionCard({ question, selectedOption, onSelect, lang }: QuestionCardProps) {
  const questionText = localize(question.textJson as LocalizedString, question.text, lang)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-3 mb-4">
        <HelpCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-gray-900 dark:text-white font-medium">{questionText}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          const optionText = localize(option.textJson as LocalizedString, option.text, lang)
          const isSelected = selectedOption === option.id

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm ${
                  isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {optionText}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TopicQuizSection
