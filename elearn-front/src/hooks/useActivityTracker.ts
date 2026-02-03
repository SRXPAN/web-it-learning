import { useEffect } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { apiPost } from '@/lib/http'

// Helper: Get CSRF token from cookie
function getCsrfFromCookie() {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'))
  return match ? match[2] : null
}

export function useActivityTracker() {
  const { user } = useAuth()

  useEffect(() => {
    // Якщо користувач не залогінений, не трекаємо активність
    if (!user) return

    const sendHeartbeat = async () => {
      // Трекаємо тільки якщо вкладка активна
      if (document.visibilityState === 'hidden') return

      // Перевіряємо наявність CSRF токену перед відправкою
      const csrfToken = getCsrfFromCookie()
      if (!csrfToken) {
        // CSRF токен відсутній, пропускаємо пінг (це може статися одразу після логіну)
        return
      }

      try {
        // Відправляємо "пінг" на сервер (apiPost додає CSRF токен через interceptor)
        // Бекенд сам розрахує час сесії та оновить streak.
        await apiPost('/activity/ping', {})
      } catch (error) {
        // Ігноруємо помилки пінгу, щоб не спамити в консоль
      }
    }

    // 1. Відправляємо пінг одразу при заході
    sendHeartbeat()

    // 2. Відправляємо пінг кожні 60 секунд
    const interval = setInterval(sendHeartbeat, 60000)

    // 3. Відправляємо пінг, коли користувач повертається на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])
}
