import { useToast } from '@/components/Toast'

// src/lib/http.ts
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const API_URL = `${base}/api`

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

const toast = {
  error: (msg: string) => {
    const safeMessage = typeof msg === 'string' && msg.trim() ? msg : 'Something went wrong'
    useToast.getState().push({ type: 'error', msg: safeMessage })
  },
}

function extractErrorMessage(data: any, fallback = 'Something went wrong'): string {
  if (!data) return fallback
  const message = data.message ?? data.error ?? fallback
  if (typeof message === 'string' && message.trim()) return message
  if (data.error && typeof data.error === 'object') {
    const nested = data.error.message ?? data.error.error
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  return fallback
}

// Флаг для запобігання множинним refresh запитам
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

// Затримка для exponential backoff
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Отримує CSRF токен з cookie
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE}=([^;]+)`))
  return match ? match[2] : null
}

/**
 * Завантажує CSRF токен з сервера
 */
export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/csrf`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch CSRF token')
  const data = await res.json()
  return data.csrfToken
}

/**
 * Оновлює токени через refresh endpoint
 */
async function refreshTokens(): Promise<boolean> {
  // Якщо вже оновлюємо - чекаємо на результат
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }
  
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER]: getCsrfToken() || '',
        },
      })
      return res.ok
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()
  
  return refreshPromise
}

async function handle<T>(res: Response, retry?: () => Promise<T>): Promise<T> {
  // Обробка Rate Limit - НЕ робимо retry, просто повертаємо помилку
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60
    const message = `Too many requests. Please wait ${waitTime} seconds.`
    toast.error(message)
    throw new Error(message)
  }

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    // New format: { success: false, error: { code, message } }
    const code = data?.error?.code ?? data?.code
    const message = extractErrorMessage(data, 'Unauthorized')
    // If token expired - try to refresh (only once)
    if (code === 'TOKEN_EXPIRED' && retry) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        await delay(100)
        return retry()
      }
    }
    toast.error(message)
    throw new Error(message)
  }
  
  if (res.status === 403) {
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    const code = data?.error?.code ?? data?.code
    const message = extractErrorMessage(data, 'Forbidden')
    // If CSRF error - try to refresh token
    if (code === 'CSRF_INVALID') {
      await fetchCsrfToken()
      const csrfMessage = 'CSRF token expired. Please try again.'
      toast.error(csrfMessage)
      throw new Error(csrfMessage)
    }
    toast.error(message)
    throw new Error(message)
  }
  
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // If not JSON, just use text
    if (!res.ok) {
      const message = typeof text === 'string' && text.trim() ? text : 'Request failed'
      toast.error(message)
      throw new Error(message)
    }
    return text as T
  }

  // Handle standardized AppError format: { success: false, error: { code, message, details? } }
  if (data && typeof data === 'object' && 'success' in data) {
    const api = data as { 
      success: boolean
      data?: T
      error?: { 
        code?: string
        message?: string
        details?: Record<string, any>
      }
    }
    if (!api.success) {
      // Extract message from new AppError format
      const errorMessage = extractErrorMessage(api.error, 'Request failed')
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
    return api.data as T
  }

  if (!res.ok) {
    // Fallback for other error formats
    const errorMessage = extractErrorMessage(data, 'Request failed')
    toast.error(errorMessage)
    throw new Error(errorMessage)
  }
  
  return data as T
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  }
  
  // Додаємо CSRF токен для мутуючих запитів
  if (init.method && !['GET', 'HEAD', 'OPTIONS'].includes(init.method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers[CSRF_HEADER] = csrfToken
    }
  }

  const makeRequest = async (): Promise<T> => {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers,
      ...init,
    })
    return handle<T>(res, makeRequest)
  }
  
  return makeRequest()
}

export const apiGet = <T>(path: string, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { ...(signal && { signal }) })
export const apiPost = <T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'POST', body: JSON.stringify(body), ...(signal && { signal }) })
export const apiPut = <T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'PUT', body: JSON.stringify(body), ...(signal && { signal }) })
export const apiDelete = <T>(path: string, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'DELETE', ...(signal && { signal }) })

// http object for more ergonomic usage
export const http = {
  get: <T>(path: string): Promise<T> => apiGet<T>(path),
  post: <T, B = unknown>(path: string, body: B): Promise<T> => apiPost<T, B>(path, body),
  put: <T, B = unknown>(path: string, body: B): Promise<T> => apiPut<T, B>(path, body),
  delete: <T>(path: string): Promise<T> => apiDelete<T>(path),
}

