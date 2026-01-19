import { useTranslation } from '@/i18n/useTranslation'
import { AlertCircle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  // Утиліти Tailwind перекривають стилі компонента .btn
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  }

  const iconStyles = {
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-neo border border-neutral-100 dark:border-neutral-800 scale-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${iconStyles[variant]}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 font-display">
              {title}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
              {message}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={onCancel} className="btn-outline py-2.5 px-4 text-sm">
                {cancelText || t('common.cancel')}
              </button>
              <button 
                onClick={handleConfirm} 
                className={`btn py-2.5 px-4 text-sm shadow-none ${variantStyles[variant]}`}
              >
                {confirmText || t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}