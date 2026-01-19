import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  icon?: ReactNode
  children: ReactNode
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
}

/**
 * Кнопка з вбудованим станом завантаження (спінером)
 */
export function LoadingButton({
  loading = false,
  loadingText,
  icon,
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: LoadingButtonProps) {
  const variantClasses = {
    primary: 'btn', // Використовує глобальний клас .btn з index.css
    outline: 'btn-outline', // Використовує глобальний клас .btn-outline
    ghost: 'px-4 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors',
    danger: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm hover:shadow',
  }

  return (
    <button
      className={clsx(
        'flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed',
        variantClasses[variant],
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin shrink-0" />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}