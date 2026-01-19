import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
  stats?: string
}

export function PageHeader({ icon: Icon, title, description, actions, stats }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3 font-display">
          {Icon && (
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <Icon className="w-6 h-6" />
            </div>
          )}
          {title}
        </h1>
        {(description || stats) && (
          <p className="text-neutral-600 dark:text-neutral-400 mt-2 ml-1">
            {description}
            {stats && <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">({stats})</span>}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}