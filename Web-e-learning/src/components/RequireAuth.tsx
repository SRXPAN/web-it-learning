import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '@/i18n/useTranslation'
import type { Role } from '@elearn/shared'
import { PageLoader } from './Skeletons'

interface RequireAuthProps {
  roles?: Role[]
  children: React.ReactNode
}

export default function RequireAuth({ roles, children }: RequireAuthProps) {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader text={t('common.loading', 'Loading session...')} />
  }

  if (!user) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center p-8 border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-3">
            {t('error.accessDenied', 'Access Denied')}
          </h2>
          
          <p className="text-neutral-600 dark:text-neutral-400 text-balance">
            {t('error.noPermission', "You don't have permission to view this page.")}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}