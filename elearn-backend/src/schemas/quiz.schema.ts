/**
 * Quiz Validation Schemas
 * Zod schemas for quiz creation, question management, and quiz submission
 */
import { z } from 'zod'
import { commonSchemas } from './common.schema.js'

/**
 * Question option schema (strict validation)
 */
const questionOptionSchema = z.object({
  id: z.string().cuid().optional(),
  text: z.string().min(1, 'Option text required').max(1000),
  textJson: z.record(z.string()).optional(),
  correct: z.boolean().default(false), // Changed from isCorrect to match Prisma schema
})

export type QuestionOption = z.infer<typeof questionOptionSchema>

/**
 * Create question schema
 */
export const createQuestionSchema = z.object({
  quizId: z.string().cuid('Invalid quiz ID'),
  text: z.string().min(5, 'Question must be at least 5 characters').max(1000),
  textJson: z.record(z.string()).optional(),
  type: z.enum(['single', 'multiple']).default('single'),
  options: z
    .array(questionOptionSchema)
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
  explanation: z.string().max(2000).optional(),
  explanationJson: z.record(z.string()).optional(),
})

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>

/**
 * Update question schema
 */
export const updateQuestionSchema = createQuestionSchema.partial()

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>

/**
 * Create quiz schema
 */
export const createQuizSchema = z.object({
  topicId: z.string().cuid('Invalid topic ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  titleJson: z.record(z.string()).optional(),
  description: z.string().max(2000).optional(),
  descJson: z.record(z.string()).optional(),
  type: z.enum(['PRACTICE', 'EXAM']).default('PRACTICE'),
  passingScore: z
    .number()
    .int()
    .min(0, 'Passing score must be at least 0')
    .max(100, 'Passing score cannot exceed 100')
    .default(70),
  timeLimit: z.number().int().positive().optional(),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showCorrectAnswers: z.boolean().default(true),
  randomizationSeed: z.string().optional(),
})

export type CreateQuizInput = z.infer<typeof createQuizSchema>

/**
 * Update quiz schema
 */
export const updateQuizSchema = createQuizSchema.partial()

export type UpdateQuizInput = z.infer<typeof updateQuizSchema>

/**
 * Quiz answer submission schema
 */
export const quizAnswerSchema = z.object({
  questionId: z.string().cuid('Invalid question ID'),
  optionId: z.string().cuid().optional(),
  selectedOptions: z.array(z.string().cuid()).optional(),
})

export type QuizAnswer = z.infer<typeof quizAnswerSchema>

/**
 * Submit quiz schema
 */
export const submitQuizSchema = z.object({
  token: z.string().min(1, 'Quiz token required'),
  answers: z
    .array(quizAnswerSchema)
    .min(1, 'At least one answer required'),
  lang: commonSchemas.lang.optional(),
  timeSpent: z.number().int().min(0).optional(),
})

export type SubmitQuizInput = z.infer<typeof submitQuizSchema>

/**
 * Quiz ID parameter schema
 */
export const quizIdParamSchema = z.object({
  id: z.string().cuid('Invalid quiz ID'),
})

export type QuizIdParam = z.infer<typeof quizIdParamSchema>

/**
 * Quiz pagination schema
 */
export const quizPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  topicId: z.string().cuid().optional(),
  type: z.enum(['PRACTICE', 'EXAM']).optional(),
  lang: commonSchemas.lang.optional(),
})

export type QuizPaginationInput = z.infer<typeof quizPaginationSchema>

/**
 * All quiz schemas
 */
export const quizSchemas = {
  createQuestion: createQuestionSchema,
  updateQuestion: updateQuestionSchema,
  createQuiz: createQuizSchema,
  updateQuiz: updateQuizSchema,
  submitQuiz: submitQuizSchema,
  idParam: quizIdParamSchema,
  pagination: quizPaginationSchema,
}