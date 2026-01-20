import type { TopicTree, Material as BaseMaterial, Category, QuizLite, LocalizedString } from '@elearn/shared'

export type { Category, QuizLite, LocalizedString }

// Розширюємо Material для фронтенд-логіки (відстеження переглядів)
export interface Material extends BaseMaterial {
  isSeen?: boolean
  createdAt?: string
  updatedAt?: string
}

// Розширюємо TopicTree для фронтенд-логіки
export interface TopicNode extends Omit<TopicTree, 'materials'> {
  // Ці поля має повертати API
  totalMaterials?: number
  viewedMaterials?: number
  progress?: number // 0-100
  parentId?: string | null
  materials: Material[]
}

export type Tab = 'ALL' | 'PDF' | 'VIDEO' | 'TEXT' | 'LINK'

export const DEFAULT_CAT: Category = 'Programming'

export const getCategoryLabel = (cat: Category, _lang?: string) => {
  // Проста мапа, або можна використати t()
  return cat
}