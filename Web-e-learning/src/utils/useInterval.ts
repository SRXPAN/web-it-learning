import { useEffect, useRef } from 'react'

/**
 * Hook for intervals that works correctly with React state/props
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval
  useEffect(() => {
    if (delay === null) return

    const tick = () => {
      savedCallback.current()
    }

    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay])
}