import { useState, useEffect } from 'react'
import { ChevronRight, Play, FileText, Video, Link as LinkIcon, Code, CheckCircle, XCircle, Timer, Lightbulb, Award, ListChecks, Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchLesson, type Lesson } from '@/services/lessons'
import { getLocalizedContent } from '@/utils/materialHelpers'

type ContentType = 'notes' | 'video' | 'quiz' | 'code'
type Mode = 'practice' | 'exam'

type Question = {
  id: string
  text: string
  options: string[]
  correct: number
  explanation: string
}

type TestCase = {
  input: string
  expected: string
  passed: boolean
}

const mockTests: TestCase[] = [
  { input: '[1,2,3,4,5], target=3', expected: '2', passed: true },
  { input: '[1,3,5,7,9], target=5', expected: '2', passed: true },
  { input: '[2,4,6,8], target=7', expected: '-1', passed: false },
]

export default function LessonView() {
  const { t, lang } = useTranslation()

  const mockQuestion: Question = {
    id: 'q1',
    text: t('lesson.mock.questionText'),
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correct: 1,
    explanation: t('lesson.mock.explanation')
  }
  const { topicId, lessonId } = useParams()
  const nav = useNavigate()
  
  // API data state
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [mode, setMode] = useState<Mode>('practice')
  const [content, setContent] = useState<ContentType>('notes')
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // секунди для екзамену

  // Fetch lesson data from API
  useEffect(() => {
    if (!lessonId) return
    
    setLoading(true)
    setError(null)
    
    fetchLesson(lessonId, lang as 'UA' | 'PL' | 'EN')
      .then(data => {
        setLesson(data)
        // Set initial content type based on material type
        if (data.type === 'video') setContent('video')
        else if (data.type === 'text') setContent('notes')
        else setContent('notes')
      })
      .catch(err => {
        setError(err.message || t('common.error'))
      })
      .finally(() => setLoading(false))
  }, [lessonId, lang, t])

  const breadcrumbs = [
    { label: t('lesson.breadcrumb.algorithms'), onClick: () => nav('/materials') },
    { label: lesson?.topic?.name || topicId || t('lesson.breadcrumb.search'), onClick: () => nav('/materials'), current: !lessonId },
    { label: lesson ? getLocalizedContent(lesson, lang).title : lessonId || t('lesson.breadcrumb.binarySearch'), current: true },
  ]
  
  if (loading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }
  
  if (!topicId || !lessonId) {
    return (
      <div className="card">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('lesson.placeholder')} (missing topic/lesson id)
        </p>
      </div>
    )
  }

  const tocItems = [
    { icon: FileText, label: t('lesson.content.notes'), type: 'notes' as ContentType },
    { icon: Video, label: t('lesson.content.video'), type: 'video' as ContentType },
    { icon: LinkIcon, label: 'PDF', type: 'notes' as ContentType },
    { icon: Code, label: t('lesson.content.quiz'), type: 'quiz' as ContentType },
    { icon: Code, label: t('lesson.content.code'), type: 'code' as ContentType },
  ]

  const hints = [
    t('lesson.hint.sortedOnly'),
    t('lesson.hint.splitHalf'),
    t('lesson.hint.complexity'),
  ]

  const achievements = [t('lesson.achievement.firstQuiz'), t('lesson.achievement.fastAnswer'), t('lesson.achievement.accuracy90')]

  const checklistSteps = [
    { done: true, label: t('quiz.checklist.reviewMaterials') },
    { done: true, label: t('quiz.checklist.pickMode') },
    { done: false, label: t('quiz.checklist.score75') },
    { done: false, label: t('quiz.checklist.answerAll') },
  ]

  function handleAnswer() {
    if (selectedAnswer === null) return
    if (mode === 'practice') {
      setShowExplanation(true)
    } else {
      // Exam mode: just move to next
      setCurrentQ(q => q + 1)
      setSelectedAnswer(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight size={14} />}
            {crumb.current ? (
              <span className="font-semibold text-neutral-900 dark:text-white">{crumb.label}</span>
            ) : (
              <button onClick={crumb.onClick} className="hover:text-primary-600 dark:hover:text-primary-400">
                {crumb.label}
              </button>
            )}
          </span>
        ))}
      </nav>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{t('quiz.mode')}:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('practice')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              mode === 'practice'
                ? 'bg-primary-600 text-white shadow-neo'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            {t('quiz.practice')}
          </button>
          <button
            onClick={() => setMode('exam')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              mode === 'exam'
                ? 'bg-accent-600 text-white shadow-neo'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
          >
            {t('quiz.exam')}
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-[280px_1fr_320px] gap-6">
        {/* Left Sidebar: TOC */}
        <aside className="card h-max sticky top-24 space-y-6">
          <div>
            <h3 className="font-display font-semibold mb-3 text-neutral-900 dark:text-white">{t('lesson.toc')}</h3>
            <ul className="space-y-2">
              {tocItems.map((item, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => setContent(item.type)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      content === item.type
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">{t('lesson.progress')}</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400">36%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '36%' }} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {t('lesson.progressRequirement')}
            </p>
          </div>
        </aside>

        {/* Center: Content Area */}
        <section className="card space-y-6">
          {/* Content Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[t('lesson.content.notes'), t('lesson.content.video'), t('lesson.content.quiz'), t('lesson.content.code')].map((tab, idx) => {
              const types: ContentType[] = ['notes', 'video', 'quiz', 'code']
              const isActive = content === types[idx]
              return (
                <button
                  key={tab}
                  onClick={() => setContent(types[idx])}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-accent-500 text-white shadow-neo'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Quiz Content */}
          {content === 'quiz' && (
            <div className="space-y-6">
              {/* Status Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800">
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {t('lesson.questionCounter')} {currentQ + 1}/10
                </span>
                {mode === 'exam' ? (
                  <div className="flex items-center gap-2 text-accent-600 dark:text-accent-400">
                    <Timer size={18} />
                    <span className="font-bold">{timeLeft}s</span>
                  </div>
                ) : (
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{t('quiz.explanationImmediate')}</span>
                )}
              </div>

              {/* Question */}
              <div>
                <h5 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-6">
                  {mockQuestion.text}
                </h5>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-3">
                  {mockQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedAnswer === idx
                          ? 'border-primary-600 bg-primary-50 dark:border-primary-500 dark:bg-primary-950'
                          : 'border-neutral-200 hover:border-primary-400 dark:border-neutral-700 dark:hover:border-primary-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            selectedAnswer === idx
                              ? 'bg-primary-600 text-white'
                              : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-medium text-neutral-900 dark:text-white">{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation (Practice mode) */}
              {mode === 'practice' && showExplanation && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <Lightbulb size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h6 className="font-semibold text-green-900 dark:text-green-100 mb-1">{t('lesson.explanationTitle')}</h6>
                      <p className="text-sm text-green-800 dark:text-green-300">{mockQuestion.explanation}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button className="btn flex-1" onClick={handleAnswer} disabled={selectedAnswer === null}>
                  {t('quiz.answer')}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setCurrentQ(q => q + 1)
                    setSelectedAnswer(null)
                    setShowExplanation(false)
                  }}
                >
                  {t('quiz.skip')}
                </button>
              </div>
            </div>
          )}

          {/* Code Practice Content */}
          {content === 'code' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h5 className="text-xl font-display font-bold text-neutral-900 dark:text-white">
                  binarySearch(arr, x)
                </h5>
                <button className="btn">
                  <Play size={16} className="inline mr-2" />
                  {t('lesson.run')}
                </button>
              </div>

              <div className="grid md:grid-cols-[1fr_300px] gap-4">
                {/* Code Editor */}
                <div className="p-4 rounded-2xl bg-neutral-900 text-neutral-100 font-mono text-sm border border-neutral-800">
                  <pre className="whitespace-pre-wrap">
{`function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`}
                  </pre>
                </div>

                {/* Test Cases */}
                <div className="space-y-2">
                  <h6 className="font-semibold text-neutral-900 dark:text-white mb-3">{t('lesson.tests')}</h6>
                  {mockTests.map((test, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border-2 ${
                        test.passed
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {test.passed ? (
                          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle size={16} className="text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {t('lesson.testTitle')} {idx + 1}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{test.input}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500">{t('lesson.test.expected')}: {test.expected}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes/Video placeholder */}
          {content === 'notes' && (
            <div className="space-y-6">
              {/* Lesson Title */}
              <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {lesson ? getLocalizedContent(lesson, lang).title : t('lesson.placeholder')}
              </h2>
              
              {/* Lesson Content */}
              {lesson?.content ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300"
                    dangerouslySetInnerHTML={{ __html: getLocalizedContent(lesson, lang).content || lesson.content || '' }}
                  />
                </div>
              ) : lesson?.url ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  {lesson.type === 'pdf' ? (
                    <>
                      <FileText size={48} className="text-primary-600 dark:text-primary-400" />
                      <a 
                        href={getLocalizedContent(lesson, lang).url || lesson.url || ''} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn"
                      >
                        {t('lesson.openPdf')}
                      </a>
                    </>
                  ) : lesson.type === 'link' ? (
                    <>
                      <LinkIcon size={48} className="text-primary-600 dark:text-primary-400" />
                      <a 
                        href={getLocalizedContent(lesson, lang).url || lesson.url || ''} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn"
                      >
                        {t('lesson.openLink')}
                      </a>
                    </>
                  ) : (
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {t('lesson.noContent')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center py-12 text-neutral-600 dark:text-neutral-400">
                  {t('lesson.noContent')}
                </p>
              )}
            </div>
          )}
          
          {content === 'video' && (
            <div className="space-y-6">
              {/* Lesson Title */}
              <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {lesson?.title || t('lesson.placeholder')}
              </h2>
              
              {/* Video Player */}
              {lesson?.url && lesson.type === 'video' ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900">
                  {lesson.url.includes('youtube.com') || lesson.url.includes('youtu.be') ? (
                    <iframe
                      src={lesson.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={lesson.url}
                      controls
                      className="w-full h-full"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Video size={48} className="mx-auto mb-4 text-neutral-400" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {t('lesson.noVideo')}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Sidebar: Help Panel */}
        <aside className="space-y-6">
          {/* Hints */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={20} className="text-primary-600 dark:text-primary-400" />
              <h3 className="font-display font-semibold text-neutral-900 dark:text-white">{t('quiz.hints')}</h3>
            </div>
            <ul className="space-y-2">
              {hints.map((hint, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="text-primary-600 dark:text-primary-400">•</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Achievements */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Award size={20} className="text-primary-600 dark:text-primary-400" />
              <h3 className="font-display font-semibold text-neutral-900 dark:text-white">{t('dashboard.achievements')}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.map((ach, idx) => (
                <span
                  key={idx}
                  className="badge"
                >
                  {ach}
                </span>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks size={20} className="text-primary-600 dark:text-primary-400" />
              <h3 className="font-display font-semibold text-neutral-900 dark:text-white">{t('quiz.checklist')}</h3>
            </div>
            <ol className="space-y-2">
              {checklistSteps.map((step, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      step.done
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600'
                    }`}
                  >
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      step.done
                        ? 'line-through text-neutral-400 dark:text-neutral-600'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
