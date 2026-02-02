import { create } from 'zustand'
import { memo, useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import clsx from 'clsx'
import { subscribeToToasts, type ToastEvent } from '@/utils/toastEmitter'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  msg: string
}

interface ToastStore {
  toasts: Toast[]
  push: (t: { type: ToastType; msg: string }) => void
  remove: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ 
    toasts: [...s.toasts, { ...t, id: crypto.randomUUID() }] 
  })),
  remove: (id) => set((s) => ({ 
    toasts: s.toasts.filter((x) => x.id !== id) 
  })),
}))

// Subscribe to global toast events from toastEmitter
if (typeof window !== 'undefined') {
  subscribeToToasts((event: ToastEvent) => {
    useToast.getState().push({ type: event.type, msg: event.message })
  })
}

const styles = {
  success: {
    icon: CheckCircle,
    container: 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: AlertCircle,
    container: 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  info: {
    icon: Info,
    container: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
}

const ToastItem = memo(function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove()
    }, 3000) // Auto-dismiss after 3 seconds
    return () => clearTimeout(timer)
  }, [onRemove])

  const style = styles[toast.type]
  const Icon = style.icon

  return (
    <div
      role="alert"
      className={clsx(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg ring-1 ring-black/5 transition-all duration-300',
        'animate-in slide-in-from-bottom-5 fade-in zoom-in-95',
        style.container
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icon className={clsx('h-5 w-5', style.iconColor)} aria-hidden="true" />
          </div>
          <div className="flex-1 pt-0.5">
            <p className={clsx('text-sm font-medium', style.text)}>
              {toast.msg}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4 flex">
            <button
              type="button"
              onClick={onRemove}
              className={clsx(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                'hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
                style.text
              )}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default function Toasts() {
  const { toasts, remove } = useToast()
  
  return (
    <div 
      aria-live="assertive" 
      className="fixed top-0 right-0 z-50 flex w-full max-w-sm flex-col items-end gap-2 p-4 sm:p-6 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  )
}
