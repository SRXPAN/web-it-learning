import { memo, useMemo, useState } from 'react'
import {
  Search,
  BookOpen,
  FolderTree,
  PlayCircle,
  FileText,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Filter,
  Pencil,
  Trash2,
  PlusCircle,
  ChevronDown,
  Trophy,
} from 'lucide-react'

import { TopicQuizSection } from './TopicQuizSection'
import type { TopicNode, Tab, Material } from './types'
import { useTranslation } from '@/i18n/useTranslation'
import type { Lang, LocalizedString, MaterialType } from '@packages/shared'

// Helper for localization
const getLocalizedText = (json: LocalizedString | undefined | null, fallback: string, lang: Lang) => {
  if (!json) return fallback
  return json[lang] || json['EN'] || fallback
}

interface TopicViewProps {
  activeTopic: TopicNode | null
  activeSub: TopicNode | null
  tab: Tab
  setTab: (t: Tab) => void
  query: string
  setQuery: (v: string) => void
  filteredMaterials: (list: Material[]) => Material[]
  openMaterial: (m: Material) => void
  isEditable?: boolean
  onAddLesson?: (topic: TopicNode) => void
  onEditLesson?: (topic: TopicNode) => void
  onDeleteLesson?: (topic: TopicNode) => void
  onAddMaterial?: (lessonId: string, type: MaterialType) => void
  onEditMaterial?: (material: Material, topic: TopicNode) => void
  onDeleteMaterial?: (material: Material, topic: TopicNode) => void
  onAddQuiz?: (topic: TopicNode) => void
}

export function TopicView({
  activeTopic,
  activeSub,
  tab,
  setTab,
  query,
  setQuery,
  filteredMaterials,
  openMaterial,
  isEditable,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onAddQuiz,
}: TopicViewProps) {
  const { t, lang } = useTranslation()

  if (!activeTopic) return null

  const filterTabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'ALL', label: t('materials.all', 'All'), icon: <Filter size={14} /> },
    { value: 'VIDEO', label: t('materials.video', 'Video'), icon: <PlayCircle size={14} /> },
    { value: 'PDF', label: 'PDF', icon: <BookOpen size={14} /> },
    { value: 'TEXT', label: t('materials.text', 'Text'), icon: <FileText size={14} /> },
    { value: 'LINK', label: t('materials.link', 'Link'), icon: <LinkIcon size={14} /> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Filters & Search Bar - Always sticky for better mobile UX */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 sm:p-4 shadow-sm sticky top-20 z-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-between">
          
          {/* Tabs - Always show labels for better mobile UX */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {filterTabs.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                title={label}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  tab === value
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('materials.searchPlaceholder', 'Search...')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {activeSub ? (
        <TopicSection
          topic={activeSub}
          filteredMats={filteredMaterials(activeSub.materials || [])}
          onOpen={openMaterial}
          lang={lang as Lang}
          isMain
          isEditable={isEditable}
          onAddMaterial={onAddMaterial}
          onEditLesson={onEditLesson}
          onDeleteLesson={onDeleteLesson}
          onEditMaterial={onEditMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onAddQuiz={onAddQuiz}
        />
      ) : (
        <>
          <TopicSection
            topic={activeTopic}
            filteredMats={filteredMaterials(activeTopic.materials || [])}
            onOpen={openMaterial}
            lang={lang as Lang}
            isMain
            isEditable={isEditable}
            onAddLesson={onAddLesson}
            onAddMaterial={onAddMaterial}
            onEditLesson={onEditLesson}
            onDeleteLesson={onDeleteLesson}
            onEditMaterial={onEditMaterial}
            onDeleteMaterial={onDeleteMaterial}
            onAddQuiz={onAddQuiz}
          />
          {activeTopic.children?.map((child) => (
            <TopicSection
              key={child.id}
              topic={child}
              filteredMats={filteredMaterials(child.materials || [])}
              onOpen={openMaterial}
              lang={lang as Lang}
              isEditable={isEditable}
              onAddMaterial={onAddMaterial}
              onEditLesson={onEditLesson}
              onDeleteLesson={onDeleteLesson}
              onEditMaterial={onEditMaterial}
              onDeleteMaterial={onDeleteMaterial}
              onAddQuiz={onAddQuiz}
            />
          ))}
          
          {isEditable && onAddLesson && (
            <div className="mt-6 sm:mt-8 flex justify-center">
              <button
                onClick={() => onAddLesson(activeTopic)}
                className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl border-2 border-dashed border-neutral-300 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-600 hover:border-primary-500 hover:text-primary-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                <PlusCircle size={16} className="sm:w-[20px] sm:h-[20px]" />
                {t('editor.action.addLesson', 'Add new lesson')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// --- Topic Section Component ---

interface TopicSectionProps {
  topic: TopicNode
  filteredMats: Material[]
  onOpen: (m: Material) => void
  lang: Lang
  isMain?: boolean
  isEditable?: boolean
  onAddLesson?: (topic: TopicNode) => void
  onEditLesson?: (topic: TopicNode) => void
  onDeleteLesson?: (topic: TopicNode) => void
  onAddMaterial?: (lessonId: string, type: MaterialType) => void
  onEditMaterial?: (material: Material, topic: TopicNode) => void
  onDeleteMaterial?: (material: Material, topic: TopicNode) => void
  onAddQuiz?: (topic: TopicNode) => void
}

function TopicSection({
  topic,
  filteredMats = [],
  onOpen,
  lang,
  isMain,
  isEditable,
  onEditLesson,
  onDeleteLesson,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onAddQuiz,
}: TopicSectionProps) {
  const { t } = useTranslation()

  // Calculate stats based on materials in this section
  const { done, total, next, progress } = useMemo(() => {
    // Defensive: ensure filteredMats is always an array
    const safeMats = Array.isArray(filteredMats) ? filteredMats : []
    const total = safeMats.length
    const done = safeMats.filter((m) => m.isSeen).length // Assuming API returns isSeen
    const next = safeMats.find((m) => !m.isSeen)
    const progress = total > 0 ? Math.round((done / total) * 100) : 0
    return { done, total, next, progress }
  }, [filteredMats])

  const topicName = getLocalizedText(topic.nameJson, topic.name, lang)
  const topicDesc = getLocalizedText(topic.descJson, topic.description || '', lang)

  const isComplete = done === total && total > 0

  return (
    <section className="rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden group/section relative mb-6">
      
      {/* Header */}
      <div className={`px-4 sm:px-5 py-3 sm:py-4 border-b border-neutral-100 dark:border-neutral-800 transition-colors ${
        isComplete 
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10' 
          : 'bg-neutral-50/50 dark:bg-neutral-900/50'
      }`}>
        
        {/* Admin Controls */}
        {isEditable && !isMain && (
          <div className="absolute right-2 sm:right-3 top-2 sm:top-3 opacity-0 group-hover/section:opacity-100 flex items-center gap-1 sm:gap-2 transition-opacity z-10">
            <button
              onClick={() => onEditLesson?.(topic)}
              className="p-1 sm:p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <Pencil size={13} className="sm:w-[14px] sm:h-[14px]" />
            </button>
            <button
              onClick={() => onDeleteLesson?.(topic)}
              className="p-1 sm:p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={13} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${
              isComplete 
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                : isMain 
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
            }`}>
              {isComplete ? <CheckCircle2 size={18} className="sm:w-[20px] sm:h-[20px]" /> : isMain ? <BookOpen size={18} className="sm:w-[20px] sm:h-[20px]" /> : <FolderTree size={18} className="sm:w-[20px] sm:h-[20px]" />}
            </div>
            
            <div className="min-w-0">
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block ${
                isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {isComplete 
                  ? t('materials.status.completed', 'Completed') 
                  : isMain 
                    ? t('materials.status.mainSection', 'Main Section')
                    : t('materials.status.subSection', 'Lesson')
                }
              </span>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-0.5 leading-tight sm:leading-snug">
                {topicName}
              </h2>
              {topicDesc && (
                <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-lg line-clamp-2">
                  {topicDesc}
                </p>
              )}
            </div>
          </div>

          {/* Progress Circle - Responsive */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white font-mono">
                {progress}%
              </div>
              <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                {done}/{total} {t('materials.count.materials', 'items')}
              </div>
            </div>
            
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 relative flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-neutral-200 dark:text-neutral-800" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${progress} 100`} strokeLinecap="round" className={isComplete ? 'text-emerald-500' : 'text-primary-500'} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {isComplete ? <CheckCircle2 size={16} className="sm:w-[20px] sm:h-[20px] text-emerald-500" /> : `${Math.round(progress)}%`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Next */}
      {next && !isComplete && (
        <div className="mx-4 sm:mx-5 my-3 sm:my-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 p-0.5 shadow-md">
          <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-neutral-900 rounded-[10px] p-2 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1 sm:p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 flex-shrink-0">
                <Sparkles size={14} className="sm:w-[16px] sm:h-[16px]" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                  {t('dashboard.continueLearning', 'Up Next')}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1">
                  {getLocalizedText(next.titleJson, next.title, lang)}
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpen(next)}
              className="p-1.5 sm:p-2 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm flex-shrink-0"
              title="Open"
            >
              <ArrowRight size={14} className="sm:w-[16px] sm:h-[16px]" />
            </button>
          </div>
        </div>
      )}

      {/* Materials List */}
      <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
        {filteredMats.length > 0 ? (
          isEditable && onEditMaterial && onDeleteMaterial ? (
            <div className="space-y-3">
              {filteredMats.map((m, index) => {
                const title = getLocalizedText(m.titleJson, m.title, lang)
                const typeLabel = m.type.toUpperCase()
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {typeLabel}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-400">#{index + 1}</div>
                        <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                          {title}
                        </div>
                        {m.updatedAt && (
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            {t('materials.lastUpdated', 'Updated')}: {new Date(m.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditMaterial(m, topic)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title={t('common.edit', 'Edit')}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteMaterial(m, topic)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMats.map((m, index) => (
                <MaterialCardNew
                  key={m.id}
                  material={m}
                  index={index}
                  lang={lang}
                  onOpen={onOpen}
                  isEditable={isEditable}
                  onEditMaterial={onEditMaterial}
                  onDeleteMaterial={onDeleteMaterial}
                  topic={topic}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-6 sm:py-8 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-lg sm:rounded-xl">
            <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-neutral-50 dark:bg-neutral-800 mb-2">
              <FileText size={18} className="sm:w-[20px] sm:h-[20px] text-neutral-400" />
            </div>
            <p className="text-xs sm:text-sm text-neutral-500">
              {t('materials.empty.noMaterials', 'No materials yet')}
            </p>
          </div>
        )}

        {/* Admin Add Buttons */}
        {isEditable && onAddMaterial && (
          <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2 justify-center pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <AddButton onClick={() => onAddMaterial(topic.id, 'text')} label="Text" color="blue" />
            <AddButton onClick={() => onAddMaterial(topic.id, 'video')} label="Video" color="pink" />
            <AddButton onClick={() => onAddMaterial(topic.id, 'pdf')} label="PDF" color="amber" />
            <AddButton onClick={() => onAddMaterial(topic.id, 'link')} label="Link" color="emerald" />
          </div>
        )}

        {/* Quizzes - Lazy Load with Collapsible on Mobile */}
        {topic.quizzes && topic.quizzes.length > 0 && <QuizSectionLazy topic={topic} topicName={topicName} isComplete={isComplete} total={total} done={done} lang={lang} t={t} />}

        {/* Add Quiz Button */}
        {isEditable && onAddQuiz && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => onAddQuiz(topic)}
              className="inline-flex items-center gap-2 rounded-lg sm:rounded-xl border-2 border-dashed border-purple-300 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-purple-600 hover:border-purple-500 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-all"
            >
              <PlusCircle size={16} />
              {t('editor.add_quiz', 'Add Quiz')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// --- Quiz Section with Lazy Loading and Mobile Collapse ---
function QuizSectionLazy({ topic, topicName, isComplete, total, done, lang, t }: any) {
  const [showQuiz, setShowQuiz] = useState(false)
  
  // Lazy load quiz component only when opened
  const QuizComponent = showQuiz ? TopicQuizSection : null

  return (
    <div className="mt-4 sm:mt-6">
      {/* Mobile: Collapsible Quiz Header */}
      <button
        onClick={() => setShowQuiz(!showQuiz)}
        className="w-full md:hidden flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 border border-purple-100 dark:border-purple-900/30 text-left hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
              {t('materials.quizzesAvailable', 'Tests Available')}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              {topic.quizzes?.length || 0} {topic.quizzes?.length === 1 ? 'quiz' : 'quizzes'}
            </p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-purple-600 dark:text-purple-400 transition-transform ${showQuiz ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop: Always show, Mobile: Show only if expanded */}
      {showQuiz ? (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {QuizComponent && (
            <TopicQuizSection
              quizzes={topic.quizzes}
              topicName={topicName}
              allMaterialsViewed={isComplete}
              materialsCount={total}
              viewedCount={done}
              lang={lang}
            />
          )}
        </div>
      ) : (
        <div className="hidden md:block mt-6">
          <TopicQuizSection
            quizzes={topic.quizzes}
            topicName={topicName}
            allMaterialsViewed={isComplete}
            materialsCount={total}
            viewedCount={done}
            lang={lang}
          />
        </div>
      )}
    </div>
  )
}

// --- Material Card Component ---

const MaterialCardNew = memo(function MaterialCardNew({
  material: m,
  index,
  lang,
  onOpen,
  isEditable,
  onEditMaterial,
  onDeleteMaterial,
  topic,
}: {
  material: Material,
  index: number,
  lang: Lang,
  onOpen: (m: Material) => void,
  isEditable?: boolean,
  onEditMaterial?: (m: Material, t: TopicNode) => void,
  onDeleteMaterial?: (m: Material, t: TopicNode) => void,
  topic: TopicNode
}) {
  const { t } = useTranslation()
  const title = getLocalizedText(m.titleJson, m.title, lang)
  
  // Icon config based on type
  const config = useMemo(() => {
    switch (m.type.toUpperCase()) {
      case 'VIDEO': return { Icon: PlayCircle, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', label: t('materials.video', 'Video') }
      case 'PDF': return { Icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'PDF' }
      case 'LINK': return { Icon: LinkIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: t('materials.link', 'Link') }
      default: return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: t('materials.text', 'Text') }
    }
  }, [m.type, t])

  const Icon = config.Icon

  return (
    <div className="group/card relative">
      <button
        onClick={() => onOpen(m)}
        className={`w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
          m.isSeen
            ? 'bg-emerald-50/50 dark:bg-emerald-900/5 border-emerald-100 dark:border-emerald-900/30'
            : 'bg-white dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
        }`}
      >
        {/* Status Icon */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          {m.isSeen ? (
            <CheckCircle2 size={16} className="sm:size-[18px] text-emerald-500" />
          ) : (
            <Circle size={16} className="sm:size-[18px] text-neutral-300 dark:text-neutral-600 group-hover/card:text-primary-400 transition-colors" />
          )}
        </div>

        {/* Type Icon */}
        <div className={`shrink-0 p-2 sm:p-3 rounded-lg ${config.bg}`}>
          <Icon size={18} className={`sm:w-[22px] sm:h-[22px] ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
            <span className="text-[9px] sm:text-[10px] text-neutral-400">#{index + 1}</span>
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 group-hover/card:text-primary-600 dark:group-hover/card:text-primary-400 transition-colors">
            {title}
          </h4>
        </div>
      </button>

      {/* Admin Actions */}
      {isEditable && topic && (
        <div className="absolute top-1 sm:top-2 right-8 sm:right-10 opacity-0 group-hover/card:opacity-100 flex items-center gap-1 bg-white/90 dark:bg-neutral-900/90 p-0.5 sm:p-1 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 transition-opacity backdrop-blur-sm">
          <button
            onClick={(e) => { e.stopPropagation(); onEditMaterial?.(m, topic) }}
            className="p-1 hover:text-blue-600"
          >
            <Pencil size={13} className="sm:w-[14px] sm:h-[14px]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteMaterial?.(m, topic) }}
            className="p-1 hover:text-red-600"
          >
            <Trash2 size={13} className="sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>
      )}
    </div>
  )
})

// Helper Button for Admin
const AddButton = ({ onClick, label, color }: { onClick: () => void, label: string, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30',
    pink: 'text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100 dark:text-pink-300 dark:bg-pink-900/20 dark:border-pink-800 dark:hover:bg-pink-900/30',
    amber: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/30',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800 dark:hover:bg-emerald-900/30',
  }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 sm:gap-1 px-2.5 sm:px-3 py-1.5 rounded border text-[11px] sm:text-xs font-medium transition-colors ${colors[color] || colors.blue}`}
    >
      <PlusCircle size={13} className="sm:w-[14px] sm:h-[14px]" />
      {label}
    </button>
  )
}
