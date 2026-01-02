// src/lib/http.ts
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const API_URL = `${base}/api`

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

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
    throw new Error(`Too many requests. Please wait ${waitTime} seconds.`)
  }

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    
    // Якщо токен протермінований - спробуємо оновити (тільки один раз)
    if (data?.code === 'TOKEN_EXPIRED' && retry) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        // Затримка перед retry щоб не забити rate limit
        await delay(100)
        return retry()
      }
    }
    
    throw new Error('Unauthorized')
  }
  
  if (res.status === 403) {
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    // Якщо CSRF помилка - спробуємо оновити токен
    if (data?.error?.includes('CSRF')) {
      await fetchCsrfToken()
      throw new Error('CSRF token expired. Please try again.')
    }
    throw new Error(data?.error || 'Forbidden')
  }
  
  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  // Handle standardized API wrapper { success, data, error }
  if (data && typeof data === 'object' && 'success' in data) {
    const api = data as { success: boolean; data?: T; error?: { message?: string } }
    if (!api.success) {
      throw new Error(api.error?.message || 'Request failed')
    }
    return api.data as T
  }

  if (!res.ok) throw new Error(typeof data === 'object' && data?.error ? data.error : (text || 'Request failed'))
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

