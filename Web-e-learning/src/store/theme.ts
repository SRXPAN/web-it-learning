import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (theme: Theme) => void
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      set: (t) => {
        applyTheme(t)
        set({ theme: t })
      },
      toggle: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        applyTheme(newTheme)
        set({ theme: newTheme })
      },
    }),
    {
      name: 'elearn_theme',
      onRehydrateStorage: () => (state) => {
        // Застосовуємо тему при завантаженні сторінки
        if (state) applyTheme(state.theme)
      }
    }
  )
)