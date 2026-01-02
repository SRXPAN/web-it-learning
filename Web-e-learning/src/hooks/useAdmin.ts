/**
 * Admin API Hooks
 * For user management, audit logs, system stats
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/http'

// ============================================
// ABORT CONTROLLER HELPER
// ============================================

/**
 * Хук для управління AbortController і скасування запитів при unmount
 */
function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null)

  // Ініціалізуємо новий AbortController
  const getSignal = useCallback(() => {
    controllerRef.current = new AbortController()
    return controllerRef.current.signal
  }, [])

  // Скасовуємо запит при unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  return { getSignal }
}

// Types
interface User {
  id: string
  email: string
  name: string
  role: 'STUDENT' | 'EDITOR' | 'ADMIN'
  xp: number
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    answers: number
    topicsCreated: number
    materialsCreated: number
  }
}

interface AuditLog {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  metadata: Record<string, any> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  }
}

interface PaginatedResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface UsersResponse extends PaginatedResponse<User> {
  users: User[]
}

interface AuditLogsResponse extends PaginatedResponse<AuditLog> {
  logs: AuditLog[]
}

interface SystemStats {
  users: {
    total: number
    byRole: Record<string, number>
  }
  content: {
    topics: number
    materials: number
    quizzes: number
    questions: number
    files: number
  }
  activity: {
    last7days: Record<string, {
      timeSpent: number
      quizAttempts: number
      materialsViewed: number
    }>
  }
}

// Users Hook
export function useAdminUsers(initialPage = 1, initialLimit = 20) {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchUsers = useCallback(async (params?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', params.page.toString())
      if (params?.limit) query.set('limit', params.limit.toString())
      if (params?.role) query.set('role', params.role)
      if (params?.search) query.set('search', params.search)

      const response = await apiGet<UsersResponse>(`/admin/users?${query}`, getSignal())
      setUsers(response.users)
      setPagination(response.pagination)
    } catch (err) {
      // Ігноруємо помилку AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  const updateRole = useCallback(async (userId: string, role: string) => {
    try {
      await apiPut(`/admin/users/${userId}/role`, { role })
      // Refresh list
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
      return false
    }
  }, [fetchUsers, pagination])

  const verifyUser = useCallback(async (userId: string) => {
    try {
      await apiPut(`/admin/users/${userId}/verify`, {})
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify user')
      return false
    }
  }, [fetchUsers, pagination])

  const createUser = useCallback(async (data: {
    email: string
    name: string
    password: string
    role?: string
  }) => {
    try {
      await apiPost('/admin/users', data)
      fetchUsers({ page: 1, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
      return false
    }
  }, [fetchUsers, pagination])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await apiDelete(`/admin/users/${userId}`)
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
      return false
    }
  }, [fetchUsers, pagination])

  useEffect(() => {
    fetchUsers({ page: initialPage, limit: initialLimit })
  }, [])

  return {
    users,
    pagination,
    loading,
    error,
    fetchUsers,
    updateRole,
    verifyUser,
    createUser,
    deleteUser,
  }
}

// Audit Logs Hook
export function useAdminAuditLogs(initialPage = 1, initialLimit = 50) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchLogs = useCallback(async (params?: {
    page?: number
    limit?: number
    userId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', params.page.toString())
      if (params?.limit) query.set('limit', params.limit.toString())
      if (params?.userId) query.set('userId', params.userId)
      if (params?.action) query.set('action', params.action)
      if (params?.resource) query.set('resource', params.resource)
      if (params?.startDate) query.set('startDate', params.startDate)
      if (params?.endDate) query.set('endDate', params.endDate)

      const response = await apiGet<AuditLogsResponse>(`/admin/audit-logs?${query}`, getSignal())
      setLogs(response.logs)
      setPagination(response.pagination)
    } catch (err) {
      // Ігноруємо AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  useEffect(() => {
    fetchLogs({ page: initialPage, limit: initialLimit })
  }, [])

  return {
    logs,
    pagination,
    loading,
    error,
    fetchLogs,
  }
}

// System Stats Hook
export function useAdminStats() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchStats = useCallback(async () => {
    console.log('useAdminStats: Starting fetch...')
    setLoading(true)
    setError(null)
    try {
      console.log('useAdminStats: Calling API...')
      const response = await apiGet<SystemStats>('/admin/stats', getSignal())
      console.log('useAdminStats: Response received:', response)
      setStats(response)
    } catch (err) {
      // Ігноруємо AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('useAdminStats: Request aborted')
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stats'
      console.error('useAdminStats: Error:', errorMessage, err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  }
}

// Content Types
export interface Topic {
  id: string
  slug: string
  name: string
  nameJson?: Record<string, string>
  description: string
  descJson?: Record<string, string>
  category: string
  status: string
  parentId: string | null
  publishedAt?: string | null
  children?: Topic[]
  _count?: {
    materials: number
    quizzes: number
    children: number
  }
}

interface TopicCreateData {
  slug: string
  name: string
  nameJson?: Record<string, string>
  description?: string
  descJson?: Record<string, string>
  category?: string
  parentId?: string | null
}

interface TopicUpdateData extends Partial<TopicCreateData> {
  status?: string
  publishedAt?: string | null
}

// Admin Content Hook
export function useAdminContent() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiGet<{ topics: Topic[]; total: number }>('/admin/content/topics', getSignal())
      setTopics(response.topics)
      setTotal(response.total)
    } catch (err) {
      // Ігноруємо AbortError
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load topics')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  const createTopic = useCallback(async (data: TopicCreateData) => {
    try {
      const result = await apiPost<Topic>('/admin/content/topics', data)
      await fetchTopics()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
      throw err
    }
  }, [fetchTopics])

  const updateTopic = useCallback(async (id: string, data: TopicUpdateData) => {
    try {
      const result = await apiPut<Topic>(`/admin/content/topics/${id}`, data)
      await fetchTopics()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update topic')
      throw err
    }
  }, [fetchTopics])

  const deleteTopic = useCallback(async (id: string) => {
    try {
      await apiDelete(`/admin/content/topics/${id}`)
      await fetchTopics()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete topic')
      throw err
    }
  }, [fetchTopics])

  const publishTopic = useCallback(async (id: string) => {
    return updateTopic(id, { status: 'Published', publishedAt: new Date().toISOString() })
  }, [updateTopic])

  const unpublishTopic = useCallback(async (id: string) => {
    return updateTopic(id, { status: 'Draft', publishedAt: null })
  }, [updateTopic])

  useEffect(() => {
    fetchTopics()
  }, [])

  return {
    topics,
    total,
    loading,
    error,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    publishTopic,
    unpublishTopic,
  }
}

// Admin Translations Hook
interface UiTranslation {
  id: string
  key: string
  translations: Record<string, string>
  createdAt: string
  updatedAt: string
}

export function useAdminTranslations(initialPage = 1, initialLimit = 50) {
  const [translations, setTranslations] = useState<UiTranslation[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTranslations = useCallback(async (params?: {
    page?: number
    limit?: number
    search?: string
    namespace?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', params.page.toString())
      if (params?.limit) query.set('limit', params.limit.toString())
      if (params?.search) query.set('search', params.search)
      if (params?.namespace) query.set('namespace', params.namespace)

      const response = await apiGet<{
        translations: UiTranslation[]
        pagination: typeof pagination
      }>(`/translations/translations?${query}`)
      setTranslations(response.translations)
      setPagination(response.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translations')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTranslation = useCallback(async (data: {
    key: string
    translations: Record<string, string>
  }) => {
    try {
      await apiPost('/translations/translations', data)
      await fetchTranslations({ page: 1, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create translation')
      throw err
    }
  }, [fetchTranslations, pagination])

  const updateTranslation = useCallback(async (id: string, translations: Record<string, string>) => {
    try {
      await apiPut(`/translations/translations/${id}`, { translations })
      await fetchTranslations({ page: pagination.page, limit: pagination.limit })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update translation')
      throw err
    }
  }, [fetchTranslations, pagination])

  useEffect(() => {
    fetchTranslations({ page: initialPage, limit: initialLimit })
  }, [])

  return {
    translations,
    pagination,
    loading,
    error,
    fetchTranslations,
    createTranslation,
    updateTranslation,
  }
}
