// src/components/ConfirmDialog.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { AlertTriangle, Info, AlertCircle, CheckCircle, X, LucideIcon } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { createPortal } from 'react-dom'

type DialogVariant = 'danger' | 'warning' | 'info' | 'success'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
  isLoading?: boolean
}

const variantConfig: Record<DialogVariant, {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  buttonBg: string
  buttonText: string
}> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    buttonText: 'text-white',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    buttonBg: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
    buttonText: 'text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    buttonText: 'text-white',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    buttonText: 'text-white',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  
  const resolvedConfirmText = confirmText ?? t('common.confirm')
  const resolvedCancelText = cancelText ?? t('common.cancel')
  const actualDescription = message || description
  const config = variantConfig[variant]
  const Icon = config.icon

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Focus management: focus cancel button by default for safety
      setTimeout(() => confirmButtonRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) onClose()
  }, [onClose, isLoading])

  const handleConfirm = async () => {
    await onConfirm()
    if (!isLoading) onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Dialog Panel */}
      <div 
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl ring-1 ring-neutral-200 dark:ring-neutral-800 scale-100 animate-in zoom-in-95 duration-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-3 rounded-2xl ${config.iconBg}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white leading-6">
                {title}
              </h3>
              {actualDescription && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {actualDescription}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-shrink-0 -mr-2 -mt-2 p-2 text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-outline px-4 py-2.5 text-sm font-medium"
            >
              {resolvedCancelText}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className={`
                px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all
                focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900
                disabled:opacity-70 disabled:cursor-not-allowed
                ${config.buttonBg} ${config.buttonText}
                flex items-center gap-2
              `}
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {resolvedConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
/**
 * Hook for using the ConfirmDialog imperatively
 * Example:
 * const { confirm, Dialog } = useConfirmDialog({ title: 'Sure?' })
 * const handleDelete = async () => {
 * if (await confirm()) deleteItem()
 * }
 */
interface UseConfirmDialogOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: DialogVariant
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback(() => {
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  const handleConfirm = useCallback(async () => {
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const DialogComponent = useCallback(() => (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      {...options}
    />
  ), [isOpen, handleClose, handleConfirm, isLoading, options])

  return {
    confirm,
    setIsLoading,
    Dialog: DialogComponent,
  }
}

// Пресети для типових сценаріїв

/**
 * Діалог підтвердження видалення
 */
export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  itemName: string
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${t('dialog.delete')} ${itemName}?`}
      description={t('dialog.deleteConfirmation')}
      confirmText={t('dialog.delete')}
      cancelText={t('dialog.cancel')}
      variant="danger"
      isLoading={isLoading}
    />
  )
}

/**
 * Діалог підтвердження виходу
 */
export function LogoutConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('dialog.logoutTitle')}
      description={t('dialog.logoutDescription')}
      confirmText={t('dialog.logout')}
      cancelText={t('dialog.stay')}
      variant="warning"
      isLoading={isLoading}
    />
  )
}

/**
 * Діалог підтвердження збереження
 */
export function SaveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('dialog.saveChangesTitle')}
      description={t('dialog.saveChangesDescription')}
      confirmText={t('dialog.save')}
      cancelText={t('dialog.dontSave')}
      variant="info"
      isLoading={isLoading}
    />
  )
}

export default ConfirmDialog
