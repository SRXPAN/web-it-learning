import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Settings, Globe, Palette, Sun, Moon, Lock, Camera, Mail, Trash2, AlertTriangle, User } from 'lucide-react'

import { useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/store/theme'
import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import type { Lang } from '@elearn/shared'

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
      // Use FileReader for base64 (simple MVP approach)
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          await api('/auth/avatar', { method: 'POST', body: JSON.stringify({ avatar: reader.result }) })
          await refresh()
        } catch (err) {
          console.error(err)
        } finally {
          setAvatarLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch {
      setAvatarLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm(t('dialog.deleteConfirmation', 'Are you sure?'))) return
    setAvatarLoading(true)
    try {
      await api('/auth/avatar', { method: 'DELETE' })
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
      await api('/auth/password', { 
        method: 'PUT', 
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new }) 
      })
      setPasswordState({ loading: false, error: null, success: true })
      setPasswordForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setPasswordState(s => ({ ...s, success: false })), 3000)
    } catch (err: any) {
      setPasswordState({ loading: false, error: err.message || 'Failed', success: false })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await api('/auth/account', { method: 'DELETE' })
      logout()
      navigate('/')
    } catch (err: any) {
      alert(err.message)
      setDeleteLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const badges = [
    { id:'b1', title: t('profile.badges', 'Badges'), cond: user.xp >= 10 },
    { id:'b2', title: t('profile.badge.risingStar', 'Rising Star'), cond: user.xp >= 50 },
    { id:'b3', title: t('profile.badge.algorithmMaster', 'Algo Master'), cond: user.xp >= 100 },
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
              {t('profile.badges', 'Achievements')}
            </h4>
            <div className="flex gap-3 flex-wrap">
              {badges.map(b => (
                <span 
                  key={b.id} 
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    b.cond
                      ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                      : 'bg-neutral-100 text-neutral-400 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700 grayscale opacity-60'
                  }`}
                >
                  {b.cond ? '🏆' : '🔒'} {b.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Settings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Appearance */}
        <section className="card h-full">
          <SectionHeader icon={Settings} title={t('profile.settings', 'Preferences')} />
          
          <div className="space-y-6">
            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                <Globe size={16} /> {t('profile.language', 'Language')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['UA', 'PL', 'EN'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
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
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                <Palette size={16} /> {t('profile.theme', 'Theme')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => theme === 'dark' && toggle()}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    theme === 'light'
                      ? 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Sun size={16} /> {t('profile.light', 'Light')}
                </button>
                <button
                  onClick={() => theme === 'light' && toggle()}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    theme === 'dark'
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 shadow-sm'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Moon size={16} /> {t('profile.dark', 'Dark')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="card h-full">
          <SectionHeader icon={Lock} title={t('profile.action.changePassword', 'Security')} />
          
          <form onSubmit={handleChangePassword} className="space-y-4">
            <PasswordInput
              value={passwordForm.current}
              onChange={e => setPasswordForm(s => ({...s, current: e.target.value}))}
              placeholder={t('profile.label.currentPassword', 'Current Password')}
              required
            />
            <PasswordInput
              value={passwordForm.new}
              onChange={e => setPasswordForm(s => ({...s, new: e.target.value}))}
              placeholder={t('profile.label.newPassword', 'New Password')}
              showStrength
              required
            />
            <PasswordInput
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(s => ({...s, confirm: e.target.value}))}
              placeholder={t('profile.label.confirmNewPassword', 'Confirm Password')}
              required
            />
            
            {passwordState.error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-xs text-green-500 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">{t('profile.success.passwordChanged', 'Password changed!')}</p>
            )}

            <LoadingButton 
              type="submit" 
              loading={passwordState.loading}
              className="w-full"
              disabled={!passwordForm.current || !passwordForm.new}
            >
              {t('common.save', 'Update Password')}
            </LoadingButton>
          </form>
        </section>
      </div>

      {/* 3. Danger Zone */}
      <section className="card border-red-100 dark:border-red-900/30 overflow-hidden">
        <div className="bg-red-50 dark:bg-red-900/10 -m-6 mb-6 p-4 px-6 border-b border-red-100 dark:border-red-900/30 flex items-center gap-3">
          <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
          <h3 className="font-bold text-red-900 dark:text-red-200">
            {t('profile.dangerZone', 'Danger Zone')}
          </h3>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-lg">
            {t('profile.deleteAccountWarning', 'Deleting your account is irreversible. All your progress, badges and settings will be permanently lost.')}
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn-outline border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full sm:w-auto shrink-0"
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
        loading={deleteLoading}
      />
    </div>
  )
}