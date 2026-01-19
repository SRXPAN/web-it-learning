import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Filter,
  User,
  FileText,
  Trash2,
  Edit,
  Plus,
  Eye,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LogIn,
  LogOut
} from 'lucide-react'

import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import { SkeletonList } from '@/components/Skeletons'

// --- Types ---

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId?: string
  userId: string
  user?: { name: string; email: string }
  ip?: string
  userAgent?: string
  metadata?: any
  createdAt: string
}

interface LogResponse {
  data: AuditLog[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

// --- Constants ---

const ACTION_CONFIG: Record<string, { icon: any, color: string }> = {
  CREATE: { icon: Plus, color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
  UPDATE: { icon: Edit, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
  DELETE: { icon: Trash2, color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' },
  VIEW: { icon: Eye, color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700' },
  DOWNLOAD: { icon: Download, color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30' },
  LOGIN: { icon: LogIn, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' },
  LOGOUT: { icon: LogOut, color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30' },
}

export default function AdminAuditLogs() {
  const { t } = useTranslation()
  
  // State
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    startDate: '',
    endDate: '',
  })

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      // Build query string
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      })

      const res = await api<LogResponse>(`/admin/audit-logs?${params.toString()}`)
      setLogs(res.data)
      setPagination(res.meta)
    } catch (err: any) {
      // Don't show error on 404 (just empty list), show for others
      if (!err.message?.includes('404')) {
        setError(err.message || t('common.loadFailed'))
      }
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filters, t])

  // Initial load
  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchLogs(newPage)
    }
  }

  const clearFilters = () => {
    setFilters({ action: '', resource: '', startDate: '', endDate: '' })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 font-display">
            <Activity className="w-8 h-8 text-primary-600" />
            {t('admin.auditLogs', 'Audit Logs')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.auditLogsDescription', 'Monitor system activity and user actions')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            {pagination.total} {t('common.total', 'Total')}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-300'
                : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t('common.filters', 'Filters')}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('admin.action', 'Action')}
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">{t('common.all', 'All')}</option>
                {Object.keys(ACTION_CONFIG).map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('admin.resource', 'Resource')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.resource}
                  onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                  placeholder="user, topic..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('admin.startDate', 'Start Date')}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {t('admin.endDate', 'End Date')}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors"
            >
              {t('common.clear', 'Clear')}
            </button>
            <button
              onClick={() => fetchLogs(1)}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
            >
              {t('common.apply', 'Apply Filters')}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <SkeletonList count={5} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('admin.noLogsFound', 'No logs found')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.VIEW
                const Icon = config.icon

                return (
                  <div
                    key={log.id}
                    className="group px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg shrink-0 mt-1 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {log.action}
                          </span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {log.resource}
                          </span>
                          {log.resourceId && (
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-[10px] font-mono">
                              #{log.resourceId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {log.user ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-medium">{log.user.name}</span>
                              <span className="text-gray-400">({log.user.email})</span>
                            </div>
                          ) : (
                            <span className="italic">{t('admin.systemAction', 'System')}</span>
                          )}
                          <span>
                            {new Date(log.createdAt).toLocaleString(undefined, { 
                              dateStyle: 'medium', 
                              timeStyle: 'short' 
                            })}
                          </span>
                          {log.ip && <span className="font-mono text-[10px] opacity-70">{log.ip}</span>}
                        </div>

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2 group/details">
                            <summary className="text-xs text-primary-600 dark:text-primary-400 cursor-pointer hover:underline select-none list-none flex items-center gap-1">
                              {t('admin.viewDetails', 'View Details')}
                            </summary>
                            <pre className="mt-2 text-[10px] bg-gray-900 text-gray-300 p-3 rounded-lg overflow-x-auto font-mono">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('common.page', 'Page')} {pagination.page} {t('common.of', 'of')} {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}