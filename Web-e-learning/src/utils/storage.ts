/**
 * Safely get JSON from localStorage
 */
export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return fallback
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error)
    return fallback
  }
}

/**
 * Safely set JSON to localStorage
 */
export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Failed to save localStorage key "${key}":`, error)
    return false
  }
}

/**
 * Safely remove from localStorage
 */
export function safeRemove(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error)
    return false
  }
}

// Storage keys constants
export const STORAGE_KEYS = {
  THEME: 'elearn_theme',
  LANGUAGE: 'elearn_lang',
} as const