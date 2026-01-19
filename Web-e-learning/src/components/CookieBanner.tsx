import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const agreed = localStorage.getItem('cookiesAccepted')
    if (!agreed) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () =>QX clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto animate-in slide-in-from-bottom-8 fade-in duration-500">
        <div className="card shadow-2xl border-primary-100 dark:border-primary-900/50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Cookie size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">
              {t('cookies.title', 'We use cookies')}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {t('cookies.message', 'We use cookies to improve your experience and analyze traffic.')}{' '}
              <Link to="/privacy" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium hover:underline">
                {t('cookies.learnMore', 'Learn more')}
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleAccept}
              className="btn flex-1 sm:flex-none py-2.5 px-6 text-sm shadow-lg shadow-primary-500/20"
            >
              {t('cookies.accept', 'Accept')}
            </button>
            <button
              onClick={handleAccept}
              className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}