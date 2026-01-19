import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '@elearn/shared'

export type { Lang }

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      lang: 'UA',
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'elearn_lang', // ключ в localStorage
    }
  )
)