import { create } from 'zustand'
import { api } from '@/lib/http'
import type { Topic, Quiz, Lang } from '@elearn/shared'

// Розширюємо Topic для фронтенду, якщо потрібно (наприклад, для рекурсії, якщо вона не явна в shared)
export interface TopicTree extends Topic {
  children?: TopicTree[]
}

type CatalogState = {
  topics: TopicTree[]
  loading: boolean // renamed from topicsLoading for standard naming
  error?: string   // renamed from topicsError
  lang?: Lang      // Track which lang was used to load
  
  // Квізи кешуємо окремо
  quizMap: Record<string, Quiz>
  quizLoading: Record<string, boolean>
  quizError: Record<string, string | undefined>
  
  loadTopics: (lang?: Lang) => Promise<void>
  loadQuiz: (id: string, lang?: Lang) => Promise<Quiz>
  invalidateTopics: () => void
  invalidateQuiz: (id: string) => void
  invalidateAll: () => void
}

const useCatalogStore = create<CatalogState>((set, get) => ({
  topics: [],
  loading: false,
  error: undefined,
  lang: undefined,
  quizMap: {},
  quizLoading: {},
  quizError: {},
  
  async loadTopics(lang) {
    const state = get()
    // Якщо вже вантажиться або дані є для цієї мови — не чіпаємо
    if (state.loading) return
    if (state.topics.length > 0 && state.lang === lang) return
    
    set({ loading: true, error: undefined })
    
    try {
      // Використовуємо новий API клієнт
      const query = lang ? `?lang=${lang}` : ''
      const data = await api<TopicTree[]>(`/topics/tree${query}`)
      set({ topics: data, loading: false, lang })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load topics'
      set({ loading: false, error: message })
      // Не кидаємо помилку далі, щоб UI просто показав стан помилки, а не крашнувся
      console.error(e)
    }
  },
  
  async loadQuiz(id, lang) {
    const cacheKey = lang ? `${id}_${lang}` : id
    const state = get()
    
    // Повертаємо з кешу, якщо є
    const cached = state.quizMap[cacheKey]
    if (cached) return cached
    
    // Якщо вже вантажиться цей квіз - ігноруємо
    if (state.quizLoading[id]) throw new Promise(() => {}) // Hacky way to suspend/wait, but usually better to just return undefined
    
    set((s) => ({ 
      quizLoading: { ...s.quizLoading, [id]: true }, 
      quizError: { ...s.quizError, [id]: undefined } 
    }))
    
    try {
      const query = lang ? `?lang=${lang}` : ''
      const q = await api<Quiz>(`/quizzes/${id}${query}`)
      
      set((s) => ({ 
        quizMap: { ...s.quizMap, [cacheKey]: q }, 
        quizLoading: { ...s.quizLoading, [id]: false } 
      }))
      return q
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load quiz'
      set((s) => ({ 
        quizLoading: { ...s.quizLoading, [id]: false }, 
        quizError: { ...s.quizError, [id]: message } 
      }))
      throw e
    }
  },
  
  invalidateTopics() {
    set({ topics: [], error: undefined, lang: undefined })
  },
  
  invalidateQuiz(id) {
    set((s) => {
      const newMap = { ...s.quizMap }
      // Видаляємо всі варіанти квіза (різні мови)
      Object.keys(newMap).forEach(key => {
        if (key === id || key.startsWith(`${id}_`)) {
          delete newMap[key]
        }
      })
      return { quizMap: newMap }
    })
  },
  
  invalidateAll() {
    set({ 
      topics: [], 
      loading: false, 
      error: undefined, 
      lang: undefined, 
      quizMap: {}, 
      quizError: {} 
    })
  },
}))

export default useCatalogStore