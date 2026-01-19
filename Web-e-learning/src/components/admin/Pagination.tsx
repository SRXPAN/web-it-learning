import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-3xl">
      <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
        {t('common.page')} <span className="text-neutral-900 dark:text-white">{currentPage}</span> {t('common.of')} <span className="text-neutral-900 dark:text-white">{totalPages}</span> 
        <span className="mx-2 text-neutral-300 dark:text-neutral-700">|</span>
        {totalItems} {t('common.total')}
      </p>
      
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || disabled}
          className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-xl
                     text-neutral-600 dark:text-neutral-400
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400
                     transition-colors duration-200"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || disabled}
          className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-xl
                     text-neutral-600 dark:text-neutral-400
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400
                     transition-colors duration-200"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}