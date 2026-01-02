/**
 * Admin User Details Page
 * Detailed view of a single user with activity, stats, and actions
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from '@/i18n/useTranslation'
import { apiGet } from '@/lib/http'
import {
  User,
  Mail,
  Shield,
  Trophy,
  Clock,
  FileText,
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Loading } from '@/components/Loading'

interface UserDetails {
  id: string
  email: string
  name: string
  role: string
  xp: number
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  _count: {
    answers: number
    topicsCreated: number
    materialsCreated: number
    quizzesCreated: number
  }
}

export default function AdminUserDetails() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const data = await apiGet<UserDetails>(`/admin/users/${id}`)
        setUser(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [id])

  if (loading) return <Loading />

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error || 'User not found'}</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 btn-primary">
          {t('common.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        {user.emailVerified ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{t('admin.verified')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <XCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{t('admin.unverified')}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">XP</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.xp.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quiz answers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user._count.answers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Materials created</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user._count.materialsCreated}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Member since</p>
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User information</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('common.role')}</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {user.role}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">{t('common.email')}</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Topics created</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {user._count.topicsCreated}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Quizzes created</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {user._count.quizzesCreated}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Last updated</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {new Date(user.updatedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
