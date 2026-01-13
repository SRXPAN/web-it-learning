/**
 * Dashboard UI Components
 * Reusable components for the main dashboard page
 */
import { LucideIcon, Play, FileText, Target } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

// ============================================
// Progress Bar
// ============================================

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${v}%` }} />
    </div>
  )
}

// ============================================
// Stat Card
// ============================================

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  sub?: string
}

export function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
  return (
    <div className="card group hover:scale-105">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 transition-transform group-hover:scale-110">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
          <div className="text-xl font-display font-bold text-neutral-900 dark:text-white">{value}</div>
          {sub && <div className="text-xs text-neutral-400">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Course Card
// ============================================

interface CourseCardProps {
  name: string
  step: string
  progress: number
}

export function CourseCard({ name, step, progress }: CourseCardProps) {
  const { t } = useTranslation()
  return (
    <div className="card hover:shadow-neo-lg">
      <div className="space-y-3">
        <div>
          <h4 className="font-display font-semibold text-neutral-900 dark:text-white">{name}</h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{step}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>{t('materials.progress')}</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="flex gap-2">
          <button className="btn flex-1">
            <Play size={16} className="inline mr-1" />
            {t('common.continue')}
          </button>
          <button className="btn-outline">
            <FileText size={16} className="inline mr-1" />
            {t('nav.materials')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Weak Spot Item
// ============================================

interface WeakSpotItemProps {
  topic: string
  advice: string
}

export function WeakSpotItem({ topic, advice }: WeakSpotItemProps) {
  return (
    <li className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-600 to-accent-700 flex items-center justify-center flex-shrink-0">
        <Target size={16} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm text-neutral-900 dark:text-white">{topic}</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">{advice}</div>
      </div>
    </li>
  )
}

// ============================================
// Streak Day
// ============================================

interface StreakDayProps {
  active: boolean
  day: string
}

export function StreakDay({ active, day }: StreakDayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-lg transition-all ${
          active
            ? 'bg-gradient-to-br from-primary-600 to-primary-700 shadow-neo'
            : 'bg-neutral-200 dark:bg-neutral-800'
        }`}
      />
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{day}</span>
    </div>
  )
}

// ============================================
// Achievement Badge
// ============================================

interface AchievementBadgeProps {
  name: string
  earned: boolean
}

export function AchievementBadge({ name, earned }: AchievementBadgeProps) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
        earned
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border border-yellow-200 dark:border-yellow-800'
          : 'bg-neutral-100 dark:bg-neutral-800 opacity-50'
      }`}
    >
      <span className={earned ? 'grayscale-0' : 'grayscale'}>🏆</span>
      <span className={`text-xs font-medium ${earned ? 'text-yellow-700 dark:text-yellow-300' : 'text-neutral-500'}`}>
        {name}
      </span>
    </div>
  )
}

// ============================================
// Section Header
// ============================================

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  iconColorClass?: string
}

export function SectionHeader({ icon: Icon, title, iconColorClass = 'from-primary-600 to-primary-700' }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-xl bg-gradient-to-br ${iconColorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <h3 className="text-lg font-display font-bold text-neutral-900 dark:text-white">{title}</h3>
    </div>
  )
}
