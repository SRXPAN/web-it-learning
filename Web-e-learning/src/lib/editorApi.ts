import { apiGet, apiPost, apiPut, apiDelete } from './http'
import type { 
  Category, 
  Lang, 
  Material, 
  QuizLite,
  Question,
  Option,
  Difficulty,
  LocalizedString
} from '@elearn/shared'

// Editor-specific Topic type (extends shared Topic logic conceptually)
export type Topic = { 
  id: string
  slug: string
  name: string
  description?: string
  category: Category
  parentId?: string | null 
  // Add other properties needed for the UI tree view
  children?: Topic[] 
}

// Question with options for editor
export interface QuestionWithOptions extends Question {
  options: Option[]
}

// Create question request payload
export interface CreateQuestionRequest {
  text: string
  textJson?: LocalizedString
  explanation?: string
  explanationJson?: LocalizedString
  difficulty: Difficulty
  tags: string[]
  options: {
    text: string
    textJson?: LocalizedString
    correct: boolean
  }[]
}

// Re-export types for usage in components
export type { Category, Lang, Material, QuizLite, Question, Option }

// Helper wrapper to handle potential 404s gracefully during development
async function soft<T>(p: Promise<T>): Promise<T> {
  try { 
    return await p 
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Editor API error'
    // If endpoint is missing, throw readable error
    if (msg.includes('Not Found') || msg.includes('404')) {
      throw new Error('Endpoint is not ready yet')
    }
    throw e
  }
}

// ==========================================
// TOPICS - RESTful API
// ==========================================
export const listRootTopics = () => soft(apiGet<Topic[]>('/editor/topics'))
export const createTopic = (data: Partial<Topic>) => soft(apiPost<Topic, Partial<Topic>>('/editor/topics', data))
export const updateTopic = (id: string, data: Partial<Topic>) => soft(apiPut<Topic, Partial<Topic>>(`/editor/topics/${id}`, data))
export const deleteTopic = (id: string) => soft(apiDelete<{ok: true}>(`/editor/topics/${id}`))

// ==========================================
// MATERIALS - RESTful API
// ==========================================
export const listMaterials = (topicId: string) => soft(apiGet<Material[]>(`/editor/topics/${topicId}/materials`))
export const createMaterial = (topicId: string, data: Partial<Material>) =>
  soft(apiPost<Material, Partial<Material>>(`/editor/topics/${topicId}/materials`, data))
export const updateMaterial = (topicId: string, id: string, data: Partial<Material>) =>
  soft(apiPut<Material, Partial<Material>>(`/editor/topics/${topicId}/materials/${id}`, data))
export const deleteMaterial = (topicId: string, id: string) =>
  soft(apiDelete<{ok: true}>(`/editor/topics/${topicId}/materials/${id}`))

// ==========================================
// QUIZZES - RESTful API
// ==========================================
export const listQuizzes = (topicId: string) => soft(apiGet<QuizLite[]>(`/editor/topics/${topicId}/quizzes`))
export const createQuiz = (topicId: string, data: Partial<QuizLite>) =>
  soft(apiPost<QuizLite, Partial<QuizLite>>(`/editor/topics/${topicId}/quizzes`, data))
export const updateQuiz = (topicId: string, id: string, data: Partial<QuizLite>) =>
  soft(apiPut<QuizLite, Partial<QuizLite>>(`/editor/topics/${topicId}/quizzes/${id}`, data))
export const deleteQuiz = (topicId: string, id: string) =>
  soft(apiDelete<{ok: true}>(`/editor/topics/${topicId}/quizzes/${id}`))

// ==========================================
// QUESTIONS - RESTful API
// ==========================================
export const listQuestions = (quizId: string) =>
  soft(apiGet<QuestionWithOptions[]>(`/editor/quizzes/${quizId}/questions`))
export const createQuestion = (quizId: string, data: CreateQuestionRequest) =>
  soft(apiPost<QuestionWithOptions, CreateQuestionRequest>(`/editor/quizzes/${quizId}/questions`, data))
export const updateQuestion = (quizId: string, id: string, data: Partial<CreateQuestionRequest>) =>
  soft(apiPut<QuestionWithOptions, Partial<CreateQuestionRequest>>(`/editor/quizzes/${quizId}/questions/${id}`, data))
export const deleteQuestion = (quizId: string, id: string) =>
  soft(apiDelete<{ok: true}>(`/editor/quizzes/${quizId}/questions/${id}`))