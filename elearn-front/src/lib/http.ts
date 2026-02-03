import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { dispatchToast } from '@/utils/toastEmitter'

// Визначаємо API URL один раз
const envUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const API_URL = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`

// Створюємо інстанс axios
const $api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// === Helper: Отримання CSRF токена з куків ===
function getCsrfFromCookie(): string | null {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'))
  return match ? match[2] : null
}

// === CSRF Token Promise Cache (запобігає race condition) ===
let csrfPromise: Promise<string> | null = null
let csrfTokenCache: string | null = null
let csrfTokenTimestamp: number = 0
const CSRF_TOKEN_TTL = 60 * 1000 // 1 хвилина кеш

// === Функція для отримання CSRF токена ===
// Використовуємо promise cache щоб запобігти race condition
// ВАЖЛИВО: Ця функція визначена до interceptor, бо використовується в ньому
const fetchCsrfToken = async (): Promise<string> => {
  const now = Date.now()
  
  // Якщо є валідний кешований токен - повертаємо його
  if (csrfTokenCache && (now - csrfTokenTimestamp) < CSRF_TOKEN_TTL) {
    return csrfTokenCache
  }
  
  // Спробуємо з куки (якщо cookie працює)
  const cookieToken = getCsrfFromCookie()
  if (cookieToken) {
    csrfTokenCache = cookieToken
    csrfTokenTimestamp = now
    return cookieToken
  }
  
  // Якщо запит вже йде - чекаємо на нього (запобігає race condition)
  if (csrfPromise) {
    return csrfPromise
  }
  
  // Створюємо новий запит
  csrfPromise = (async () => {
    try {
      // Використовуємо чистий axios щоб не зациклити інтерцептори
      const response = await axios.get(`${API_URL}/auth/csrf`, { withCredentials: true })
      
      // КРИТИЧНО: Беремо токен ПРЯМО З JSON відповіді
      const tokenFromServer = response.data?.csrfToken
      
      if (tokenFromServer) {
        csrfTokenCache = tokenFromServer
        csrfTokenTimestamp = Date.now()
        console.log('[CSRF] Token received from server')
        return tokenFromServer
      }
      
      console.warn('[CSRF] No token in server response')
      return ''
    } catch (e) {
      console.warn('[CSRF] Fetch Error', e)
      return ''
    } finally {
      // Очищуємо проміс через 2 секунди
      setTimeout(() => { csrfPromise = null }, 2000)
    }
  })()
  
  return csrfPromise
}

// Експортуємо для зовнішнього використання (AuthContext, main.tsx)
export { fetchCsrfToken }

// === Request Interceptor (ASYNC для очікування CSRF токена) ===
$api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Додаємо CSRF для мутуючих методів
  const method = config.method?.toLowerCase()
  const isMutating = ['post', 'put', 'delete', 'patch'].includes(method || '')
  
  if (isMutating && config.headers) {
    // Спочатку пробуємо з куки, потім з кешу
    let csrfToken = getCsrfFromCookie() || csrfTokenCache
    
    // Якщо токена немає ніде - форсуємо отримання через API
    if (!csrfToken) {
      console.log('[CSRF] Token missing, fetching before request...')
      csrfToken = await fetchCsrfToken()
    }
    
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken
    } else {
      console.warn('[CSRF] Failed to obtain token, request may fail.')
    }
  }
  
  return config
})

// === Response Interceptor (Error Handling & Refresh) ===
$api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean }

    // 1. Обробка 403 CSRF token missing/invalid - Оновлення CSRF токена і повтор запиту
    if (error.response?.status === 403 && error.config && !originalRequest._csrfRetry) {
      const errorMessage = (error.response?.data as any)?.error || ''
      const isCsrfError = errorMessage.includes('CSRF')
      
      if (isCsrfError) {
        originalRequest._csrfRetry = true
        
        try {
          // Очищуємо старий кеш токена
          csrfTokenCache = null
          csrfTokenTimestamp = 0
          csrfPromise = null
          
          // Отримуємо новий CSRF токен
          const newCsrfToken = await fetchCsrfToken()
          
          if (newCsrfToken && originalRequest.headers) {
            originalRequest.headers['x-csrf-token'] = newCsrfToken
          }
          // Повторюємо запит з новим токеном
          return $api.request(originalRequest)
        } catch (csrfError) {
          console.error('[CSRF] Token refresh failed', csrfError)
          return Promise.reject(csrfError)
        }
      }
    }

    // 2. Обробка 401 (Unauthorized) - Оновлення токена
    // НЕ робимо refresh для /auth/me та /auth/refresh (уникаємо зациклення)
    const requestUrl = originalRequest.url || ''
    const skipRefresh = requestUrl.includes('/auth/me') || requestUrl.includes('/auth/refresh')
    
    if (error.response?.status === 401 && error.config && !originalRequest._retry && !skipRefresh) {
      originalRequest._retry = true

      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { 
            withCredentials: true,
            headers: { 'x-csrf-token': getCsrfFromCookie() || '' }
          }
        )
        return $api.request(originalRequest)
      } catch (refreshError) {
        console.error('Session expired', refreshError)
        localStorage.removeItem('user_data')
        localStorage.removeItem('access_token')
        
        // Timeout fix for React "NotFoundError" (білий екран)
        setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'
            }
        }, 100)
        
        return Promise.reject(refreshError)
      }
    }

    // 3. Глобальна обробка помилок (Toast)
    const status = error.response?.status
    const data = error.response?.data as any
    const message = data?.message || data?.error || error.message || 'Something went wrong'

    // Не показувати тост для певних випадків:
    // - 401: автоматичне перенаправлення на логін
    // - 429: rate limit (окремий UI для цього)
    // - 403 для activity/ping: це не критична помилка, не треба показувати користувачу
    // - 403 для CSRF retry: буде повторено автоматично
    // - logout помилки: користувач все одно виходить, не треба показувати помилку
    const errorUrl = error.config?.url || ''
    const isActivityPing = errorUrl.includes('/activity/ping')
    const isLogout = errorUrl.includes('/auth/logout')
    const isAuthCheck = errorUrl.includes('/auth/me') || errorUrl.includes('/auth/refresh')
    const isCsrfRetry = (error.response?.data as any)?.error?.includes('CSRF')
    
    // Не показуємо помилки для auth перевірок (користувач просто не залогінений)
    if (status !== 401 && status !== 429 && !(status === 403 && (isActivityPing || isCsrfRetry)) && !isLogout && !isAuthCheck) {
       // Перевіряємо, чи dispatchToast існує (щоб не ламало тести/SSR)
       try {
         dispatchToast(typeof message === 'string' ? message : 'Request failed', 'error')
       } catch (e) {
         console.error('Failed to dispatch toast', e)
       }
    }

    return Promise.reject(error)
  }
)


export default $api

// === Helper: Extract data from API response ===
// Backend returns { success: true, data: T } structure
function extractResponseData<T>(responseData: any): T {
  if (responseData && typeof responseData === 'object' && 'data' in responseData && 'success' in responseData) {
    return responseData.data as T
  }
  return responseData as T
}

// === Fetch-style API wrapper ===
// Для сумісності з існуючим кодом, який використовує fetch-style синтаксис
interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: string
  headers?: Record<string, string>
  signal?: AbortSignal
}

export async function api<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, signal } = options
  
  const config = {
    method,
    url,
    data: body ? JSON.parse(body) : undefined,
    headers,
    signal,
  }
  
  const response = await $api.request<any>(config)
  return extractResponseData<T>(response.data)
}

// === Compatibility Layer (Для сумісності з рештою проекту) ===

// Обгортки для методів (щоб не міняти код у всіх файлах)
export const apiGet = async <T>(url: string, config?: any): Promise<T> => {
  const response = await $api.get<any>(url, config)
  return extractResponseData<T>(response.data)
}

// Попередньо оновлюємо CSRF перед POST/PUT/DELETE (на випадок якщо токен застарів)
const ensureCsrfToken = async (): Promise<string> => {
  let token = getCsrfFromCookie()
  
  if (!token) {
    token = await fetchCsrfToken()
  }
  
  return token || ''
}

export const apiPost = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  await ensureCsrfToken()
  const response = await $api.post<any>(url, data, config)
  return extractResponseData<T>(response.data)
}

export const apiPut = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  await ensureCsrfToken()
  const response = await $api.put<any>(url, data, config)
  return extractResponseData<T>(response.data)
}

export const apiDelete = async <T>(url: string, config?: any): Promise<T> => {
  await ensureCsrfToken()
  const response = await $api.delete<any>(url, config)
  return extractResponseData<T>(response.data)
}

// Об'єкт http для зручності
export const http = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
}
