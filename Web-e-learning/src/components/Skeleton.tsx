import clsx from 'clsx'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Базовий компонент Skeleton для створення плейсхолдерів
 */
export function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    rounded: 'rounded-lg'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 bg-[length:200%_100%]',
    none: ''
  }

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
  }

  return (
    <div 
      className={clsx(
        'bg-neutral-200 dark:bg-neutral-800', // Базовий колір
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  )
}