import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInterval } from '@/utils/useInterval'
import type { Quiz, QuizSubmitResult } from '@packages/shared'

type QuizMode = 'practice' | 'exam'

interface PersistedSession {
  idx: number
  selectedMap: Record<string, string>
  left: number
  savedAt: number
}

type Params = {
  quiz?: Quiz
  mode: QuizMode
  userId?: string
  onSubmit: (answers: { questionId: string; optionId: string }[]) => Promise<QuizSubmitResult | void>
}

function getStorageKey(quizId: string, userId: string): string {
  return `quiz_session_${quizId}_${userId}`
}

export function useQuizSession({ quiz, mode, userId, onSubmit }: Params) {
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(0)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  
  // State for answers and results
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({})
  const [correctMap, setCorrectMap] = useState<Record<string, string>>({})
  const [explanationMap, setExplanationMap] = useState<Record<string, string>>({})
  
  // UI State
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)

  // Storage key for this quiz session
  const storageKey = useMemo(() => {
    if (!quiz?.id || !userId) return null
    return getStorageKey(quiz.id, userId)
  }, [quiz?.id, userId])

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        console.warn('Failed to clear quiz session from localStorage:', e)
      }
    }
  }, [storageKey])

  // Load persisted session on mount
  useEffect(() => {
    if (!storageKey || !quiz) return
    
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: PersistedSession = JSON.parse(saved)
        // Check if session is not too old (max 2 hours)
        const maxAge = 2 * 60 * 60 * 1000
        if (Date.now() - parsed.savedAt < maxAge) {
          setIdx(parsed.idx)
          setSelectedMap(parsed.selectedMap)
          // Restore time left if in exam mode, otherwise use full duration
          if (mode === 'exam' && parsed.left > 0) {
            setLeft(parsed.left)
          } else {
            setLeft(quiz.durationSec)
          }
          return // Skip default initialization
        } else {
          // Session expired, clear it
          clearSession()
        }
      }
    } catch (e) {
      console.warn('Failed to load quiz session from localStorage:', e)
    }
    
    // Default initialization
    setLeft(quiz.durationSec)
    setIdx(0)
    setFinished(false)
    setSelectedMap({})
    setCorrectMap({})
    setExplanationMap({})
    setShowExplanation(false)
    setScore(0)
  }, [quiz?.id, storageKey]) // Re-init only if ID or key changes

  // Save session to localStorage when answers or index change
  useEffect(() => {
    if (!storageKey || finished || !quiz) return
    
    // Only save if there's actual progress
    if (Object.keys(selectedMap).length === 0 && idx === 0) return
    
    try {
      const session: PersistedSession = {
        idx,
        selectedMap,
        left,
        savedAt: Date.now()
      }
      localStorage.setItem(storageKey, JSON.stringify(session))
      
      // Show "Draft saved" indicator briefly
      setDraftSaved(true)
      const timer = setTimeout(() => setDraftSaved(false), 2000)
      return () => clearTimeout(timer)
    } catch (e) {
      console.warn('Failed to save quiz session to localStorage:', e)
    }
  }, [idx, selectedMap, left, storageKey, finished, quiz])

  // Timer logic
  useInterval(() => {
    if (!quiz || finished || mode === 'practice') return
    
    setLeft((s) => {
      if (s <= 1) {
        finish(true) // Auto-submit on timeout
        return 0
      }
      return s - 1
    })
  }, 1000)

  const unansweredCount = useMemo(
    () => (quiz ? quiz.questions.filter((q) => !selectedMap[q.id]).length : 0),
    [quiz, selectedMap]
  )
  
  const lowTime = mode === 'exam' && left <= 30 // Warning at 30s

  const selectOption = (questionId: string, optionId: string) => {
    if (finished) return
    setSelectedMap((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const next = () => {
    if (!quiz) return
    setShowExplanation(false)
    if (idx < quiz.questions.length - 1) {
      setIdx((i) => i + 1)
    } else {
      // If it's the last question in practice mode, maybe finish?
      // Or just stay there. For now, let's just finish if exam.
      if (mode === 'exam') finish(true)
    }
  }

  const prev = () => {
    if (idx > 0) {
      setShowExplanation(false)
      setIdx((i) => i - 1)
    }
  }

  const finish = async (submit: boolean) => {
    if (!quiz || finished || submitting) return
    
    setSubmitting(true)
    
    try {
      if (submit) {
        const answers = quiz.questions
          .map((q) => ({ questionId: q.id, optionId: selectedMap[q.id] ?? '' }))
          .filter((a) => a.optionId) // Filter out unanswered if any (though usually backend handles)
        
        const res = await onSubmit(answers)
        
        if (res) {
          setFinished(true)
          setScore(res.correct)
          
          if (res.correctMap) setCorrectMap(res.correctMap)
          if (res.solutions) setExplanationMap(res.solutions)
          
          // Clear localStorage after successful submission
          clearSession()
        }
      } else {
        // Just quit without submitting
        setFinished(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const checkAnswer = () => {
    if (mode !== 'practice') return
    setShowExplanation(true)
  }

  const reset = () => {
    if (!quiz) return
    setIdx(0)
    setScore(0)
    setFinished(false)
    setLeft(quiz.durationSec)
    setSelectedMap({})
    setCorrectMap({})
    setExplanationMap({})
    setShowExplanation(false)
    clearSession() // Clear localStorage on reset
  }

  return {
    idx,
    setIdx, // Expose setter for direct navigation
    left,
    score,
    finished,
    submitting,
    draftSaved,
    selectedMap,
    correctMap,
    explanationMap,
    showExplanation,
    unansweredCount,
    lowTime,
    selectOption,
    checkAnswer,
    next,
    prev,
    finish,
    reset,
    clearSession,
    setShowExplanation,
  }
}
