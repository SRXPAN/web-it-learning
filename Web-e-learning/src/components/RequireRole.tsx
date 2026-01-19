import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { PageLoader } from './Skeletons'
import type { Role } from '@elearn/shared'

interface RequireRoleProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

/**
 * Wrapper to protect routes based on user roles.
 * Unlike RequireAuth (which shows an Access Denied screen),
 * this component redirects unauthorized users to the Dashboard.
 */
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    // Silent redirect to dashboard if role doesn't match
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}