// src/services/ai.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as pdfParse from 'pdf-parse'
import { YoutubeTranscript } from 'youtube-transcript'
import { getGeminiApiKey, isGeminiConfigured } from '../utils/env.js'
import { AppError } from '../utils/AppError.js'
import { logger } from '../utils/logger.js'
import type { Difficulty } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export type ContentSourceType = 'text' | 'pdf' | 'youtube'
export type QuizLanguage = 'UA' | 'EN' | 'PL'

export interface GeneratedOption {
  text: string
  isCorrect: boolean
}

export interface GeneratedQuestion {
  text: string
  explanation: string
  difficulty: Difficulty
  options: GeneratedOption[]
}

export interface GeneratedQuiz {
  title: string
  questions: GeneratedQuestion[]
}

interface GeminiQuizResponse {
  title: string
  questions: Array<{
    text: string
    explanation: string
    difficulty?: string
    options: Array<{
      text: string
      isCorrect: boolean
    }>
  }>
}

// ============================================
// AI SERVICE CLASS
// ============================================

class AiService {
  private genAI: GoogleGenerativeAI | null = null

  /**
   * Initialize Google Generative AI client lazily
   */
  private getGeminiClient(): GoogleGenerativeAI {
    if (!isGeminiConfigured()) {
      throw AppError.internal('Gemini API is not configured. Please set GEMINI_API_KEY environment variable.')
    }

    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(getGeminiApiKey()!)
    }

    return this.genAI
  }

  /**
   * Check if AI features are available
   */
  isAvailable(): boolean {
    return isGeminiConfigured()
  }

  /**
   * Extract text content from various sources
   * @param source - The content source (text, PDF buffer as base64, or YouTube URL)
   * @param type - The type of source: 'text', 'pdf', or 'youtube'
   * @returns Extracted text content
   */
  async extractText(source: string, type: ContentSourceType): Promise<string> {
    switch (type) {
      case 'text':
        return this.extractFromText(source)
      
      case 'pdf':
        return this.extractFromPdf(source)
      
      case 'youtube':
        return this.extractFromYoutube(source)
      
      default:
        throw AppError.badRequest(`Unsupported content type: ${type}`)
    }
  }

  /**
   * Return text as-is (with basic sanitization)
   */
  private extractFromText(text: string): string {
    if (!text || typeof text !== 'string') {
      throw AppError.badRequest('Text content is required')
    }

    const trimmed = text.trim()
    if (trimmed.length < 50) {
      throw AppError.badRequest('Text content is too short. Please provide at least 50 characters.')
    }

    if (trimmed.length > 100000) {
      throw AppError.badRequest('Text content is too long. Maximum 100,000 characters allowed.')
    }

    return trimmed
  }

  /**
   * Extract text from PDF buffer (base64 encoded)
   */
  private async extractFromPdf(base64Data: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '')
      const buffer = Buffer.from(base64Clean, 'base64')

      if (buffer.length === 0) {
        throw AppError.badRequest('PDF data is empty')
      }

      if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
        throw AppError.badRequest('PDF file is too large. Maximum 10MB allowed.')
      }

      // pdf-parse exports default function - handle both CJS and ESM
      const parsePdf = (pdfParse as any).default || pdfParse
      const data = await parsePdf(buffer)
      const text = data.text?.trim()

      if (!text || text.length < 50) {
        throw AppError.badRequest('Could not extract enough text from PDF. Please ensure the PDF contains readable text.')
      }

      logger.info(`PDF parsed successfully: ${data.numpages} pages, ${text.length} characters`)
      return text

    } catch (error) {
      if (error instanceof AppError) throw error
      
      logger.error('PDF parsing error:', error)
      throw AppError.badRequest('Failed to parse PDF file. Please ensure it is a valid PDF document.')
    }
  }

  /**
   * Extract transcript from YouTube video
   */
  private async extractFromYoutube(url: string): Promise<string> {
    try {
      // Validate YouTube URL
      const videoId = this.extractYoutubeVideoId(url)
      if (!videoId) {
        throw AppError.badRequest('Invalid YouTube URL. Please provide a valid YouTube video URL.')
      }

      logger.info(`Fetching transcript for YouTube video: ${videoId}`)

      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

      if (!transcriptItems || transcriptItems.length === 0) {
        throw AppError.badRequest('Could not fetch transcript. The video may not have captions available.')
      }

      // Combine transcript items into full text
      const text = transcriptItems
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (text.length < 50) {
        throw AppError.badRequest('Transcript is too short. Please use a video with more spoken content.')
      }

      logger.info(`YouTube transcript fetched: ${transcriptItems.length} segments, ${text.length} characters`)
      return text

    } catch (error) {
      if (error instanceof AppError) throw error

      logger.error('YouTube transcript error:', error)
      throw AppError.badRequest('Failed to fetch YouTube transcript. Please ensure the video exists and has captions enabled.')
    }
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  private extractYoutubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Clean JSON response from Gemini (remove markdown code blocks)
   * Gemini often wraps responses in ```json ... ```
   */
  private cleanJson(text: string): string {
    let cleaned = text.trim()
    
    // Remove markdown code blocks
    // Pattern: ```json\n...\n``` or ```\n...\n```
    const codeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/
    const match = cleaned.match(codeBlockPattern)
    if (match) {
      cleaned = match[1].trim()
    }
    
    // Also try to extract JSON if there's text before/after
    const jsonStartIndex = cleaned.indexOf('{')
    const jsonEndIndex = cleaned.lastIndexOf('}')
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
      cleaned = cleaned.substring(jsonStartIndex, jsonEndIndex + 1)
    }
    
    return cleaned
  }

  /**
   * Generate a quiz from text content using Google Gemini
   * @param content - The text content to generate quiz from
   * @param language - Target language for the quiz (UA, EN, PL)
   * @returns Generated quiz structure matching Prisma schema
   */
  async generateQuiz(content: string, language: QuizLanguage = 'EN'): Promise<GeneratedQuiz> {
    const genAI = this.getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Truncate content if too long
    const maxContentLength = 30000
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...[content truncated]'
      : content

    const languageNames: Record<QuizLanguage, string> = {
      UA: 'Ukrainian',
      EN: 'English',
      PL: 'Polish',
    }

    const prompt = `You are an experienced teacher creating educational quizzes. Analyze the following text and generate a quiz with exactly 5 questions.

RULES:
1. Questions should test understanding of key concepts from the text
2. Each question must have exactly 4 options
3. Only ONE option should be correct per question
4. Provide a brief explanation for why the correct answer is correct
5. Vary difficulty: include 2 Easy, 2 Medium, and 1 Hard question
6. Write all content in ${languageNames[language]}
7. Return ONLY raw JSON without any markdown formatting or code blocks

OUTPUT FORMAT (strictly follow this JSON structure):
{
  "title": "Quiz title based on content topic",
  "questions": [
    {
      "text": "Question text?",
      "explanation": "Explanation of why the correct answer is correct",
      "difficulty": "Easy",
      "options": [
        { "text": "Option A", "isCorrect": false },
        { "text": "Option B", "isCorrect": true },
        { "text": "Option C", "isCorrect": false },
        { "text": "Option D", "isCorrect": false }
      ]
    }
  ]
}

TEXT TO ANALYZE:
${truncatedContent}`

    try {
      logger.info(`Generating quiz with Gemini (language: ${language}, content length: ${truncatedContent.length})`)

      const result = await model.generateContent(prompt)
      const response = await result.response
      const responseText = response.text()

      if (!responseText) {
        throw AppError.internal('Gemini returned empty response')
      }

      // Clean and parse the response
      const cleanedJson = this.cleanJson(responseText)
      const quiz = this.parseQuizResponse(cleanedJson)
      
      logger.info(`Quiz generated successfully: "${quiz.title}" with ${quiz.questions.length} questions`)
      return quiz

    } catch (error) {
      if (error instanceof AppError) throw error

      // Handle Gemini-specific errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Gemini API error:', errorMessage)
      
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
        throw AppError.internal('Gemini API key is invalid. Please check your configuration.')
      }
      if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('quota')) {
        throw AppError.internal('Gemini API rate limit exceeded. Please try again later.')
      }
      if (errorMessage.includes('SAFETY')) {
        throw AppError.badRequest('Content was blocked by safety filters. Please try different content.')
      }

      logger.error('Quiz generation error:', error)
      throw AppError.internal('Failed to generate quiz. Please try again.')
    }
  }

  /**
   * Parse and validate Gemini response JSON
   */
  private parseQuizResponse(jsonString: string): GeneratedQuiz {
    let parsed: GeminiQuizResponse

    try {
      parsed = JSON.parse(jsonString)
    } catch (error) {
      logger.error('Failed to parse Gemini JSON response:', jsonString.substring(0, 500))
      throw AppError.internal('Failed to parse quiz response. The AI returned invalid JSON format. Please try again.')
    }

    // Validate structure
    if (!parsed.title || typeof parsed.title !== 'string') {
      throw AppError.internal('Invalid quiz response: missing title')
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw AppError.internal('Invalid quiz response: missing questions')
    }

    // Validate and transform questions
    const questions: GeneratedQuestion[] = parsed.questions.map((q, index) => {
      if (!q.text || typeof q.text !== 'string') {
        throw AppError.internal(`Invalid question ${index + 1}: missing text`)
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw AppError.internal(`Invalid question ${index + 1}: insufficient options`)
      }

      // Validate options
      const options: GeneratedOption[] = q.options.map((opt, optIndex) => {
        if (!opt.text || typeof opt.text !== 'string') {
          throw AppError.internal(`Invalid option ${optIndex + 1} in question ${index + 1}`)
        }
        return {
          text: opt.text.trim(),
          isCorrect: !!opt.isCorrect,
        }
      })

      // Ensure exactly one correct answer
      const correctCount = options.filter(o => o.isCorrect).length
      if (correctCount !== 1) {
        logger.warn(`Question ${index + 1} has ${correctCount} correct answers, fixing...`)
        // Fix: set first option as correct if none, or keep only first correct
        if (correctCount === 0) {
          options[0].isCorrect = true
        } else if (correctCount > 1) {
          let foundFirst = false
          for (const opt of options) {
            if (opt.isCorrect) {
              if (foundFirst) {
                opt.isCorrect = false
              } else {
                foundFirst = true
              }
            }
          }
        }
      }

      // Map difficulty
      const difficultyMap: Record<string, Difficulty> = {
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',
      }
      const rawDifficulty = (q.difficulty || 'medium').toLowerCase()
      const difficulty: Difficulty = difficultyMap[rawDifficulty] || 'Medium'

      return {
        text: q.text.trim(),
        explanation: (q.explanation || '').trim(),
        difficulty,
        options,
      }
    })

    return {
      title: parsed.title.trim(),
      questions,
    }
  }
}

// Export singleton instance
export const aiService = new AiService()
