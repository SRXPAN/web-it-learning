import type { Topic, Material, Category } from '@elearn/shared'

export type { Category, Material }

// Розширюємо Topic для фронтенд-логіки (деревоподібна структура)
export interface TopicNode extends Topic {
  children?: TopicNode[]
  materials?: Material[]
  // Ці поля має повертати API
  totalMaterials?: number
  viewedMaterials?: number
  progress?: number // 0-100
}

export type Tab = 'ALL' | 'PDF' | 'VIDEO' | 'TEXT' | 'LINK'

export const DEFAULT_CAT: Category = 'Programming'

export const getCategoryLabel = (cat: Category, lang: string) => {
  // Проста мапа, або можна використати t()
  return cat
}