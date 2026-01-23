import { useEffect, useState } from 'react'
import { X, Trash2, Save, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { listQuestions, updateQuestion, deleteQuestion, listQuizzes, updateQuiz } from '@/lib/editorApi'
import type { QuestionWithOptions, CreateQuestionRequest } from '@/lib/editorApi'
import type { Difficulty, LocalizedString } from '@elearn/shared'

interface EditQuizModalProps {
  quizId: string
  topicId: string
  onClose: () => void
  onSave?: () => void
}

export default function EditQuizModal({ quizId, topicId, onClose, onSave }: EditQuizModalProps) {
  const { t } = useTranslation()
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quizInfo, setQuizInfo] = useState<{ title: string; titleJson: LocalizedString; durationSec: number } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    listQuestions(quizId)
      .then((qs) => { if (mounted) setQuestions(qs) })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : 'Failed to load questions') })
      .finally(() => { if (mounted) setLoading(false) })
    // Load quiz meta (title translations, duration)
    listQuizzes(topicId)
      .then((quizzes) => {
        if (!mounted) return
        const q = quizzes.find(qz => qz.id === quizId)
        if (q) {
          const titleJson: LocalizedString = {
            EN: q.titleJson?.EN || '',
            UA: q.titleJson?.UA || '',
            PL: q.titleJson?.PL || '',
          }
          setQuizInfo({ title: q.title, titleJson, durationSec: q.durationSec })
        }
      })
      .catch(() => { /* ignore meta load errors */ })
    return () => { mounted = false }
  }, [quizId, topicId])

  const langs: Array<'EN' | 'UA' | 'PL'> = ['EN', 'UA', 'PL']

  const ensureLoc = (obj?: LocalizedString): LocalizedString => ({
    EN: obj?.EN || '',
    UA: obj?.UA || '',
    PL: obj?.PL || '',
  })

  const setQuestionLoc = (qId: string, field: 'textJson' | 'explanationJson', lang: 'EN' | 'UA' | 'PL', val: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? {
      ...q,
      [field]: { ...ensureLoc(q[field as keyof QuestionWithOptions] as any as LocalizedString), [lang]: val }
    } : q))
  }

  const setOptionLoc = (qId: string, optIndex: number, lang: 'EN' | 'UA' | 'PL', val: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? {
      ...q,
      options: q.options.map((opt, i) => i === optIndex ? {
        ...opt,
        textJson: { ...ensureLoc(opt.textJson as LocalizedString), [lang]: val }
      } : opt)
    } : q))
  }

  const setTitleLoc = (lang: 'EN' | 'UA' | 'PL', val: string) => {
    setQuizInfo(prev => prev ? ({
      ...prev,
      titleJson: { ...prev.titleJson, [lang]: val },
      title: lang === 'EN' ? val : prev.title
    }) : prev)
  }

  const handleSaveQuizMeta = async () => {
    if (!quizInfo) return
    setSaving(true)
    setError(null)
    try {
      await updateQuiz(topicId, quizId, {
        title: quizInfo.title,
        titleJson: { EN: quizInfo.titleJson.EN || '', UA: quizInfo.titleJson.UA || '', PL: quizInfo.titleJson.PL || '' },
        durationSec: Math.max(10, Math.min(3600, Number(quizInfo.durationSec) || 0))
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to update quiz settings')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (q: QuestionWithOptions) => {
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<CreateQuestionRequest> = {
        text: q.text,
        textJson: ensureLoc(q.textJson as LocalizedString),
        difficulty: q.difficulty as Difficulty,
        tags: q.tags || [],
        explanation: q.explanation,
        explanationJson: ensureLoc(q.explanationJson as LocalizedString),
        options: q.options.map((o) => ({ 
          text: o.text, 
          textJson: ensureLoc(o.textJson as LocalizedString),
          correct: !!o.correct 
        }))
      }
      const updated = await updateQuestion(quizId, q.id, payload)
      setQuestions(prev => prev.map(item => item.id === updated.id ? updated : item))
    } catch (e: any) {
      setError(e?.message || 'Failed to update question')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('dialog.deleteConfirmation', 'Delete this question?'))) return
    setSaving(true)
    setError(null)
    try {
      await deleteQuestion(quizId, id)
      setQuestions(prev => prev.filter(q => q.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Failed to delete question')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Edit Quiz Questions
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-900/50 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
              <Loader2 className="animate-spin" size={18} />
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quiz Settings */}
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Quiz Settings</h3>
                  <button
                    onClick={handleSaveQuizMeta}
                    disabled={saving || !quizInfo}
                    className="px-3 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {t('common.save', 'Save')}
                  </button>
                </div>
                {quizInfo && (
                  <div className="mt-3 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Title</label>
                        <input
                          className="input w-full"
                          value={quizInfo.title}
                          onChange={(e) => setQuizInfo(prev => prev ? ({ ...prev, title: e.target.value }) : prev)}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Duration (sec)</label>
                        <input
                          type="number"
                          min={10}
                          max={3600}
                          className="input w-full"
                          value={quizInfo.durationSec}
                          onChange={(e) => {
                            const v = parseInt(e.target.value || '0', 10)
                            setQuizInfo(prev => prev ? ({ ...prev, durationSec: isNaN(v) ? 0 : v }) : prev)
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30">
                      {langs.map(l => (
                        <div key={l} className="flex items-center gap-3">
                          <span className="w-8 text-xs font-bold text-neutral-400 uppercase">{l}</span>
                          <input
                            className="input w-full text-sm"
                            value={quizInfo.titleJson[l] || ''}
                            onChange={(e) => setTitleLoc(l, e.target.value)}
                            placeholder={`Title (${l})`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {questions.length === 0 && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  No questions yet. Add some in the quiz creation modal.
                </div>
              )}

              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-neutral-400">#{idx + 1}</span>
                    <input
                      className="input w-full"
                      value={q.text}
                      onChange={(e) => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, text: e.target.value } : item))}
                    />
                  </div>

                  {/* Question Text Translations */}
                  <div className="mt-3 grid gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30">
                    {langs.map(l => (
                      <div key={l} className="flex items-center gap-3">
                        <span className="w-8 text-xs font-bold text-neutral-400 uppercase">{l}</span>
                        <input
                          className="input w-full text-sm"
                          value={ensureLoc(q.textJson as LocalizedString)[l]}
                          onChange={(e) => setQuestionLoc(q.id, 'textJson', l, e.target.value)}
                          placeholder={`Question text (${l})`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Explanation Translations */}
                  <div className="mt-3 grid gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30">
                    {langs.map(l => (
                      <div key={l} className="flex items-start gap-3">
                        <span className="w-8 text-xs font-bold text-neutral-400 uppercase pt-2.5">{l}</span>
                        <textarea
                          className="input w-full text-sm resize-none"
                          rows={2}
                          value={ensureLoc(q.explanationJson as LocalizedString)[l]}
                          onChange={(e) => setQuestionLoc(q.id, 'explanationJson', l, e.target.value)}
                          placeholder={`Explanation (${l})`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2">
                    {q.options.map((o, oi) => (
                      <div key={o.id || oi} className="flex items-center gap-3">
                        <input
                          className="input flex-1"
                          value={o.text}
                          onChange={(e) => setQuestions(prev => prev.map((item) => item.id === q.id ? {
                            ...item,
                            options: item.options.map((opt, i) => i === oi ? { ...opt, text: e.target.value } : opt)
                          } : item))}
                        />
                        <label className="text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!o.correct}
                            onChange={(e) => setQuestions(prev => prev.map((item) => item.id === q.id ? {
                              ...item,
                              options: item.options.map((opt, i) => i === oi ? { ...opt, correct: e.target.checked } : opt)
                            } : item))}
                          />
                          Correct
                        </label>
                      </div>
                    ))}

                    {/* Option Text Translations */}
                    <div className="mt-2 grid gap-2">
                      {q.options.map((o, oi) => (
                        <div key={`optloc-${o.id || oi}`} className="grid gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/30">
                          {langs.map(l => (
                            <div key={`${oi}-${l}`} className="flex items-center gap-3">
                              <span className="w-8 text-xs font-bold text-neutral-400 uppercase">{l}</span>
                              <input
                                className="input w-full text-sm"
                                value={ensureLoc(o.textJson as LocalizedString)[l]}
                                onChange={(e) => setOptionLoc(q.id, oi, l, e.target.value)}
                                placeholder={`Option text (${l})`}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => handleUpdate(q)}
                      disabled={saving}
                      className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            {t('common.cancel', 'Close')}
          </button>
          <button
            onClick={() => { onSave?.(); onClose() }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {t('common.save', 'Done')}
          </button>
        </div>
      </div>
    </div>
  )
}
