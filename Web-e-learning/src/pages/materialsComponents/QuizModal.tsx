import { memo, useState } from 'react'
import { X, Plus, Trash2, CheckCircle2, Circle, Clock, Save, AlertCircle } from 'lucide-react'
import { api } from '@/lib/http'
import { useTranslation } from '@/i18n/useTranslation'
import { LoadingButton } from '@/components/LoadingButton'
import type { Difficulty } from '@elearn/shared'

interface QuizModalProps {
  topicId: string
  onClose: () => void
  onSave?: () => void
}

interface Option {
  text: string
  correct: boolean
}

interface Question {
  text: string
  difficulty: Difficulty
  options: Option[]
}

export const QuizModal = memo(function QuizModal({
  topicId,
  onClose,
  onSave,
}: QuizModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [durationSec, setDurationSec] = useState(300)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      text: '',
      difficulty: 'MEDIUM',
      options: [
        { text: '', correct: true },
        { text: '', correct: false },
      ]
    }])
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const addOption = (qIndex: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIndex 
        ? { ...q, options: [...q.options, { text: '', correct: false }] }
        : q
    ))
  }

  const updateOption = (qIndex: number, oIndex: number, field: keyof Option, value: any) => {
    setQuestions(prev => prev.map((q, qi) => 
      qi === qIndex 
        ? {
            ...q,
            options: q.options.map((o, oi) => 
              oi === oIndex ? { ...o, [field]: value } : o
            )
          }
        : q
    ))
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions(prev => prev.map((q, qi) => 
      qi === qIndex 
        ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) }
        : q
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Validation
    if (!title.trim()) {
      setError('Quiz title is required')
      return
    }

    if (questions.length === 0) {
      setError('At least one question is required')
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is required`)
        return
      }
      if (q.options.length < 2) {
        setError(`Question ${i + 1} must have at least 2 options`)
        return
      }
      if (!q.options.some(o => o.correct)) {
        setError(`Question ${i + 1} must have at least one correct answer`)
        return
      }
      if (q.options.some(o => !o.text.trim())) {
        setError(`All options in Question ${i + 1} must have text`)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create Quiz
      // Використовуємо editor endpoint замість admin, як було у lib/index.ts
      const newQuiz = await api<{ id: string }>(`/editor/topics/${topicId}/quizzes`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          durationSec,
          topicId
        })
      })

      // 2. Add Questions (Parallel requests for speed)
      if (newQuiz?.id) {
        await Promise.all(questions.map(q => 
          api(`/editor/quizzes/${newQuiz.id}/questions`, {
            method: 'POST',
            body: JSON.stringify({
              text: q.text,
              difficulty: q.difficulty,
              options: q.options,
              tags: []
            })
          })
        ))
      }

      onSave?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Plus size={20} className="text-primary-600" />
            {t('editor.add_quiz', 'Create Quiz')}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Quiz Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                {t('editor.quiz_title', 'Quiz Title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('editor.placeholder.quizTitle', 'Enter quiz title')}
                className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  {t('editor.label.duration', 'Duration (seconds)')} <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="number"
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value) || 300)}
                min="30"
                max="3600"
                className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Questions <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full text-xs">{questions.length}</span>
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium transition-colors shadow-sm"
              >
                <Plus size={16} />
                {t('editor.add_question', 'Add Question')}
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <p className="text-neutral-500 dark:text-neutral-400 mb-2">No questions yet</p>
                <button 
                  type="button" 
                  onClick={addQuestion}
                  className="text-primary-600 dark:text-primary-400 font-medium hover:underline text-sm"
                >
                  Click here to create the first one
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((question, qIdx) => (
                  <div
                    key={qIdx}
                    className="group bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 space-y-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                            {t('editor.question', 'Question')} {qIdx + 1}
                          </label>
                          <select
                            value={question.difficulty}
                            onChange={(e) => updateQuestion(qIdx, 'difficulty', e.target.value)}
                            className="text-xs px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:border-primary-500 outline-none"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                          placeholder={t('editor.placeholder.questionText', 'Enter question text...')}
                          className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-start mt-6"
                        title={t('editor.delete_question', 'Delete question')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Options */}
                    <div className="pl-0 sm:pl-4 border-l-2 border-neutral-200 dark:border-neutral-700 space-y-3">
                      {question.options.map((option, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateOption(qIdx, oIdx, 'correct', !option.correct)}
                            className="flex-shrink-0 focus:outline-none"
                            title={option.correct ? 'Correct Answer' : 'Mark as Correct'}
                          >
                            {option.correct ? (
                              <CheckCircle2 size={22} className="text-green-500" />
                            ) : (
                              <Circle size={22} className="text-neutral-300 dark:text-neutral-600 hover:text-green-500 dark:hover:text-green-500 transition-colors" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                            placeholder={`${t('editor.options', 'Option')} ${oIdx + 1}`}
                            className={`flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none transition-colors ${
                              option.correct 
                                ? 'border-green-300 dark:border-green-800 ring-1 ring-green-500/20' 
                                : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500'
                            }`}
                            required
                          />

                          {question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIdx, oIdx)}
                              className="text-neutral-300 hover:text-red-500 transition-colors px-1"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => addOption(qIdx)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium pl-9"
                      >
                        + {t('editor.add_option', 'Add Option')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-colors text-sm"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            icon={<Save size={16} />}
            className="px-6 py-2 text-sm"
          >
            {t('editor.save_changes', 'Save Quiz')}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
})