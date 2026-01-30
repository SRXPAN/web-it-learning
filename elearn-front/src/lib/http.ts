import { useToast } from '@/components/Toast'

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const API_URL = `${base}/api`

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'

const toast = {
  error: (msg: string) => {
    const safeMessage = typeof msg === 'string' && msg.trim() ? msg : 'Something went wrong'
    // Access zustand store outside of React components
    useToast.getState().push({ type: 'error', msg: safeMessage })
  },
}

function extractErrorMessage(data: any, fallback = 'Something went wrong'): string {
  if (!data) return fallback
  
  // Check for validation error details first
  if (data.error && typeof data.error === 'object') {
    // Validation errors with field details
    if (data.error.details && typeof data.error.details === 'object') {
      const details = data.error.details
      // Get first field error from body validation
      if (details.body && typeof details.body === 'object') {
        const fieldErrors = Object.entries(details.body)
        if (fieldErrors.length > 0) {
          const [field, errors] = fieldErrors[0]
          const errorMsg = Array.isArray(errors) ? errors[0] : errors
          return `${field}: ${errorMsg}`
        }
      }
      // Get first field error from direct details
      const fieldErrors = Object.entries(details)
      if (fieldErrors.length > 0) {
        const [_field, errors] = fieldErrors[0]
        if (typeof errors === 'object' && errors !== null) {
          const innerErrors = Object.entries(errors as Record<string, unknown>)
          if (innerErrors.length > 0) {
            const [innerField, innerErr] = innerErrors[0]
            const errMsg = Array.isArray(innerErr) ? innerErr[0] : innerErr
            return `${innerField}: ${errMsg}`
          }
        }
      }
    }
    
    const nested = data.error.message ?? data.error.error
    if (typeof nested === 'string' && nested.trim()) return nested
  }
  
  const message = data.message ?? data.error ?? fallback
  if (typeof message === 'string' && message.trim()) return message
  
  return fallback
}

// Flag to prevent multiple concurrent refresh requests
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Gets CSRF token from cookie (if available)
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE}=([^;]+)`))
  return match ? match[2] : null
}

/**
 * Fetches fresh CSRF token from server
 */
export async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/auth/csrf`, {
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Failed to fetch CSRF token')
    const data = await res.json()
    return data.csrfToken
  } catch (e) {
    console.warn('CSRF Fetch Error:', e)
    return ''
  }
}

/**
 * Refreshes tokens via refresh endpoint
 */
async function refreshTokens(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }
  
  isRefreshing = true
  refreshPromise = (async () => {
    try {
      let token = getCsrfToken()
      if (!token) {
        token = await fetchCsrfToken()
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER]: token || '',
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
  // Rate Limit
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    const waitTime = retryAfter ? parseInt(retryAfter, 10) : 60
    const message = `Too many requests. Please wait ${waitTime} seconds.`
    toast.error(message)
    throw new Error(message)
  }

  // Auth Error (Token Expired or Invalid Credentials)
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    const code = data?.error?.code ?? data?.code
    const message = extractErrorMessage(data, 'Unauthorized')
    
    // If token expired, try to refresh (once)
    if ((code === 'TOKEN_EXPIRED' || message.includes('expired')) && retry) {
      const refreshed = await refreshTokens()
      if (refreshed) {
        await delay(100) // Give time for cookies to settle
        return retry()
      }
    }
    
    // For invalid credentials (login failure), show the actual error message
    if (code === 'INVALID_CREDENTIALS' || message.includes('Invalid credentials')) {
      throw new Error(message)
    }
    
    // For other 401s (user not authenticated), don't show toast
    // The app will redirect to login or show appropriate UI
    throw new Error('No token')
  }
  
  // Forbidden / CSRF Error
  if (res.status === 403) {
    const text = await res.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }
    const code = data?.error?.code ?? data?.code
    const message = extractErrorMessage(data, 'Forbidden')
    
    const isCsrf = code === 'CSRF_INVALID' || /csrf/i.test(message)
    
    // If CSRF error, get fresh token and retry
    if (isCsrf && retry) {
      await fetchCsrfToken().catch(() => null)
      return retry()
    }
    toast.error(message)
    throw new Error(message)
  }
  
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    if (!res.ok) {
      const message = typeof text === 'string' && text.trim() ? text : 'Request failed'
      toast.error(message)
      throw new Error(message)
    }
    return text as unknown as T
  }

  // Handle standard API response format { success: boolean, data: T, error: ... }
  if (data && typeof data === 'object' && 'success' in data) {
    const apiRes = data as { 
      success: boolean
      data?: T
      error?: { message?: string }
    }
    if (!apiRes.success) {
      const errorMessage = extractErrorMessage(apiRes, 'Request failed')
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
    return apiRes.data as T
  }

  if (!res.ok) {
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
  
  // TEMPORARY: Add Authorization header with token from localStorage
  const accessToken = localStorage.getItem('access_token')
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  
  const method = (init.method ?? 'GET').toUpperCase()
  const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  
  if (isMutating) {
    let csrfToken = getCsrfToken()
    if (!csrfToken) {
      try {
        csrfToken = await fetchCsrfToken()
      } catch {
        // Ignore error here, request will fail with 403 and be retried by handle()
      }
    }
    if (csrfToken) {
      headers[CSRF_HEADER] = csrfToken
    }
  }
  
  let retried = false
  const makeRequest = async (): Promise<T> => {
    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers,
      ...init,
    })
    
    const retry = retried ? undefined : () => {
      retried = true
      // Refresh headers (e.g. new CSRF) before retry
      const newToken = getCsrfToken()
      if (newToken && isMutating) headers[CSRF_HEADER] = newToken
      return makeRequest()
    }
    
    return handle<T>(res, retry)
  }
  
  return makeRequest()
}

// Convenience wrappers matching your existing interface
export const apiGet = <T>(path: string, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'GET', ...(signal && { signal }) })

export const apiPost = <T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'POST', body: JSON.stringify(body), ...(signal && { signal }) })

export const apiPut = <T, B = unknown>(path: string, body: B, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'PUT', body: JSON.stringify(body), ...(signal && { signal }) })

export const apiDelete = <T>(path: string, signal?: AbortSignal): Promise<T> => 
  api<T>(path, { method: 'DELETE', ...(signal && { signal }) })

export const http = {
  get: <T>(path: string): Promise<T> => apiGet<T>(path),
  post: <T, B = unknown>(path: string, body: B): Promise<T> => apiPost<T, B>(path, body),
  put: <T, B = unknown>(path: string, body: B): Promise<T> => apiPut<T, B>(path, body),
  delete: <T>(path: string): Promise<T> => apiDelete<T>(path),
}
