import { useEffect } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { http } from '@/lib/http'

export function useActivityTracker() {
  const { user } = useAuth()

  useEffect(() => {
    // Якщо користувач не залогінений, не трекаємо активність
    if (!user) return

    const sendHeartbeat = async () => {
      // Трекаємо тільки якщо вкладка активна
      if (document.visibilityState === 'hidden') return

      try {
        // Відправляємо "пінг" на сервер. 
        // Бекенд сам розрахує час сесії та оновить streak.
        await http.post('/activity/ping', {})
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