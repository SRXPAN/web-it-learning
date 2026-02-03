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
    }
  }
  
  return config
})

// === Response Interceptor (Error Handling & Refresh) ===
$api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 1. Обробка 401 (Unauthorized) - Оновлення токена
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

    // 2. Глобальна обробка помилок (Toast)
    const status = error.response?.status
    const data = error.response?.data as any
    const message = data?.message || data?.error || error.message || 'Something went wrong'

    // Не показувати тост, якщо це 401 (бо ми перенаправляємо) або 429
    if (status !== 401 && status !== 429) {
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
  
  const response = await $api.request<T>(config)
  return response.data
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
  const response = await $api.get<T>(url, config)
  return response.data
}

export const apiPost = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  const response = await $api.post<T>(url, data, config)
  return response.data
}

export const apiPut = async <T>(url: string, data?: any, config?: any): Promise<T> => {
  const response = await $api.put<T>(url, data, config)
  return response.data
}

export const apiDelete = async <T>(url: string, config?: any): Promise<T> => {
  const response = await $api.delete<T>(url, config)
  return response.data
}

// Об'єкт http для зручності
export const http = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
}
