import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import PasswordInput from '@/components/PasswordInput'
import LanguageSelector from '@/components/LanguageSelector'
import { useTranslation } from '@/i18n/useTranslation'
import { Loader2, UserPlus } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const { register } = useAuth()
  const { t } = useTranslation()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    
    // Validation
    if (password !== confirmPassword) {
      setErr(t('auth.passwordsNotMatch'))
      return
    }
    
    if (password.length < 8) {
      setErr(t('auth.passwordMinLength'))
      return
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setErr(t('auth.passwordSpecial' as any))
      return
    }
    
    setLoading(true)
    try {
      await register(name, email, password)
      nav('/')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('auth.error.registrationFailed')
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar with logo and language selector */}
      <div className="flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-display font-bold text-lg">E</span>
          </div>
          <span className="font-display font-semibold text-xl text-neutral-900 dark:text-white">{t('app.name')}</span>
        </div>
        <LanguageSelector />
      </div>
      
      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto">
        <form onSubmit={submit} className="card max-w-md w-full shadow-xl my-8">
          <h2 className="text-2xl font-display font-bold mb-6 text-center">{t('auth.register')}</h2>
          
          <label className="block mb-2 text-sm font-medium">{t('profile.name')}</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            placeholder={t('auth.namePlaceholder')}
            required
            disabled={loading}
          />
          
          <label className="block mt-4 mb-2 text-sm font-medium">{t('profile.email')}</label>
          <input 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            type="email"
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            placeholder={t('auth.placeholder.email')}
            required
            disabled={loading}
          />
          
          <label className="block mt-4 mb-2 text-sm font-medium">{t('auth.password')}</label>
          <PasswordInput 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
            showStrength
            required
            disabled={loading}
          />
          
          <label className="block mt-4 mb-2 text-sm font-medium">{t('auth.confirmPassword')}</label>
          <div className="relative">
            <PasswordInput 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="••••••••"
              required
              disabled={loading}
            />
            {confirmPassword.length > 0 && (
              <span className={`absolute right-10 top-1/2 -translate-y-1/2 text-xs font-medium ${
                passwordsMatch ? 'text-green-500' : 'text-red-500'
              }`}>
                {passwordsMatch ? '✓' : '✗'}
              </span>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn mt-6 w-full flex items-center justify-center gap-2"
            disabled={loading || (password.length > 0 && !passwordsMatch)}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                <UserPlus size={18} />
                {t('auth.createAccount')}
              </>
            )}
          </button>
          
          {err && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{err}</p>
            </div>
          )}
          
          <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
