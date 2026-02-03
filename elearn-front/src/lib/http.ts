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
function getCsrfFromCookie() {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'))
  return match ? match[2] : null
}

// === Request Interceptor ===
$api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Додаємо CSRF для мутуючих методів
  if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
    const csrfToken = getCsrfFromCookie()
    if (csrfToken && config.headers) {
      config.headers['x-csrf-token'] = csrfToken
    } else if (config.headers) {
      // Fallback: If no CSRF token found, fetch one before sending request
      // This ensures we always have a valid token for mutating requests
      console.warn('[CSRF] No token in cookie, request may fail. Token should be fetched during init.')
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
          // Отримуємо новий CSRF токен
          await fetchCsrfToken()
          // Встановлюємо новий токен у заголовок
          const newCsrfToken = getCsrfFromCookie()
          if (newCsrfToken && originalRequest.headers) {
            originalRequest.headers['x-csrf-token'] = newCsrfToken
          }
          // Повторюємо запит з новим токеном
          return $api.request(originalRequest)
        } catch (csrfError) {
          console.error('CSRF token refresh failed', csrfError)
          return Promise.reject(csrfError)
        }
      }
    }

    // 2. Обробка 401 (Unauthorized) - Оновлення токена
    if (error.response?.status === 401 && error.config && !originalRequest._retry) {
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
    const url = error.config?.url || ''
    const isActivityPing = url.includes('/activity/ping')
    const isLogout = url.includes('/auth/logout')
    const isCsrfRetry = (error.response?.data as any)?.error?.includes('CSRF')
    
    if (status !== 401 && status !== 429 && !(status === 403 && (isActivityPing || isCsrfRetry)) && !isLogout) {
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

// Функція для отримання CSRF токена (використовується в AuthContext)
export const fetchCsrfToken = async (): Promise<string> => {
  try {
    await $api.get('/auth/csrf')
    return getCsrfFromCookie() || ''
  } catch (e) {
    console.warn('CSRF Fetch Error', e)
    return ''
  }
}

// Обгортки для методів (щоб не міняти код у всіх файлах)
export const apiGet = async <T>(url: string, config?: any): Promise<T> => {
  const response = await $api.get<any>(url, config)
  return extractResponseData<T>(response.data)
}

// Попередньо оновлюємо CSRF перед POST/PUT/DELETE (на випадок якщо токен застарів)
const ensureCsrfToken = async () => {
  const token = getCsrfFromCookie()
  if (!token) {
    await fetchCsrfToken()
  }
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
