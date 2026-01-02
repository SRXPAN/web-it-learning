/**
 * Admin Dashboard Page
 * System stats overview
 */
import { useAdminStats } from '@/hooks/useAdmin'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Users,
  BookOpen,
  FileQuestion,
  FolderOpen,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { Loading } from '@/components/Loading'

export default function AdminDashboard() {
  const { stats, loading, error, refresh } = useAdminStats()
  const { t } = useTranslation()

  // Debug logs
  console.log('AdminDashboard stats:', stats)
  console.log('AdminDashboard loading:', loading)
  console.log('AdminDashboard error:', error)

  if (loading) {
    return <Loading />
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error || 'Failed to load stats'}</p>
        <button
          onClick={refresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  const statCards = [
    {
      label: t('admin.totalUsers'),
      value: stats.users?.total ?? 0,
      icon: Users,
      color: 'blue',
    },
    {
      label: t('admin.totalTopics'),
      value: stats.content?.topics ?? 0,
      icon: BookOpen,
      color: 'green',
    },
    {
      label: t('admin.totalMaterials'),
      value: stats.content?.materials ?? 0,
      icon: FileQuestion,
      color: 'purple',
    },
    {
      label: t('admin.totalFiles'),
      value: stats.content?.files ?? 0,
      icon: FolderOpen,
      color: 'orange',
    },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.dashboard')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.dashboardDescription')}
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
        >
          <Activity className="w-4 h-4 mr-2" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="col-span-12 md:col-span-6 xl:col-span-3 bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-7 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Users by Role */}
      {stats?.users?.byRole && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.usersByRole')}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(stats.users.byRole).map(([role, count]) => (
              <div
                key={role}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{role}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {(count as number).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          {t('admin.recentActivity')}
        </h2>
        {stats?.activity?.last7days ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="pb-3 font-medium">{t('common.date')}</th>
                  <th className="pb-3 font-medium text-right">{t('admin.timeSpent')}</th>
                  <th className="pb-3 font-medium text-right">{t('admin.quizAttempts')}</th>
                  <th className="pb-3 font-medium text-right">{t('admin.materialsViewed')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.activity.last7days).map(([date, data]) => (
                  <tr key={date} className="border-b dark:border-gray-700 last:border-0">
                    <td className="py-3 text-gray-900 dark:text-white">{date}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                      {Math.round(data.timeSpent / 60)} {t('common.minutes')}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                      {data.quizAttempts}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                      {data.materialsViewed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('admin.noActivityData')}
          </p>
        )}
      </div>
    </div>
  )
}
