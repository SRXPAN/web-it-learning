interface ProgressBarProps {
  value?: number // 0 to 100
  current?: number
  total?: number
  className?: string
}

export const ProgressBar = ({ value, current, total, className = '' }: ProgressBarProps) => {
  let percentage = 0
  
  if (typeof value === 'number') {
    percentage = value
  } else if (current !== undefined && total !== undefined && total > 0) {
    percentage = Math.round((current / total) * 100)
  }

  return (
    <div className={`h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" 
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} 
      />
    </div>
  )
}