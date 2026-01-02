import { useCallback, useState } from 'react'
import RequireAuth from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import ErrorBoundary from './components/ErrorBoundary'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Trophy, User, LogIn, LogOut, LucideIcon, Menu, X, Shield } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Materials from './pages/Materials'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Quiz from './pages/Quiz'
import NotFound from './pages/NotFound'
import { useAuth } from './auth/AuthContext'
import { useTranslation } from './i18n/useTranslation'
import Toasts from '@/components/Toast'
import LessonView from './pages/LessonView'
// Admin Panel
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminFiles from './pages/admin/AdminFiles'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminTranslations from './pages/admin/AdminTranslations'
import AdminContent from './pages/admin/AdminContent'
import AdminSettings from './pages/admin/AdminSettings'
import AdminTopics from './pages/admin/AdminTopics'
import AdminMaterials from './pages/admin/AdminMaterials'
import AdminQuizzes from './pages/admin/AdminQuizzes'
import AdminUserDetails from './pages/admin/AdminUserDetails'
import EditorLayout from './pages/editor/EditorLayout'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, onClick }: NavItemProps) {
  return (
    <NavLink to={to} onClick={onClick} className={({isActive}) =>
      `flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300' 
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800'
      }`
    }>
      <Icon size={20} /> <span>{label}</span>
    </NavLink>
  )
}

export default function App(){
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const nav = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const handleLogout = useCallback(async () => {
    await logout()
    nav('/login')
  }, [logout, nav])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  // For auth pages, render without header/main wrapper
  if (isAuthPage) {
    return (
      <div className="h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
          </Routes>
        </ErrorBoundary>
        <Toasts />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center">
                <span className="text-white font-display font-bold text-lg">E</span>
              </div>
              <span className="font-display font-semibold text-xl text-neutral-900 dark:text-white">{t('app.name')}</span>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/" icon={LayoutDashboard} label={t('nav.dashboard')} />
              <NavItem to="/materials" icon={BookOpen} label={t('nav.materials')} />
              <NavItem to="/leaderboard" icon={Trophy} label={t('nav.leaderboard')} />
              <NavItem to="/profile" icon={User} label={t('nav.profile')} />
              {user?.role && (user.role === 'ADMIN' || user.role === 'EDITOR') && (
                <NavItem to="/admin" icon={Shield} label={t('nav.admin')} />
              )}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              {!user ? (
                <>
                  <NavLink to="/login" className="btn-outline">
                    <LogIn size={18} className="inline mr-2"/>{t('nav.login')}
                  </NavLink>
                  <NavLink to="/register" className="btn">{t('nav.register')}</NavLink>
                </>
              ) : (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      {user.name}
                    </span>
                    <span className="badge text-xs">{user.xp} XP</span>
                  </div>
                  <button 
                    className="btn-outline" 
                    onClick={handleLogout}
                  >
                    <LogOut size={18} className="inline mr-2"/>{t('nav.logout')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <nav className="flex flex-col p-4 gap-1">
              <NavItem to="/" icon={LayoutDashboard} label={t('nav.dashboard')} onClick={closeMobileMenu} />
              <NavItem to="/materials" icon={BookOpen} label={t('nav.materials')} onClick={closeMobileMenu} />
              <NavItem to="/leaderboard" icon={Trophy} label={t('nav.leaderboard')} onClick={closeMobileMenu} />
              <NavItem to="/profile" icon={User} label={t('nav.profile')} onClick={closeMobileMenu} />
              {user?.role && (user.role === 'ADMIN' || user.role === 'EDITOR') && (
                <NavItem to="/admin" icon={Shield} label={t('nav.admin')} onClick={closeMobileMenu} />
              )}
              
              {/* Mobile user info */}
              {user && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      {user.name}
                    </span>
                    <span className="badge text-xs">{user.xp} XP</span>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<RequireAuth><Dashboard/></RequireAuth>} />
            <Route path="/lesson/:topicId/:lessonId" element={<RequireAuth><LessonView/></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard/></RequireAuth>} />
            <Route path="/materials" element={<RequireAuth><Materials/></RequireAuth>} />
            <Route path="/quiz" element={<RequireAuth><Quiz/></RequireAuth>} />
            <Route path="/leaderboard" element={<RequireAuth><Leaderboard/></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>} />
            <Route path="/editor" element={<RequireAuth roles={['ADMIN','EDITOR']}><EditorLayout/></RequireAuth>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            {/* Admin Panel - for ADMIN and EDITOR roles */}
            <Route path="/admin" element={<RequireAuth roles={['ADMIN','EDITOR']}><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<RequireRole allowedRoles={['ADMIN']}><AdminUsers /></RequireRole>} />
              <Route path="users/:id" element={<RequireRole allowedRoles={['ADMIN']}><AdminUserDetails /></RequireRole>} />
              <Route path="files" element={<RequireRole allowedRoles={['ADMIN']}><AdminFiles /></RequireRole>} />
              <Route path="audit" element={<RequireRole allowedRoles={['ADMIN']}><AdminAuditLogs /></RequireRole>} />
              <Route path="translations" element={<RequireRole allowedRoles={['ADMIN']}><AdminTranslations /></RequireRole>} />
              <Route path="content" element={<RequireRole allowedRoles={['ADMIN']}><AdminContent /></RequireRole>} />
              <Route path="topics" element={<AdminTopics />} />
              <Route path="materials" element={<AdminMaterials />} />
              <Route path="quizzes" element={<AdminQuizzes />} />
              <Route path="settings" element={<RequireRole allowedRoles={['ADMIN']}><AdminSettings /></RequireRole>} />
            </Route>
            <Route path="*" element={<NotFound/>} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Toasts />
    </div>
  )
}
