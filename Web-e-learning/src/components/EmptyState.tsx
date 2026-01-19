import { 
  BookOpen, 
  Trophy, 
  ClipboardList, 
  Search, 
  Inbox,
  TrendingUp,
  FileText,
  Lightbulb,
  type LucideIcon 
} from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Універсальний компонент для відображення порожнього стану
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      iconWrapper: 'p-3',
      icon: 32,
      title: 'text-base',
      description: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    md: {
      container: 'py-12',
      iconWrapper: 'p-4',
      icon: 48,
      title: 'text-lg',
      description: 'text-base',
      button: 'px-6 py-2.5',
    },
    lg: {
      container: 'py-16',
      iconWrapper: 'p-5',
      icon: 64,
      title: 'text-xl',
      description: 'text-lg',
      button: 'px-8 py-3',
    },
  }

  const styles = sizeClasses[size]

  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}>
      <div className={`rounded-3xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 mb-4 ${styles.iconWrapper}`}>
        <Icon 
          size={styles.icon} 
          strokeWidth={1.5}
        />
      </div>
      
      <h3 className={`font-display font-semibold text-neutral-900 dark:text-white mb-2 ${styles.title}`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-neutral-500 dark:text-neutral-400 max-w-sm text-balance ${styles.description}`}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-6 btn font-medium shadow-none ${styles.button}`}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ============================================
// ПРЕСЕТИ ДЛЯ ТИПОВИХ СЦЕНАРІЇВ
// ============================================

export function EmptyMaterials({ 
  onAction,
  className 
}: { 
  onAction?: () => void
  className?: string 
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={BookOpen}
      title={t('empty.materials.title', 'No materials found')}
      description={t('empty.materials.description', 'Try adjusting your filters or check back later.')}
      action={onAction ? { label: t('empty.materials.action', 'Clear Filters'), onClick: onAction } : undefined}
      className={className}
    />
  )
}

export function EmptySearch({ 
  query,
  onClear,
  className 
}: { 
  query?: string
  onClear?: () => void
  className?: string 
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Search}
      title={t('empty.search.title', 'No results found')}
      description={query 
        ? `${t('empty.search.for', 'We couldn\'t find anything for')} "${query}"`
        : t('empty.search.description', 'Try searching for something else.')
      }
      action={onClear ? { label: t('empty.search.clear', 'Clear Search'), onClick: onClear } : undefined}
      className={className}
    />
  )
}

export function EmptyLeaderboard({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Trophy}
      title={t('empty.leaderboard.title', 'Leaderboard is empty')}
      description={t('empty.leaderboard.description', 'Be the first to earn some XP!')}
      className={className}
    />
  )
}

export function EmptyQuizHistory({ 
  onStartQuiz,
  className 
}: { 
  onStartQuiz?: () => void
  className?: string 
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={ClipboardList}
      title={t('empty.quizHistory.title', 'No quizzes taken yet')}
      description={t('empty.quizHistory.description', 'Challenge yourself by taking a quiz.')}
      action={onStartQuiz ? { label: t('empty.quizHistory.action', 'Start Quiz'), onClick: onStartQuiz } : undefined}
      className={className}
    />
  )
}

export function EmptyProgress({ 
  onStartLearning,
  className 
}: { 
  onStartLearning?: () => void
  className?: string 
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={TrendingUp}
      title={t('empty.progress.title', 'No progress recorded')}
      description={t('empty.progress.description', 'Start learning to see your stats here.')}
      action={onStartLearning ? { label: t('empty.progress.action', 'Start Learning'), onClick: onStartLearning } : undefined}
      className={className}
    />
  )
}

export function EmptyTopics({ 
  onCreateTopic,
  className 
}: { 
  onCreateTopic?: () => void
  className?: string 
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={FileText}
      title={t('empty.topics.title', 'No topics created')}
      description={t('empty.topics.description', 'Create a new topic to get started.')}
      action={onCreateTopic ? { label: t('empty.topics.action', 'Create Topic'), onClick: onCreateTopic } : undefined}
      className={className}
    />
  )
}

export function EmptyRecommendations({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Lightbulb}
      title={t('empty.recommendations.title', 'No recommendations')}
      description={t('empty.recommendations.description', 'Keep learning to get personalized advice.')}
      className={className}
      size="sm"
    />
  )
}

export default EmptyState