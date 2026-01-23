import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Trophy, CheckCircle2, Clock, Sparkles, ChevronRight,
  Award, Target, Lock, Loader2, ArrowRight, RotateCcw
} from 'lucide-react'

import { api } from '@/lib/http'
import { useTranslation } from '@/i18n/useTranslation'
import type { Quiz, QuizLite, Lang, LocalizedString } from '@elearn/shared'

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

// Helper for localization inside component to avoid external utils
const getLocalizedText = (json: LocalizedString | undefined | null, fallback: string, lang: Lang) => {
  if (!json) return fallback
  return json[lang] || json['EN'] || fallback
}

export function TopicQuizSection({
  quizzes,
  allMaterialsViewed,
  materialsCount,
  viewedCount,
  lang,
  onQuizComplete,
}: TopicQuizSectionProps) {
  const { t } = useTranslation()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizToken, setQuizToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Quiz Session State
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  
  // Results State
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)
  const [_correctIds, setCorrectIds] = useState<Record<string, string>>({})

  // Filter duplicate quizzes (by ID) - defensive programming
  const uniqueQuizzes = useMemo(() => {
    const seen = new Set<string>()
    return quizzes.filter(q => {
      if (seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })
  }, [quizzes])

  // Determine UI state
  const quizState: QuizState = useMemo(() => {
    if (!allMaterialsViewed) return 'locked'
    if (showResults) return 'completed'
    if (quizStarted) return 'in-progress'
    return 'ready'
  }, [allMaterialsViewed, showResults, quizStarted])

  // Timer Logic
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

  const loadQuiz = useCallback(async (quizId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<Quiz & { token: string }>(`/quiz/${quizId}?lang=${lang}`)
      setQuiz(data)
      setQuizToken(data.token)
      setTimeLeft(data.durationSec)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load quiz'
      console.error('Failed to load quiz:', e)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [lang])

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
    if (!quiz || !quizToken) return

    const answerArray = Object.entries(answers).map(([questionId, optionId]) => ({
      questionId,
      optionId,
    }))

    try {
      setLoading(true)
      // Submit attempt
      const result = await api<{ correct: number, correctMap: Record<string, string>, passed: boolean }>(
        `/quiz/${quiz.id}/submit`, 
        {
          method: 'POST',
          body: JSON.stringify({ 
            token: quizToken,
            answers: answerArray,
            lang 
          })
        }
      )
      
      setScore(result.correct)
      setCorrectIds(result.correctMap || {})
      setShowResults(true)
      setQuizStarted(false)

      if (result.passed) {
        onQuizComplete?.(true)
      }
    } catch (e) {
      console.error('Failed to submit quiz:', e)
      setError(e instanceof Error ? e.message : 'Failed to submit quiz')
    } finally {
      setLoading(false)
    }
  }, [quiz, quizToken, answers, lang, onQuizComplete])

  const resetQuiz = useCallback(() => {
    setQuiz(null)
    setQuizToken(null)
    setQuizStarted(false)
    setShowResults(false)
    setAnswers({})
    setScore(0)
    setCurrentQuestion(0)
    setError(null)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // If no quizzes exist for this topic
  if (quizzes.length === 0) return null

  const progress = materialsCount > 0 ? Math.round((viewedCount / materialsCount) * 100) : 0

  return (
    <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/10 dark:to-primary-900/5 px-6 py-4 border-b border-primary-100 dark:border-primary-900/30 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
          quizState === 'locked' 
            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400' 
            : quizState === 'completed'
            ? 'bg-green-100 dark:bg-green-900 text-green-600'
            : 'bg-primary-600 text-white'
        }`}>
          {quizState === 'locked' ? <Lock size={20} /> : 
           quizState === 'completed' ? <Award size={24} /> : 
           <Trophy size={24} />}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t('quiz.title', 'Quiz Section')}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {quizState === 'locked' 
              ? t('materials.progress', 'Complete materials to unlock')
              : quizState === 'completed'
              ? `${t('quiz.result', 'Result')}: ${score}/${quiz?.questions.length || 0}`
              : `${quizzes.length} ${t('search.quizzes', 'quizzes available')}`
            }
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* 1. Locked State */}
        {quizState === 'locked' && (
          <div className="text-center py-2">
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 mb-4 overflow-hidden">
              <div 
                className="bg-neutral-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mb-1 font-medium">
              {viewedCount} / {materialsCount} {t('materials.materialsViewed', 'materials viewed')}
            </p>
            <p className="text-xs text-neutral-400">
              {t('quiz.hint.reviewMaterials', 'Review all materials to unlock the quiz')}
            </p>
          </div>
        )}

        {/* 2. Ready State (List or Preview) */}
        {quizState === 'ready' && !quiz && (
          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {uniqueQuizzes.map((q) => {
              const quizTitle = getLocalizedText(q.titleJson, q.title, lang)
              return (
                <button
                  key={q.id}
                  onClick={() => loadQuiz(q.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                      <Target size={18} />
                    </div>
                    <span className="font-semibold text-neutral-900 dark:text-white">{quizTitle}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-500">
                    <span className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
                      <Clock size={14} />
                      {Math.ceil(q.durationSec / 60)} min
                    </span>
                    <ChevronRight size={16} className="group-hover:text-primary-500 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 2.1 Quiz Loaded Preview */}
        {quizState === 'ready' && quiz && !quizStarted && (
          <div className="space-y-6">
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/50 flex gap-3">
              <Sparkles className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-primary-900 dark:text-primary-100 text-sm">
                  {t('quiz.hint.practice', 'Ready to start?')}
                </h4>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  {t('quiz.checklist.score75', 'You need to score at least 75% to pass.')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetQuiz}
                className="btn-outline px-4"
              >
                {t('common.back', 'Back')}
              </button>
              <button
                onClick={startQuiz}
                className="btn flex-1 flex items-center justify-center gap-2"
              >
                <PlayIcon />
                {t('quiz.start', 'Start Quiz')}
              </button>
            </div>
          </div>
        )}

        {/* 3. In Progress */}
        {quizState === 'in-progress' && quiz && (
          <div className="space-y-6">
            {/* Progress & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                {t('quiz.question', 'Question')} {currentQuestion + 1} / {quiz.questions.length}
              </span>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-medium text-sm ${
                timeLeft < 30 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
              }`}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-300 ease-out"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            {quiz.questions[currentQuestion] && (
              <QuestionCard
                question={quiz.questions[currentQuestion]}
                selectedOption={answers[quiz.questions[currentQuestion].id]}
                onSelect={(optId) => handleAnswer(quiz.questions[currentQuestion].id, optId)}
                lang={lang}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))}
                disabled={currentQuestion === 0}
                className="btn-outline text-sm"
              >
                {t('common.back', 'Back')}
              </button>

              {currentQuestion < quiz.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(p => p + 1)}
                  className="btn text-sm flex items-center gap-2"
                >
                  {t('quiz.next', 'Next')}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {t('quiz.finish', 'Finish')}
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. Completed */}
        {quizState === 'completed' && quiz && (
          <div className="space-y-6 text-center">
            <div className={`py-8 rounded-2xl border-2 border-dashed ${
              score >= quiz.questions.length * 0.75
                ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30'
                : 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/30'
            }`}>
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                score >= quiz.questions.length * 0.75 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {score >= quiz.questions.length * 0.75 ? <Trophy size={40} /> : <Target size={40} />}
              </div>
              
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {score >= quiz.questions.length * 0.75 ? t('quiz.congratulations', 'Congratulations!') : t('quiz.tryAgain', 'Keep Practicing')}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                You scored <span className="font-bold text-neutral-900 dark:text-white">{score}</span> out of {quiz.questions.length}
              </p>
            </div>

            <button onClick={resetQuiz} className="btn-outline w-full flex items-center justify-center gap-2">
              <RotateCcw size={18} />
              {t('quiz.tryAgain', 'Try Again')}
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && !quizStarted && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center z-10 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ question, selectedOption, onSelect, lang }: { question: any, selectedOption?: string, onSelect: (id: string) => void, lang: Lang }) {
  const text = getLocalizedText(question.textJson, question.text, lang)
  
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
        {text}
      </h4>
      <div className="grid gap-3">
        {question.options.map((opt: any) => {
          const optText = getLocalizedText(opt.textJson, opt.text, lang)
          const isSelected = selectedOption === opt.id
          
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-primary-600 bg-primary-600' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                  {optText}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Simple Icon component for the "Start" button
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 3L19 12L5 21V3Z" />
  </svg>
)