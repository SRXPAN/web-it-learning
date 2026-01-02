/**
 * RequireRole Component
 * Protects routes by requiring specific user role
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

interface RequireRoleProps {
  allowedRoles: Array<'ADMIN' | 'EDITOR' | 'STUDENT'>
  children: React.ReactNode
}

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
