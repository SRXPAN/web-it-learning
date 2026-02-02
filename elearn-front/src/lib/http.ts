import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { dispatchToast } from '@/utils/toastEmitter'

// Визначаємо API URL
const envUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')
export const API_URL = envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`

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

// === Response Interceptor ===
$api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Якщо це 401 на /me і ми вже на /login - ігноруємо (щоб не було циклу)
    if (error.response?.status === 401 && window.location.pathname === '/login') {
        return Promise.reject(error)
    }

    // Логіка Refresh Token
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
        
        // Redirect ONLY if not already on login page
        if (window.location.pathname !== '/login') {
            // Використовуємо replace, щоб не було кнопки "Назад"
            window.location.replace('/login')
        }
        
        return Promise.reject(refreshError)
      }
    }

    // Глобальний Toast (крім 401/403/429)
    const status = error.response?.status
    if (status !== 401 && status !== 403 && status !== 429) {
       // Безпечний виклик тоста
       try {
         const data = error.response?.data as any
         const message = data?.message || data?.error || 'Request failed'
         if (typeof dispatchToast === 'function') {
            dispatchToast(typeof message === 'string' ? message : 'Error', 'error')
         }
       } catch (e) {
         console.error(e)
       }
    }

    return Promise.reject(error)
  }
)

export default $api

// === Fetch-style API wrapper ===
// This is used by many components for fetch-like syntax
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

// === Compatibility Layer ===
export const fetchCsrfToken = async (): Promise<string> => {
  try {
    await $api.get('/auth/csrf')
    return getCsrfFromCookie() || ''
  } catch (e) {
    return ''
  }
}

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

export const http = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
}
