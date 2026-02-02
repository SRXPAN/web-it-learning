// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api, fetchCsrfToken } from '../lib/http'
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

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Отримуємо CSRF токен (потрібен для POST/PUT/DELETE)
        await fetchCsrfToken().catch(err => console.warn('CSRF init warning:', err))
        
        // 2. Перевіряємо сесію (HttpOnly Cookie)
        // Якщо токен валідний, бекенд поверне об'єкт User
        const userData = await api<User>('/auth/me')
        setUser(userData)
      } catch (err) {
        // 401 Unauthorized або мережева помилка -> користувач не залогінений
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  async function login(email: string, password: string): Promise<void> {
    // Бекенд повертає { user: User, accessToken, refreshToken }
    const response = await api<AuthResponse & { accessToken?: string; refreshToken?: string }>('/auth/login', { 
      method: 'POST', 
      body: JSON.stringify({ email, password }), 
    })
    
    // TEMPORARY: Store tokens in localStorage for cross-domain auth
    if (response.accessToken) {
      localStorage.setItem('access_token', response.accessToken)
    }
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken)
    }
    
    setUser(response.user)
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    // After registration, DO NOT set user - they need to verify email first
    // The response is returned but we don't authenticate them yet
    await api<AuthResponse>('/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ name, email, password }), 
    })
    // Keep user as null until they verify email or log in
  }

  async function logout(): Promise<void> {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Clear localStorage tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      // Опціонально: повне перезавантаження, щоб очистити кеш стану додатка
      // window.location.href = '/login'
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
