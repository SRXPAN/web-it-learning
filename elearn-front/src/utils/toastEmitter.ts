// src/utils/toastEmitter.ts
// Lightweight event emitter for global toast notifications

export type ToastType = 'success' | 'error' | 'info'

export interface ToastEvent {
  message: string
  type: ToastType
}

const TOAST_EVENT = 'app:toast'

/**
 * Dispatch a toast notification globally
 * Can be called from anywhere (including outside React components)
 */
export function dispatchToast(message: string, type: ToastType = 'info'): void {
  const safeMessage = typeof message === 'string' && message.trim() ? message : 'Something went wrong'
  
  const event = new CustomEvent<ToastEvent>(TOAST_EVENT, {
    detail: { message: safeMessage, type }
  })
  
  window.dispatchEvent(event)
}

/**
 * Subscribe to toast events
 * Returns unsubscribe function
 */
export function subscribeToToasts(callback: (event: ToastEvent) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<ToastEvent>
    callback(customEvent.detail)
  }
  
  window.addEventListener(TOAST_EVENT, handler)
  return () => window.removeEventListener(TOAST_EVENT, handler)
}

// Convenience methods
export const toast = {
  success: (message: string) => dispatchToast(message, 'success'),
  error: (message: string) => dispatchToast(message, 'error'),
  info: (message: string) => dispatchToast(message, 'info'),
}
