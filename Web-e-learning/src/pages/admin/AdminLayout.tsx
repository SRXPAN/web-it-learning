/**
 * Admin Panel Layout
 * Sidebar navigation + main content area
 */
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Users,
  FileText,
  Activity,
  Settings,
  Shield,
  BarChart3,
  Languages,
  FolderOpen,
  ChevronRight,
  LogOut,
  BookOpen,
} from 'lucide-react'
import { type TranslationKey } from '@/i18n/translations'

type NavItem = {
  path: string
  icon: typeof Users
  labelKey: TranslationKey
  roles: string[]
  end?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  { path: '/admin', icon: BarChart3, labelKey: 'admin.dashboard' as const, end: true, roles: ['ADMIN', 'EDITOR'] },
  { path: '/admin/users', icon: Users, labelKey: 'admin.users' as const, roles: ['ADMIN'] },
  { path: '/admin/content', icon: BookOpen, labelKey: 'admin.content' as const, roles: ['ADMIN'] },
  { path: '/admin/topics', icon: BookOpen, labelKey: 'editor.tab.topics' as const, roles: ['ADMIN', 'EDITOR'] },
  { path: '/admin/files', icon: FolderOpen, labelKey: 'admin.files' as const, roles: ['ADMIN'] },
  { path: '/admin/translations', icon: Languages, labelKey: 'admin.translations' as const, roles: ['ADMIN'] },
  { path: '/admin/audit', icon: Activity, labelKey: 'admin.auditLogs' as const, roles: ['ADMIN'] },
  // { path: '/admin/settings', icon: Settings, labelKey: 'admin.settings' as const, roles: ['ADMIN'], badge: 'WIP' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  // Only ADMIN and EDITOR can access admin panel
  if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
    return <Navigate to="/" replace />
  }

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-gray-700">
          <Shield className="w-8 h-8 text-blue-600" />
          <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.panel')}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map(({ path, icon: Icon, labelKey, end, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="flex-1">{t(labelKey)}</span>
              {badge && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                  {badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 lg:py-8 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
