import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { 
  ChevronRight, Play, FileText, Video, Link as LinkIcon, Code, 
  CheckCircle, XCircle, Timer, Lightbulb, ListChecks, Loader2 
} from 'lucide-react'

import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import type { Material, Lang } from '@elearn/shared'

// --- Types ---

type ContentType = 'text' | 'video' | 'quiz' | 'code' | 'pdf' | 'link'
type Mode = 'practice' | 'exam'

interface LessonData extends Material {
  // Додаткові поля, якщо бекенд їх повертає для детального перегляду
  nextLessonId?: string;
  prevLessonId?: string;
  topicName?: string;
}

// --- SUB-COMPONENTS ---

const LessonSidebar = ({ 
  toc, 
  active, 
  onChange, 
  progress 
}: { 
  toc: { type: ContentType; label: string; icon: any }[], 
  active: ContentType, 
  onChange: (t: ContentType) => void,
  progress: number
}) => {
  const { t } = useTranslation()
  
  return (
    <aside className="card h-max sticky top-24 space-y-6">
      <div>
        <h3 className="font-display font-semibold mb-3 text-neutral-900 dark:text-white">
          {t('lesson.toc', 'Table of Contents')}
        </h3>
        <ul className="space-y-1">
          {toc.map((item, idx) => (
            <li key={idx}>
              <button
                onClick={() => onChange(item.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  active === item.type
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">{t('lesson.progress', 'Progress')}</span>
          <span className="font-semibold text-primary-600 dark:text-primary-400">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </aside>
  )
}

const QuizView = ({ mode, setMode }: { mode: Mode, setMode: (m: Mode) => void }) => {
  const { t } = useTranslation()
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // Mock data (should come from API in real app)
  const question = {
    text: t('lesson.mock.questionText', 'Time complexity of Binary Search?'),
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correct: 1,
    explanation: t('lesson.mock.explanation', 'Divide and conquer approach.')
  }

  const handleAnswer = () => {
    if (mode === 'practice') {
      setShowExplanation(true)
    } else {
      if (currentQ >= 9) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
      setCurrentQ(prev => prev + 1)
      setSelected(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
          {(['practice', 'exam'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === m 
                  ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' 
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {t(`quiz.mode.${m}` as any, m)}
            </button>
          ))}
        </div>
        {mode === 'exam' && (
          <div className="flex items-center gap-2 text-orange-500 font-mono font-medium bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">
            <Timer size={16} /> 01:59
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="card border-2 border-primary-100 dark:border-primary-900/30">
        <div className="mb-6">
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
            {t('quiz.question', 'Question')} {currentQ + 1}
          </span>
          <h3 className="text-xl font-bold mt-2 text-neutral-900 dark:text-white">{question.text}</h3>
        </div>

        <div className="grid gap-3">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`p-4 rounded-xl text-left border-2 transition-all flex items-center gap-3 ${
                selected === idx
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                selected === idx ? 'border-primary-600 text-primary-600' : 'border-neutral-300 text-neutral-400'
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{opt}</span>
            </button>
          ))}
        </div>

        {/* Explanation */}
        {mode === 'practice' && showExplanation && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-xl flex gap-3">
            <Lightbulb className="text-green-600 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm mb-1">{t('lesson.explanationTitle', 'Explanation')}</p>
              <p className="text-green-700 dark:text-green-400 text-sm">{question.explanation}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button className="btn px-8" onClick={handleAnswer} disabled={selected === null}>
            {t('quiz.answer', 'Submit Answer')}
          </button>
        </div>
      </div>
    </div>
  )
}

const CodeView = () => {
  const { t } = useTranslation()
  const code = `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="font-mono font-bold text-lg text-neutral-900 dark:text-white">binarySearch.js</h3>
        <button className="btn btn-sm gap-2">
          <Play size={14} /> {t('lesson.run', 'Run Code')}
        </button>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-[#1e1e1e] p-4 rounded-xl font-mono text-sm text-blue-100 overflow-x-auto shadow-inner">
          <pre>{code}</pre>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-900 dark:text-white">{t('lesson.tests', 'Test Cases')}</h4>
          {[
            { input: '[1,2,3,4,5], 3', expect: '2', pass: true },
            { input: '[1,5,10], 5', expect: '1', pass: true },
            { input: '[2,4,6], 5', expect: '-1', pass: false },
          ].map((test, i) => (
            <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 ${
              test.pass 
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' 
                : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
            }`}>
              {test.pass 
                ? <CheckCircle size={18} className="text-green-600" /> 
                : <XCircle size={18} className="text-red-600" />
              }
              <div className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
                <div className="opacity-70">Input: {test.input}</div>
                <div>Expected: {test.expect}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function LessonView() {
  const { t, lang } = useTranslation()
  const { lessonId } = useParams()
  const navigate = useNavigate()
  
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ContentType>('text')
  const [quizMode, setQuizMode] = useState<Mode>('practice')

  useEffect(() => {
    if (!lessonId) return
    
    const fetchLesson = async () => {
      setLoading(true)
      try {
        const data = await api<LessonData>(`/materials/${lessonId}?lang=${lang}`)
        setLesson(data)
        
        // Auto-select tab based on type
        if (data.type === 'video') setActiveTab('video')
        else if (data.type === 'quiz') setActiveTab('quiz')
        else setActiveTab('text')
        
      } catch (err) {
        setError(t('common.loadFailed', 'Failed to load lesson'))
      } finally {
        setLoading(false)
      }
    }
    fetchLesson()
  }, [lessonId, lang, t])

  const tocItems = [
    { icon: FileText, label: t('lesson.content.notes', 'Notes'), type: 'text' as ContentType },
    { icon: Video, label: t('lesson.content.video', 'Video'), type: 'video' as ContentType },
    { icon: Code, label: t('lesson.content.quiz', 'Quiz'), type: 'quiz' as ContentType },
    { icon: Code, label: t('lesson.content.code', 'Code'), type: 'code' as ContentType },
  ]

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={40} className="text-primary-500 animate-spin" />
    </div>
  )

  if (error || !lesson) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={() => navigate('/materials')} className="btn">
        {t('common.back', 'Back to Materials')}
      </button>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500">
        <button onClick={() => navigate('/materials')} className="hover:text-primary-600 transition-colors">
          {t('nav.materials', 'Materials')}
        </button>
        <ChevronRight size={14} />
        <span>{lesson.topicName || t('lesson.placeholder', 'Lesson')}</span>
        <ChevronRight size={14} />
        <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-[200px]">
          {lesson.title}
        </span>
      </nav>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-[260px_1fr_300px] gap-8 items-start">
        
        {/* Left Sidebar */}
        <LessonSidebar 
          toc={tocItems} 
          active={activeTab} 
          onChange={setActiveTab} 
          progress={35} 
        />

        {/* Center Content */}
        <main className="space-y-6 min-w-0">
          
          {activeTab === 'text' && (
            <div className="card prose prose-neutral dark:prose-invert max-w-none animate-in fade-in duration-300">
              <h1>{lesson.title}</h1>
              {lesson.content ? (
                <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                  {lesson.type === 'pdf' ? <FileText size={48} className="text-neutral-300" /> : <LinkIcon size={48} className="text-neutral-300" />}
                  <a href={lesson.url} target="_blank" rel="noopener noreferrer" className="btn">
                    {lesson.type === 'pdf' ? t('lesson.openPdf', 'Open PDF') : t('lesson.openLink', 'Open Link')}
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
                {lesson.url && (lesson.url.includes('youtube') || lesson.url.includes('youtu.be')) ? (
                  <iframe 
                    src={lesson.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title={lesson.title}
                  />
                ) : (
                  <video src={lesson.url} controls className="w-full h-full" />
                )}
              </div>
              <div className="card">
                <h2 className="text-2xl font-bold mb-2">{lesson.title}</h2>
                <p className="text-neutral-600 dark:text-neutral-400">{lesson.description}</p>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && <QuizView mode={quizMode} setMode={setQuizMode} />}
          
          {activeTab === 'code' && <CodeView />}

        </main>

        {/* Right Sidebar: Helpers */}
        <aside className="space-y-6 hidden lg:block sticky top-24">
          
          <div className="card bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-bold">
              <Lightbulb size={18} />
              <h3>{t('quiz.hints', 'Hints')}</h3>
            </div>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200/80">
              <li className="flex gap-2"><span>•</span> {t('lesson.hint.sortedOnly', 'Sorted arrays only')}</li>
              <li className="flex gap-2"><span>•</span> {t('lesson.hint.complexity', 'O(log n)')}</li>
            </ul>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3 font-bold text-neutral-900 dark:text-white">
              <ListChecks size={18} className="text-primary-500" />
              <h3>{t('quiz.checklist', 'Checklist')}</h3>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <CheckCircle size={14} className="text-green-500" />
                <span className="line-through decoration-neutral-400">{t('quiz.checklist.reviewMaterials', 'Review notes')}</span>
              </li>
              <li className="flex items-center gap-2 text-neutral-900 dark:text-neutral-200">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                <span>{t('quiz.checklist.score75', 'Score 75%')}</span>
              </li>
            </ul>
          </div>

        </aside>

      </div>
    </div>
  )
}