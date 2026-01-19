import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, FileQuestion } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export default function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-300">
      {/* 404 illustration */}
      <div className="relative mb-6 select-none">
        <div className="text-[120px] sm:text-[180px] font-display font-bold text-neutral-100 dark:text-neutral-800 leading-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-full shadow-xl shadow-neutral-200/50 dark:shadow-none">
            <FileQuestion size={48} className="text-primary-500" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-3">
        {t('error.pageNotFound', 'Page Not Found')}
      </h1>
      
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md text-balance mx-auto">
        {t('error.pageNotFoundDescription', "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button 
          onClick={() => navigate(-1)}
          className="btn-outline flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} />
          {t('common.goBack', 'Go Back')}
        </button>
        
        <Link 
          to="/" 
          className="btn flex items-center justify-center gap-2"
        >
          <Home size={18} />
          {t('common.goHome', 'Go Home')}
        </Link>
      </div>

      {/* Quick links */}
      <div className="mt-12 pt-8 border-t border-neutral-100 dark:border-neutral-800 w-full max-w-lg">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          {t('error.youMightLookingFor', 'You might be looking for')}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link to="/materials" className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium transition-colors border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
            {t('nav.materials', 'Materials')}
          </Link>
          <Link to="/leaderboard" className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium transition-colors border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
            {t('nav.leaderboard', 'Leaderboard')}
          </Link>
          <Link to="/profile" className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-medium transition-colors border border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
            {t('nav.profile', 'Profile')}
          </Link>
        </div>
      </div>
    </div>
  )
}