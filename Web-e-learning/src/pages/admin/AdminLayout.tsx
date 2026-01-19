import { useState } from 'react'
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom'
import {
  Users,
  Activity,
  Shield,
  BarChart3,
  FolderOpen,
  ChevronRight,
  LogOut,
  BookOpen,
  Menu,
  X,
  FileText
} from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useTranslation } from '@/i18n/useTranslation'
import { type TranslationKey } from '@/i18n/types'

type NavItem = {
  path: string
  icon: typeof Users
  labelKey: TranslationKey
  roles: string[]
  end?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  { path: '/admin', icon: BarChart3, labelKey: 'admin.dashboard', end: true, roles: ['ADMIN', 'EDITOR'] },
  { path: '/admin/users', icon: Users, labelKey: 'admin.users', roles: ['ADMIN'] },
  { path: '/admin/content', icon: BookOpen, labelKey: 'admin.content', roles: ['ADMIN', 'EDITOR'] },
  { path: '/admin/files', icon: FolderOpen, labelKey: 'admin.files', roles: ['ADMIN'] },
  { path: '/admin/audit', icon: Activity, labelKey: 'admin.auditLogs', roles: ['ADMIN'] },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  // Security Check
  if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) {
    return <Navigate to="/" replace />
  }

  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role))

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col lg:flex-row">
      
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-600" />
          <span className="font-display font-bold text-lg text-neutral-900 dark:text-white">Admin</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <Menu size={24} className="text-neutral-600 dark:text-neutral-300" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
              <Shield size={18} />
            </div>
            <span className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
              {t('admin.panel', 'Admin Panel')}
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden p-1 text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="mb-2 px-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Menu
          </div>
          {visibleNavItems.map(({ path, icon: Icon, labelKey, end, badge }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500'}`} />
                    <span>{t(labelKey)}</span>
                  </div>
                  {badge ? (
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                      {badge}
                    </span>
                  ) : isActive && (
                    <ChevronRight className="w-4 h-4 text-primary-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            {t('nav.logout', 'Sign out')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden w-full">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  )
}