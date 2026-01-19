import { memo } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export type Crumb = { 
  label: string; 
  to?: string; 
  onClick?: () => void; 
  current?: boolean 
}

interface BreadcrumbProps {
  items: Crumb[]
}

function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
      <Link 
        to="/" 
        className="flex items-center hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        aria-label="Home"
      >
        <Home size={16} />
      </Link>
      
      {items.map((crumb, i) => (
        <div key={i} className="flex items-center">
          <ChevronRight size={14} className="mx-2 text-neutral-300 dark:text-neutral-600" />
          
          {crumb.current ? (
            <span 
              className="font-medium text-neutral-900 dark:text-white" 
              aria-current="page"
            >
              {crumb.label}
            </span>
          ) : crumb.to ? (
            <Link 
              to={crumb.to} 
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors hover:underline decoration-primary-600/30"
            >
              {crumb.label}
            </Link>
          ) : (
            <button 
              onClick={crumb.onClick}
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors hover:underline decoration-primary-600/30"
            >
              {crumb.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  )
}

export default memo(Breadcrumb)