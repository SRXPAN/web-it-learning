import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useTranslation } from '@/i18n/useTranslation'
import PasswordInput from '@/components/PasswordInput'
import LanguageSelector from '@/components/LanguageSelector'
import { LoadingButton } from '@/components/LoadingButton'

interface LocationState {
  from?: { pathname: string }
}

export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const nav = useNavigate()
  const loc = useLocation()
  const state = loc.state as LocationState
  // Redirect back to where they came from, or to dashboard
  const from = state?.from?.pathname || '/'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    
    try {
      await login(email, password)
      nav(from, { replace: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.error.loginFailed', 'Login failed')
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 sm:p-6 absolute top-0 w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-white font-display font-bold text-lg select-none">E</span>
          </div>
          <span className="font-display font-semibold text-xl text-neutral-900 dark:text-white hidden sm:block">
            {t('app.name', 'E-Learn')}
          </span>
        </div>
        <LanguageSelector />
      </div>
      
      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <form onSubmit={onSubmit} className="card shadow-2xl border-t-4 border-t-primary-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {t('auth.login', 'Login')}
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                {t('auth.signIn', 'Welcome back! Please sign in to continue.')}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('profile.email', 'Email')}
                </label>
                <input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  type="email" 
                  className="w-full rounded-xl border px-3 py-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" 
                  placeholder={t('auth.placeholder.email', 'name@example.com')}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {t('auth.password', 'Password')}
                  </label>
                </div>
                <PasswordInput 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            {err && (
              <div className="mt-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{err}</p>
              </div>
            )}
            
            <LoadingButton 
              type="submit" 
              loading={loading}
              className="w-full mt-6 py-3 text-base"
              icon={<LogIn size={18} />}
            >
              {t('auth.signIn', 'Sign In')}
            </LoadingButton>
            
            <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
              {t('auth.noAccount', "Don't have an account?")}{' '}
              <Link 
                to="/register" 
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold hover:underline transition-all"
              >
                {t('nav.register', 'Register')}
              </Link>
            </div>
          </form>
          
          <p className="text-center text-xs text-neutral-400 mt-8">
            &copy; {new Date().getFullYear()} {t('app.name', 'E-Learn')}. {t('auth.privacyPolicy', 'Privacy Policy')}
          </p>
        </div>
      </div>
    </div>
  )
}