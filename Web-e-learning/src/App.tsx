import { useCallback, useState, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Trophy, User, LogIn, LogOut, LucideIcon, Menu, X, Shield } from 'lucide-react'

// Components
import RequireAuth from './components/RequireAuth'
import { RequireRole } from './components/RequireRole'
import ErrorBoundary from './components/ErrorBoundary'
import CookieBanner from './components/CookieBanner'
import Toasts from '@/components/Toast'

// Core Pages (Eager or Lazy based on preference; lazy is better for bundle size)
import Dashboard from './pages/Dashboard'
import Materials from './pages/Materials'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import LessonView from './pages/LessonView'

// Hooks
import { useAuth } from './auth/AuthContext'
import { useTranslation } from './i18n/useTranslation'

// Lazy Load Admin Pages
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminFiles = lazy(() => import('./pages/admin/AdminFiles'))
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'))
const AdminContent = lazy(() => import('./pages/admin/AdminContent'))
// const AdminSettings = lazy(() => import('./pages/admin/AdminSettings')) // Future feature
const AdminUserDetails = lazy(() => import('./pages/admin/AdminUserDetails'))

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

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
)

export default function App() {
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

  // Special layout for auth pages
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
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

  // Admin layout handles its own structure (sidebar etc), so we render it directly without the main header
  if (location.pathname.startsWith('/admin')) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/admin" element={<RequireAuth roles={['ADMIN','EDITOR']}><AdminLayout /></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<RequireRole allowedRoles={['ADMIN']}><AdminUsers /></RequireRole>} />
              <Route path="users/:id" element={<RequireRole allowedRoles={['ADMIN']}><AdminUserDetails /></RequireRole>} />
              <Route path="content" element={<RequireRole allowedRoles={['ADMIN','EDITOR']}><AdminContent /></RequireRole>} />
              <Route path="files" element={<RequireRole allowedRoles={['ADMIN']}><AdminFiles /></RequireRole>} />
              <Route path="audit" element={<RequireRole allowedRoles={['ADMIN']}><AdminAuditLogs /></RequireRole>} />
              {/* <Route path="settings" element={<RequireRole allowedRoles={['ADMIN']}><AdminSettings /></RequireRole>} /> */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <Toasts />
      </ErrorBoundary>
    )
  }

  // Main App Layout
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-600/20">
                <span className="text-white font-display font-bold text-xl">E</span>
              </div>
              <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
                {t('app.name', 'E-Learning')}
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/" icon={LayoutDashboard} label={t('nav.dashboard')} />
              <NavItem to="/materials" icon={BookOpen} label={t('nav.materials')} />
              <NavItem to="/leaderboard" icon={Trophy} label={t('nav.leaderboard')} />
              <NavItem to="/profile" icon={User} label={t('nav.profile')} />
              {user?.role && (user.role === 'ADMIN' || user.role === 'EDITOR') && (
                <NavItem to="/admin" icon={Shield} label={t('nav.admin')} />
              )}
            </nav>

            {/* User Menu / Mobile Toggle */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-sm font-semibold truncate max-w-[100px]">{user.name}</span>
                    <span className="badge badge-primary text-xs px-2 py-0.5 rounded-full">{user.xp} XP</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <div className="hidden sm:flex gap-3">
                  <NavLink to="/login" className="btn-ghost text-sm font-semibold">
                    {t('nav.login')}
                  </NavLink>
                  <NavLink to="/register" className="btn btn-sm">
                    {t('nav.register')}
                  </NavLink>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 absolute w-full shadow-xl">
            <nav className="flex flex-col p-4 gap-2">
              <NavItem to="/" icon={LayoutDashboard} label={t('nav.dashboard')} onClick={closeMobileMenu} />
              <NavItem to="/materials" icon={BookOpen} label={t('nav.materials')} onClick={closeMobileMenu} />
              <NavItem to="/leaderboard" icon={Trophy} label={t('nav.leaderboard')} onClick={closeMobileMenu} />
              <NavItem to="/profile" icon={User} label={t('nav.profile')} onClick={closeMobileMenu} />
              {user?.role && (user.role === 'ADMIN' || user.role === 'EDITOR') && (
                <NavItem to="/admin" icon={Shield} label={t('nav.admin')} onClick={closeMobileMenu} />
              )}
              
              {!user && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <NavLink to="/login" className="btn-outline w-full justify-center" onClick={closeMobileMenu}>
                    {t('nav.login')}
                  </NavLink>
                  <NavLink to="/register" className="btn w-full justify-center" onClick={closeMobileMenu}>
                    {t('nav.register')}
                  </NavLink>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<RequireAuth><Dashboard/></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard/></RequireAuth>} />
              <Route path="/materials" element={<RequireAuth><Materials/></RequireAuth>} />
              <Route path="/lesson/:topicId/:lessonId" element={<RequireAuth><LessonView/></RequireAuth>} />
              <Route path="/leaderboard" element={<RequireAuth><Leaderboard/></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>} />
              <Route path="*" element={<NotFound/>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <Toasts />
      <CookieBanner />
    </div>
  )
}