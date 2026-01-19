import { useEffect, useMemo, useState } from 'react'
import { useInterval } from '@/utils/useInterval'
import type { Quiz, QuizSubmitResult } from '@elearn/shared'

type QuizMode = 'practice' | 'exam'

type Params = {
  quiz?: Quiz
  mode: QuizMode
  onSubmit: (answers: { questionId: string; optionId: string }[]) => Promise<QuizSubmitResult | void>
}

export function useQuizSession({ quiz, mode, onSubmit }: Params) {
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(0)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // State for answers and results
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>({})
  const [correctMap, setCorrectMap] = useState<Record<string, string>>({})
  const [explanationMap, setExplanationMap] = useState<Record<string, string>>({})
  
  // UI State
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)

  // Initialize session when quiz loads
  useEffect(() => {
    if (quiz) {
      setLeft(quiz.durationSec)
      setIdx(0)
      setFinished(false)
      setSelectedMap({})
      setCorrectMap({})
      setExplanationMap({})
      setShowExplanation(false)
      setScore(0)
    }
  }, [quiz?.id]) // Re-init only if ID changes

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
  }

  return {
    idx,
    setIdx, // Expose setter for direct navigation
    left,
    score,
    finished,
    submitting,
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
    setShowExplanation,
  }
}