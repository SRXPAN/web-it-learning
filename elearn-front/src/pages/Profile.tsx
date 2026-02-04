import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Globe, Palette, Sun, Moon, Lock, Camera, Trash2, AlertTriangle, Mail } from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/store/theme'
import { useTranslation } from '@/i18n/useTranslation'
import { apiPost, apiDelete, apiPut } from '@/lib/http'
import type { Lang } from '@packages/shared'

import PasswordInput from '@/components/PasswordInput'
import ConfirmDialog from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { SkeletonAvatar } from '@/components/Skeletons'

const LANG_NAMES: Record<Lang, string> = {
  UA: 'Українська',
  PL: 'Polski',
  EN: 'English',
}

// --- SUB-COMPONENTS ---

function SectionHeader({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
      <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
        <Icon size={20} />
      </div>
      <h3 className="text-lg font-display font-bold text-neutral-900 dark:text-white">
        {title}
      </h3>
    </div>
  )
}

function ProfileHeader({ user, onUpload, onDeleteAvatar, uploading }: { user: any, onUpload: any, onDeleteAvatar: any, uploading: boolean }) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
      <div className="relative group shrink-0">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center overflow-hidden shadow-lg shadow-primary-500/20">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-display font-bold text-white select-none">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
        
        {/* Upload Overlay */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
        >
          <Camera size={28} className="text-white drop-shadow-md" />
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUpload}
          className="hidden"
        />
        
        {/* Delete Button */}
        {user.avatar && (
          <button
            onClick={onDeleteAvatar}
            disabled={uploading}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110"
            title={t('profile.action.removeAvatar', 'Remove avatar')}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      <div className="text-center sm:text-left space-y-1">
        <h2 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">{user.name}</h2>
        <p className="text-neutral-500 dark:text-neutral-400 font-medium">{user.email}</p>
        <div className="flex items-center gap-3 justify-center sm:justify-start mt-2">
          <span className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider">
            {t('profile.xp', 'XP')}: {user.xp}
          </span>
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold uppercase tracking-wider">
            Lvl {Math.floor(user.xp / 100) + 1}
          </span>
        </div>
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function Profile() {
  const { user, refresh, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { t, lang, setLang } = useTranslation()
  const navigate = useNavigate()
  
  // States
  const [avatarLoading, setAvatarLoading] = useState(false)
  
  // Forms
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordState, setPasswordState] = useState({ loading: false, error: null as string | null, success: false })
  
  // Email form state
  const [emailForm, setEmailForm] = useState({ email: '', password: '' })
  const [emailState, setEmailState] = useState({ loading: false, error: null as string | null, success: false })
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  if (!user) return (
    <div className="card p-8">
      <SkeletonAvatar size={80} className="mb-6" />
      <div className="space-y-4">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded w-full animate-pulse" />
      </div>
    </div>
  )

  // -- Handlers --

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.error.imageTooLarge', 'Image too large (max 5MB)'))
      return
    }
    
    setAvatarLoading(true)
    try {
      // Step 1: Presign upload
      const presign = await apiPost<{ fileId: string; uploadUrl: string }>('/files/presign-upload', {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        category: 'avatars'
      })

      // Step 2: Upload to S3
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      })
      
      if (!uploadRes.ok) {
        throw new Error('Upload to S3 failed')
      }

      // Step 3: Confirm upload
      await apiPost('/files/confirm', { fileId: presign.fileId })

      // Step 4: Set as avatar
      await apiPost('/auth/avatar', { fileId: presign.fileId })

      await refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm(t('dialog.deleteConfirmation', 'Are you sure?'))) return
    setAvatarLoading(true)
    try {
      await apiDelete('/auth/avatar')
      await refresh()
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordState({ loading: true, error: null, success: false })
    
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordState({ loading: false, error: t('auth.passwordsNotMatch', 'Passwords do not match'), success: false })
      return
    }

    try {
      await apiPut('/auth/password', { currentPassword: passwordForm.current, newPassword: passwordForm.new })
      setPasswordState({ loading: false, error: null, success: true })
      setPasswordForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setPasswordState(s => ({ ...s, success: false })), 3000)
    } catch (err: any) {
      setPasswordState({ loading: false, error: err.message || 'Failed', success: false })
    }
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailState({ loading: true, error: null, success: false })
    
    // Validate email format
    if (!emailForm.email.toLowerCase().endsWith('@gmail.com')) {
      setEmailState({ loading: false, error: t('auth.emailMustBeGmail', 'Email must end with @gmail.com'), success: false })
      return
    }

    try {
      await apiPut('/auth/email', { newEmail: emailForm.email, password: emailForm.password })
      setEmailState({ loading: false, error: null, success: true })
      setEmailForm({ email: '', password: '' })
      await refresh()
      setTimeout(() => setEmailState(s => ({ ...s, success: false })), 3000)
    } catch (err: any) {
      setEmailState({ loading: false, error: err.message || 'Failed', success: false })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await apiDelete('/auth/account')
      logout()
      navigate('/')
    } catch (err: any) {
      alert(err.message)
      setDeleteLoading(false)
      setShowDeleteDialog(false)
    }
  }

  // All 9 badges matching backend gamification.ts
  const badges = [
    { id: 'first_steps', title: t('badge.firstSteps', 'First Steps'), cond: user.xp >= 10, icon: '⭐' },
    { id: 'rising_star', title: t('badge.risingStar', 'Rising Star'), cond: user.xp >= 50, icon: '🔥' },
    { id: 'dedicated_learner', title: t('badge.dedicatedLearner', 'Dedicated Learner'), cond: user.xp >= 100, icon: '📚' },
    { id: 'bookworm', title: t('badge.bookworm', 'Bookworm'), cond: user.xp >= 200, icon: '🐛' },
    { id: 'quiz_master', title: t('badge.quizMaster', 'Quiz Master'), cond: user.xp >= 350, icon: '🎯' },
    { id: 'scholar', title: t('badge.scholar', 'Scholar'), cond: user.xp >= 500, icon: '🎓' },
    { id: 'expert', title: t('badge.expert', 'Expert'), cond: user.xp >= 750, icon: '🏆' },
    { id: 'guru', title: t('badge.guru', 'Guru'), cond: user.xp >= 1000, icon: '👑' },
    { id: 'legend', title: t('badge.legend', 'Legend'), cond: user.xp >= 1500, icon: '🌟' },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* 1. Profile Card */}
      <section className="card overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-primary-500/10 to-accent-500/10 dark:from-primary-900/20 dark:to-accent-900/20" />
        <div className="relative pt-6">
          <ProfileHeader 
            user={user} 
            onUpload={handleAvatarUpload} 
            onDeleteAvatar={handleRemoveAvatar} 
            uploading={avatarLoading} 
          />
          
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
            <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
              {t('profile.badges', 'Achievements')} ({badges.filter(b => b.cond).length}/{badges.length})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
              {badges.map(b => (
                <div 
                  key={b.id} 
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${
                    b.cond
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800'
                      : 'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 grayscale opacity-50'
                  }`}
                  title={b.title}
                >
                  <span className="text-2xl">{b.cond ? b.icon : '🔒'}</span>
                  <span className={`text-[10px] font-medium leading-tight line-clamp-2 ${
                    b.cond ? 'text-amber-800 dark:text-amber-200' : 'text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {b.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Settings Grid - Better mobile layout */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Appearance */}
        <section className="card h-full">
          <SectionHeader icon={Settings} title={t('profile.settings', 'Preferences')} />
          
          <div className="space-y-5 sm:space-y-6">
            {/* Language */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 sm:mb-3 flex items-center gap-2">
                <Globe size={16} /> {t('profile.language', 'Language')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['UA', 'PL', 'EN'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border min-h-[40px] sm:min-h-auto ${
                      lang === l
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                        : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    {LANG_NAMES[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 sm:mb-3 flex items-center gap-2">
                <Palette size={16} /> {t('profile.theme', 'Theme')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => theme === 'dark' && toggle()}
                  className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border min-h-[40px] sm:min-h-auto ${
                    theme === 'light'
                      ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Sun size={16} /> <span className="hidden sm:inline">{t('profile.light', 'Light')}</span>
                </button>
                <button
                  onClick={() => theme === 'light' && toggle()}
                  className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all border min-h-[40px] sm:min-h-auto ${
                    theme === 'dark'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Moon size={16} /> <span className="hidden sm:inline">{t('profile.dark', 'Dark')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="card h-full">
          <SectionHeader icon={Lock} title={t('profile.action.changePassword', 'Security')} />
          
          <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                {t('profile.label.currentPassword', 'Current Password')}
              </label>
              <PasswordInput
                value={passwordForm.current}
                onChange={e => setPasswordForm(s => ({...s, current: e.target.value}))}
                placeholder={t('profile.label.currentPassword', 'Current Password')}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                {t('profile.label.newPassword', 'New Password')}
              </label>
              <PasswordInput
                value={passwordForm.new}
                onChange={e => setPasswordForm(s => ({...s, new: e.target.value}))}
                placeholder={t('profile.label.newPassword', 'New Password')}
                autoComplete="new-password"
                showStrength
                required
              />
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                {t('profile.label.confirmNewPassword', 'Confirm Password')}
              </label>
              <PasswordInput
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(s => ({...s, confirm: e.target.value}))}
                placeholder={t('profile.label.confirmNewPassword', 'Confirm Password')}
                autoComplete="new-password"
                required
              />
            </div>
            
            {passwordState.error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-xs text-green-500 bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg">{t('profile.success.passwordChanged', 'Password changed!')}</p>
            )}

            <LoadingButton 
              type="submit" 
              loading={passwordState.loading}
              className="w-full min-h-[44px] sm:min-h-[40px]"
              disabled={!passwordForm.current || !passwordForm.new}
            >
              {t('common.save', 'Update Password')}
            </LoadingButton>
          </form>
        </section>
      </div>

      {/* 2.5 Email Change Section - Better mobile layout */}
      <section className="card">
        <SectionHeader icon={Mail} title={t('profile.action.changeEmail', 'Change Email')} />
        
        <form onSubmit={handleChangeEmail} className="space-y-4 w-full">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('profile.label.newEmail', 'New Email')}
            </label>
            <input
              type="email"
              value={emailForm.email}
              onChange={e => setEmailForm(s => ({...s, email: e.target.value}))}
              placeholder={t('profile.placeholder.newEmail', 'Enter new email')}
              className="w-full rounded-xl border px-3 py-2.5 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none text-sm"
              required
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">{t('auth.emailMustBeGmail', 'Email must end with @gmail.com')}</p>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('profile.label.currentPassword', 'Current Password')}
            </label>
            <PasswordInput
              value={emailForm.password}
              onChange={e => setEmailForm(s => ({...s, password: e.target.value}))}
              placeholder={t('profile.label.currentPassword', 'Current Password')}
              autoComplete="current-password"
              required
            />
          </div>
          
          {emailState.error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">{emailState.error}</p>
          )}
          {emailState.success && (
            <p className="text-xs text-green-500 bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg">{t('profile.success.emailChanged', 'Email changed!')}</p>
          )}

          <LoadingButton 
            type="submit" 
            loading={emailState.loading}
            className="w-full min-h-[44px] sm:min-h-[40px]"
            disabled={!emailForm.email || !emailForm.password}
          >
            {t('profile.action.changeEmail', 'Change Email')}
          </LoadingButton>
        </form>
      </section>

      {/* 3. Danger Zone - Better mobile layout */}
      <section className="card border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="bg-red-50 dark:bg-red-900/10 -m-6 mb-6 p-4 px-6 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
          <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
          <h3 className="font-bold text-red-900 dark:text-red-200 text-sm sm:text-base">
            {t('profile.dangerZone', 'Danger Zone')}
          </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {t('profile.deleteAccountWarning', 'Deleting your account is irreversible. All your progress, badges and settings will be permanently lost.')}
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn-outline border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto shrink-0 min-h-[44px] sm:min-h-[40px]"
          >
            {t('profile.action.deleteAccount', 'Delete Account')}
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title={t('profile.deleteConfirm.title', 'Delete Account?')}
        message={t('profile.deleteConfirm.message', 'This action cannot be undone.')}
        confirmText={t('profile.deleteConfirm.confirm', 'Yes, Delete')}
        variant="danger"
        isLoading={deleteLoading}
      />
    </div>
  )
}
