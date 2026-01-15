import { apiGet, apiPost } from '@/lib/http'
import type { Option, Question, Quiz, QuizSubmitResult, QuizAnswer, Lang } from '@elearn/shared'

// Re-export types for backward compatibility
export type { Option, Question, Quiz }

// Extended result type for frontend (includes legacy fields)
export type SubmitResult = QuizSubmitResult & {
  correctIds?: Record<string, string>
}

export const fetchQuiz = (id: string, lang?: Lang) => {
  const url = lang ? `/quiz/${id}?lang=${lang}` : `/quiz/${id}`
  return apiGet<Quiz>(url)
}
export const submitQuizAttempt = (id: string, body: { answers: QuizAnswer[]; lang?: Lang; token?: string }) =>
  apiPost<SubmitResult>(`/quiz/${id}/submit`, body)
