// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api, apiPost, fetchCsrfToken } from '../lib/http'
import type { User, AuthResponse } from '@packages/shared'

// Re-export User type for convenience
export type { User }

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

const AuthCtx = createContext<AuthState | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('AuthContext not found')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Prevent double initialization (React StrictMode)
    if (initialized) return
    
    let isMounted = true
    
    const initAuth = async () => {
      try {
        // 1. Отримуємо CSRF токен (потрібен для POST/PUT/DELETE)
        await fetchCsrfToken().catch(err => console.warn('CSRF init warning:', err))
        
        // 2. Перевіряємо сесію (HttpOnly Cookie)
        // Якщо токен валідний, бекенд поверне об'єкт User
        const userData = await api<User>('/auth/me')
        if (isMounted) {
          setUser(userData)
        }
      } catch (err) {
        // 401 Unauthorized або мережева помилка -> користувач не залогінений
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initAuth()
    
    return () => {
      isMounted = false
    }
  }, [initialized])

  async function login(email: string, password: string): Promise<void> {
    // Бекенд повертає { user: User, accessToken, refreshToken }
    const response = await apiPost<AuthResponse & { accessToken?: string; refreshToken?: string }>('/auth/login', { email, password })
    
    // TEMPORARY: Store tokens in localStorage for cross-domain auth
    if (response.accessToken) {
      localStorage.setItem('access_token', response.accessToken)
    }
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken)
    }
    
    // Set user first
    setUser(response.user)
    
    // Refresh CSRF token after login (new session = new CSRF)
    // Add a small delay to ensure cookies are set properly before fetching CSRF
    await new Promise(resolve => setTimeout(resolve, 100))
    await fetchCsrfToken().catch(err => console.warn('CSRF refresh warning:', err))
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    // Register and get user data back
    const response = await apiPost<AuthResponse & { accessToken?: string; refreshToken?: string }>('/auth/register', { name, email, password })
    
    // TEMPORARY: Store tokens in localStorage for cross-domain auth (same as login)
    if (response.accessToken) {
      localStorage.setItem('access_token', response.accessToken)
    }
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken)
    }
    
    // Set user - backend already set auth cookies
    setUser(response.user)
    
    // Refresh CSRF token after registration (don't block navigation)
    setTimeout(() => {
      fetchCsrfToken().catch(err => console.warn('CSRF refresh warning:', err))
    }, 100)
  }

  async function logout(): Promise<void> {
    // Clear user state immediately to prevent any further API calls
    setUser(null)
    
    try {
      // Try to logout on backend, but don't block on failure
      await apiPost('/auth/logout', {})
    } catch (error) {
      // Silently handle logout errors - session will be cleared anyway
      console.warn('Backend logout failed (session cleared locally):', error)
    } finally {
      // Clear localStorage tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      
      // Wait for React to finish rendering before any navigation
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  async function refresh(): Promise<void> {
    try {
      const u = await api<User>('/auth/me')
      setUser(u)
    } catch {
      setUser(null)
    }
  }

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  const value = useMemo(() => ({ 
    user, 
    loading, 
    login, 
    register, 
    logout, 
    refresh,
    updateUser 
  }), [user, loading, updateUser])
  
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
