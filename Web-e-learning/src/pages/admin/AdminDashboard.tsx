import { useAdminStats } from '@/hooks/useAdmin'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Users,
  BookOpen,
  FileQuestion,
  FolderOpen,
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react'
import { SkeletonDashboard } from '@/components/Skeletons'

export default function AdminDashboard() {
  const { stats, loading, error, refresh } = useAdminStats()
  const { t } = useTranslation()

  if (loading) {
    return <SkeletonDashboard />
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {t('common.loadFailed', 'Failed to load stats')}
        </h3>
        <p className="text-neutral-500 mb-6 max-w-sm">
          {error || 'An unexpected error occurred while fetching system statistics.'}
        </p>
        <button
          onClick={refresh}
          className="btn flex items-center gap-2"
        >
          <Activity size={18} />
          {t('common.retry', 'Retry')}
        </button>
      </div>
    )
  }

  const statCards = [
    {
      label: t('admin.totalUsers', 'Total Users'),
      value: stats.users?.total ?? 0,
      icon: Users,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      label: t('admin.totalTopics', 'Total Topics'),
      value: stats.content?.topics ?? 0,
      icon: BookOpen,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      label: t('admin.totalMaterials', 'Total Materials'),
      value: stats.content?.materials ?? 0,
      icon: FileQuestion,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      label: t('admin.totalFiles', 'Total Files'),
      value: stats.content?.files ?? 0,
      icon: FolderOpen,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-display">
            {t('admin.dashboard', 'Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.dashboardDescription', 'System overview and statistics')}
          </p>
        </div>
        <button
          onClick={refresh}
          className="btn-outline self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          <Activity size={16} />
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-xl shrink-0 ${color}`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Activity Chart (Table view for MVP) */}
        <div className="card h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('admin.recentActivity', 'Recent Activity')}
            </h2>
          </div>
          
          {stats.activity?.last7days && Object.keys(stats.activity.last7days).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3 font-medium pl-2">{t('common.date', 'Date')}</th>
                    <th className="pb-3 font-medium text-right">{t('admin.timeSpent', 'Time')}</th>
                    <th className="pb-3 font-medium text-right">{t('admin.quizAttempts', 'Quizzes')}</th>
                    <th className="pb-3 font-medium text-right pr-2">{t('admin.materialsViewed', 'Materials')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {Object.entries(stats.activity.last7days).map(([date, data]) => (
                    <tr key={date} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 pl-2 font-medium text-gray-900 dark:text-white">{date}</td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {Math.round(data.timeSpent / 60)} {t('common.minutes', 'min')}
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {data.quizAttempts}
                      </td>
                      <td className="py-3 text-right pr-2 text-gray-600 dark:text-gray-400">
                        {data.materialsViewed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Activity size={32} className="mb-2 opacity-20" />
              <p>{t('admin.noActivityData', 'No activity data available')}</p>
            </div>
          )}
        </div>

        {/* Users by Role */}
        <div className="card h-full">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Users size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('admin.usersByRole', 'Users by Role')}
            </h2>
          </div>
          
          {stats.users?.byRole ? (
            <div className="space-y-4">
              {Object.entries(stats.users.byRole).map(([role, count]) => {
                const percentage = stats.users.total > 0 
                  ? Math.round((count / stats.users.total) * 100) 
                  : 0
                
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{role}</span>
                      <span className="text-gray-500">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          role === 'ADMIN' ? 'bg-purple-500' : 
                          role === 'EDITOR' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {t('admin.noActivityData', 'No data')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}