import { apiGet } from '@/lib/http'
import type { Category, TopicTree, TopicLite, QuizLite, Material, Lang } from '@elearn/shared'

// Re-export types for backward compatibility
export type { Category, TopicTree, TopicLite, QuizLite, Lang }
export type MaterialNode = Material

const DEFAULT_CAT: Category = 'Programming'

// API response type (raw from backend)
interface TopicApiResponse {
  id: string
  name: string
  slug: string
  description?: string
  category?: Category
  children?: TopicApiResponse[]
  materials?: Material[]
  quizzes?: QuizLite[]
}

// Paginated response from API
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const normalizeTopic = (t: TopicApiResponse): TopicTree => ({
  ...t,
  category: (t?.category ?? DEFAULT_CAT) as Category,
  children: (t?.children ?? []).map(normalizeTopic),
  materials: t?.materials ?? [],
  quizzes: t?.quizzes ?? [],
})

export async function fetchTopicsTree(params?: { page?: number; limit?: number; category?: Category; lang?: Lang }): Promise<TopicTree[]> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.category) query.set('category', params.category)
  if (params?.lang) query.set('lang', params.lang)
  
  const queryString = query.toString()
  const url = queryString ? `/topics?${queryString}` : '/topics'
  
  // Handle both old (array) and new (paginated) response format
  const response = await apiGet<TopicTree[] | PaginatedResponse<TopicApiResponse> | { topics?: TopicApiResponse[] }>(url)
  
  // Shape: { topics, total, ... } (current backend)
  if (response && typeof response === 'object' && 'topics' in response) {
    const list = Array.isArray((response as any).topics) ? (response as any).topics : []
    return list.map(normalizeTopic)
  }

  // Paginated response: { data, pagination }
  if (response && typeof response === 'object' && 'data' in response && 'pagination' in response) {
    const list = Array.isArray((response as PaginatedResponse<TopicApiResponse>).data)
      ? (response as PaginatedResponse<TopicApiResponse>).data
      : []
    return list.map(normalizeTopic)
  }
  
  // Legacy array response
  if (Array.isArray(response)) return response.map(normalizeTopic)
  return []
}
