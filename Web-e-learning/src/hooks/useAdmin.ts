import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/http'
import type { 
  User, 
  Role, 
  TopicLite, 
  Category, 
  Status 
} from '@elearn/shared'

// ============================================
// HELPER: ABORT CONTROLLER
// ============================================

function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null)

  const getSignal = useCallback(() => {
    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    controllerRef.current = new AbortController()
    return controllerRef.current.signal
  }, [])

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  return { getSignal }
}

// ============================================
// TYPES (Admin Specific)
// ============================================

export interface AdminUser extends User {
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    answers: number
    topicsCreated: number
    materialsCreated: number
  }
}

export interface AuditLog {
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
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface SystemStats {
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

// ============================================
// USERS HOOK
// ============================================

export function useAdminUsers(initialPage = 1, initialLimit = 20) {
  const [users, setUsers] = useState<AdminUser[]>([])
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

      const res = await api<{ users: AdminUser[], pagination: { page: number, limit: number, total: number, pages: number } }>(`/admin/users?${query}`, { signal: getSignal() })
      // Backend returns { users, pagination } not { data, pagination }
      setUsers(res.users || [])
      setPagination(res.pagination)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  const updateRole = useCallback(async (userId: string, role: Role) => {
    try {
      await api(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch {
      return false
    }
  }, [fetchUsers, pagination])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' })
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch {
      return false
    }
  }, [fetchUsers, pagination])

  const verifyUser = useCallback(async (userId: string) => {
    try {
      await api(`/admin/users/${userId}/verify`, { method: 'PUT' })
      fetchUsers({ page: pagination.page, limit: pagination.limit })
      return true
    } catch {
      return false
    }
  }, [fetchUsers, pagination])

  useEffect(() => {
    fetchUsers({ page: initialPage, limit: initialLimit })
  }, [])

  return { users, pagination, loading, error, fetchUsers, updateRole, deleteUser, verifyUser }
}

// ============================================
// AUDIT LOGS HOOK
// ============================================

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
      
      const res = await api<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${query}`, { signal: getSignal() })
      setLogs(res.data)
      setPagination(res.pagination)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  useEffect(() => {
    fetchLogs({ page: initialPage, limit: initialLimit })
  }, [])

  return { logs, pagination, loading, error, fetchLogs }
}

// ============================================
// SYSTEM STATS HOOK
// ============================================

export function useAdminStats() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<SystemStats>('/admin/stats', { signal: getSignal() })
      setStats(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refresh: fetchStats }
}

// ============================================
// CONTENT MANAGEMENT HOOK
// ============================================

export interface AdminTopic extends TopicLite {
  slug: string
  description: string
  descJson?: LocalizedString
  category: Category
  status: Status
  parentId: string | null
  publishedAt?: string | null
  materials?: Array<{
    id: string
    title: string
    titleJson?: LocalizedString
    type: 'pdf' | 'video' | 'link' | 'text'
    url?: string
    urlJson?: LocalizedString
    content?: string
    contentJson?: LocalizedString
    status: string
    lang?: string
    createdAt: string
    updatedAt: string
    isSeen?: boolean
  }>
  quizzes?: Array<{
    id: string
    title: string
    durationSec: number
    status: string
    createdAt: string
  }>
  children?: AdminTopic[]
  _count?: {
    materials: number
    quizzes: number
    children: number
  }
}

export function useAdminContent() {
  const [topics, setTopics] = useState<AdminTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getSignal } = useAbortController()

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ topics: AdminTopic[] }>('/admin/content/topics', { signal: getSignal() })
      setTopics(res.topics)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load topics')
    } finally {
      setLoading(false)
    }
  }, [getSignal])

  const deleteTopic = useCallback(async (id: string) => {
    try {
      await api(`/admin/content/topics/${id}`, { method: 'DELETE' })
      await fetchTopics()
      return true
    } catch {
      return false
    }
  }, [fetchTopics])

  useEffect(() => {
    fetchTopics()
  }, [])

  return { topics, loading, error, fetchTopics, deleteTopic }
}