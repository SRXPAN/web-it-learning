import { memo } from 'react'
import { FolderTree } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { ProgressBar } from './ProgressBar'
import type { TopicNode } from './types'

interface TopicCardProps {
  topic: TopicNode
  onClick: (id: string) => void
}

const TopicCard = memo(function TopicCard({ topic, onClick }: TopicCardProps) {
  const { t } = useTranslation()
  
  // Припускаємо, що API вже повертає пораховані поля або ми їх рахуємо в сторі
  const total = topic.totalMaterials || 0
  const seen = topic.viewedMaterials || 0
  const progress = topic.progress || (total > 0 ? Math.round((seen / total) * 100) : 0)

  return (
    <div 
      onClick={() => onClick(topic.id)}
      className="group cursor-pointer rounded-2xl md:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
          <FolderTree size={22} />
        </div>
        <span className="rounded-full border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          {t('materials.section', 'Section')}
        </span>
      </div>
      
      <h3 className="font-semibold text-[15px] text-neutral-900 dark:text-white mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-300 line-clamp-2 min-h-[3rem]">
        {topic.name}
      </h3>
      
      <div className="flex justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">
        <span>{t('materials.materialsCount', 'Materials')}: {total}</span>
        <span>{t('materials.completedCount', 'Done')}: {seen}</span>
      </div>
      
      <ProgressBar value={progress} />
    </div>
  )
})

interface DashboardViewProps {
  catTopics: TopicNode[]
  onSelectTopic: (id: string) => void
}

export const DashboardView = memo(function DashboardView({ catTopics, onSelectTopic }: DashboardViewProps) {
  const { t } = useTranslation()

  if (catTopics.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        {t('materials.noSections', 'No sections found for this category')}
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl md:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 md:px-6 py-5 md:py-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {t('materials.chooseSectionTitle', 'Choose a Section')}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-xl">
          {t('materials.chooseSectionDesc', 'Select a topic to start learning materials and tracking your progress.')}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {catTopics.map((topic) => (
          <TopicCard 
            key={topic.id} 
            topic={topic} 
            onClick={onSelectTopic}
          />
        ))}
      </div>
    </div>
  )
})