import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle } from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import PasswordInput from '@/components/PasswordInput'
import LanguageSelector from '@/components/LanguageSelector'
import { LoadingButton } from '@/components/LoadingButton'
import { useTranslation } from '@/i18n/useTranslation'

export default function Register() {
  const { register } = useAuth()
  const { t } = useTranslation()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    
    // Basic Client-side Validation
    if (password !== confirmPassword) {
      setErr(t('auth.passwordsNotMatch', 'Passwords do not match'))
      return
    }
    
    if (password.length < 8) {
      setErr(t('auth.passwordMinLength', 'Password must be at least 8 characters'))
      return
    }

    if (!agreedToTerms) {
      setErr(t('auth.agreeToTerms', 'You must agree to the terms'))
      return
    }

    // Validate email domain - only @gmail.com allowed
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setErr(t('auth.emailMustBeGmail', 'Email must end with @gmail.com'))
      return
    }
    
    setLoading(true)
    try {
      await register(name, email, password)
      // After successful registration, redirect to dashboard
      nav('/', { replace: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.error.registrationFailed', 'Registration failed')
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

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
      <div className="flex-1 flex items-center justify-center p-4 pt-24 pb-8">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <form onSubmit={submit} className="card shadow-2xl border-t-4 border-t-primary-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {t('auth.createAccount', 'Create Account')}
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                {t('auth.noAccount', 'Join us to start learning today')}
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('profile.name', 'Name')}
                </label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full rounded-xl border px-3 py-3 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                  placeholder={t('auth.namePlaceholder', 'Your Name')}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              {/* Email */}
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
              
              {/* Password */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth.password', 'Password')}
                </label>
                <PasswordInput 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  showStrength
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              
              {/* Confirm Password */}
              <div className="relative">
                <label className="block mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('auth.confirmPassword', 'Confirm Password')}
                </label>
                <div className="relative">
                  <PasswordInput 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  {confirmPassword.length > 0 && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                      {passwordsMatch ? (
                        <span className="text-green-500 text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-red-500 text-xs font-bold">✕</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={loading}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 checked:bg-primary-600 checked:border-transparent transition-all"
                    />
                    <svg
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 select-none">
                    {t('auth.agreeToTerms', 'I agree to')}{' '}
                    <Link to="/terms" target="_blank" className="text-primary-600 hover:text-primary-700 underline font-medium">
                      {t('auth.termsOfService', 'Terms')}
                    </Link>
                    {' '}{t('auth.and', 'and')}{' '}
                    <Link to="/privacy" target="_blank" className="text-primary-600 hover:text-primary-700 underline font-medium">
                      {t('auth.privacyPolicy', 'Privacy Policy')}
                    </Link>
                  </span>
                </label>
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
              icon={<UserPlus size={18} />}
              disabled={loading || !agreedToTerms}
            >
              {t('auth.register', 'Register')}
            </LoadingButton>
            
            <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
              {t('auth.hasAccount', 'Already have an account?')}{' '}
              <Link 
                to="/login" 
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold hover:underline transition-all"
              >
                {t('auth.signIn', 'Sign In')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
