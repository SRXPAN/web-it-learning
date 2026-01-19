import { memo } from 'react'

interface ProgressPillProps {
  seen: number
  total: number
}

function ProgressPill({ seen, total }: ProgressPillProps) {
  const pct = total ? Math.round((seen / total) * 100) : 0
  
  return (
    <span 
      className="inline-flex items-center text-xs px-3 py-1 rounded-full font-semibold 
                 bg-gradient-to-r from-primary-600 to-accent-500 text-white 
                 shadow-sm border border-white/20 dark:border-white/10"
      aria-label={`${seen} of ${total} completed, ${pct}%`}
    >
      {seen}/{total} • {pct}%
    </span>
  )
}

export default memo(ProgressPill)