import { memo, useMemo, useCallback } from 'react'
import { ChevronRight, Layout, Pencil, Trash2, Plus } from 'lucide-react'
import type { TopicNode } from './types'
import { useTranslation } from '@/i18n/useTranslation'
import type { Lang, LocalizedString } from '@elearn/shared'

interface SidebarTopicItemProps {
  topic: TopicNode
  index: number
  isActive: boolean
  activeSubId: string | null
  lang: Lang
  isEditable?: boolean
  onSelectTopic: (topicId: string) => void
  onSelectSub: (topicId: string, subId: string) => void
  onEditTopic?: (topic: TopicNode) => void
  onDeleteTopic?: (topic: TopicNode) => void
}

// Helper
const getTopicName = (topic: TopicNode, lang: Lang) => {
  if (!topic.nameJson) return topic.name
  return (topic.nameJson as LocalizedString)[lang] || (topic.nameJson as LocalizedString)['EN'] || topic.name
}

const SidebarTopicItem = memo(function SidebarTopicItem({
  topic,
  index,
  isActive,
  activeSubId,
  lang,
  isEditable,
  onSelectTopic,
  onSelectSub,
  onEditTopic,
  onDeleteTopic,
}: SidebarTopicItemProps) {
  // Використовуємо дані з API замість локального підрахунку
  const percent = topic.progress || (topic.totalMaterials && topic.totalMaterials > 0 
    ? Math.round((topic.viewedMaterials || 0) / topic.totalMaterials * 100) 
    : 0)

  const handleClick = useCallback(() => onSelectTopic(topic.id), [onSelectTopic, topic.id])
  const topicName = getTopicName(topic, lang)

  return (
    <div className="group animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="relative">
        <button
          onClick={handleClick}
          className={`w-full text-left rounded-xl px-3 py-2.5 flex flex-col gap-1 transition-all border ${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 shadow-sm'
              : 'bg-white dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`text-[10px] font-bold ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={`text-sm font-medium line-clamp-1 ${isActive ? 'text-primary-900 dark:text-primary-100' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {topicName}
              </span>
            </div>
            <span className={`text-[10px] font-mono ${percent === 100 ? 'text-green-500' : 'text-neutral-400'}`}>
              {percent}%
            </span>
          </div>
          
          {/* Progress bar line */}
          <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-primary-500'}`} 
              style={{ width: `${percent}%` }} 
            />
          </div>
        </button>

        {isEditable && (
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 rounded-lg bg-white/95 px-1 py-0.5 text-neutral-600 shadow-lg ring-1 ring-neutral-200 transition-opacity dark:bg-neutral-900/95 dark:text-neutral-300 dark:ring-neutral-700 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEditTopic?.(topic)
              }}
              className="p-1 hover:text-primary-600 transition-colors"
              title="Edit topic"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteTopic?.(topic)
              }}
              className="p-1 text-red-500 hover:text-red-600 transition-colors"
              title="Delete topic"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {topic.children && topic.children.length > 0 && isActive && (
        <div className="mt-2 space-y-1 pl-4 border-l-2 border-neutral-100 dark:border-neutral-800 ml-3">
          {topic.children.map((sub) => {
            const subActive = activeSubId === sub.id
            const subName = getTopicName(sub, lang)
            return (
              <div key={sub.id} className="group/sub relative">
                <button
                  onClick={() => onSelectSub(topic.id, sub.id)}
                  className={`w-full text-left text-sm rounded-lg px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                    subActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 font-medium'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="line-clamp-1">{subName}</span>
                  {subActive && <ChevronRight size={14} className="opacity-70" />}
                </button>

                {isEditable && (
                  <div className="absolute right-1 top-1 opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 rounded-lg bg-white/95 px-1 py-0.5 text-neutral-600 shadow-lg ring-1 ring-neutral-200 transition-opacity dark:bg-neutral-900/95 dark:text-neutral-300 dark:ring-neutral-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditTopic?.(sub)
                      }}
                      className="p-1 hover:text-primary-600 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteTopic?.(sub)
                      }}
                      className="p-1 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

interface TopicSidebarProps {
  catTopics: TopicNode[]
  activeTopicId: string | null
  activeSubId: string | null
  loading: boolean
  isEditable?: boolean
  onSelectTopic: (topicId: string) => void
  onSelectSub: (topicId: string, subId: string) => void
  onAddTopic?: () => void
  onEditTopic?: (topic: TopicNode) => void
  onDeleteTopic?: (topic: TopicNode) => void
}

export const TopicSidebar = memo(function TopicSidebar({
  catTopics,
  activeTopicId,
  activeSubId,
  loading,
  isEditable,
  onSelectTopic,
  onSelectSub,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
}: TopicSidebarProps) {
  const { t, lang } = useTranslation()
  
  return (
    <aside className="hidden lg:block sticky top-24 h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
      <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 md:p-5 shadow-sm flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
            <Layout size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              {t('materials.sections', 'Sections')}
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
          {catTopics.map((topic, idx) => (
            <SidebarTopicItem
              key={topic.id}
              topic={topic}
              index={idx}
              isActive={activeTopicId === topic.id}
              activeSubId={activeSubId}
              lang={lang as Lang}
              isEditable={isEditable}
              onSelectTopic={onSelectTopic}
              onSelectSub={onSelectSub}
              onEditTopic={onEditTopic}
              onDeleteTopic={onDeleteTopic}
            />
          ))}

          {catTopics.length === 0 && !loading && (
            <div className="py-8 text-center text-xs text-neutral-400 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-xl">
              {t('materials.noSections', 'No sections found')}
            </div>
          )}

          {isEditable && (
            <button
              onClick={onAddTopic}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 hover:border-primary-500 hover:text-primary-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-primary-400 dark:hover:text-primary-300 py-3 transition-colors"
            >
              <Plus size={18} />
              <span className="text-sm font-semibold">{t('admin.createTopic', 'Create Topic')}</span>
            </button>
          )}
        </nav>
      </div>
    </aside>
  )
})