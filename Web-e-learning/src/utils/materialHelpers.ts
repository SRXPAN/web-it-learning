// Web-e-learning/src/utils/materialHelpers.ts
/**
 * Helper functions for material localization
 * 
 * Selects the correct material URL/content based on user's language preference
 * with intelligent fallback logic
 */

import type { Lang } from '@elearn/shared'

/**
 * Get material URL in user's preferred language
 * 
 * Fallback priority:
 * 1. User's preferred language (UA, EN, PL)
 * 2. English (EN)
 * 3. Polish (PL)
 * 4. Fallback to direct URL field
 */
export function getMaterialUrl(
  material: {
    url?: string | null
    urlCache?: Record<string, string> | null
  },
  userLang: Lang = 'EN'
): string | null {
  // Try to get from cache first (multi-language URLs)
  if (material.urlCache && typeof material.urlCache === 'object') {
    const cache = material.urlCache as Record<string, string>
    
    // 1. Try user's language
    if (cache[userLang]) {
      return cache[userLang]
    }
    
    // 2. Fallback to English
    if (cache['EN']) {
      return cache['EN']
    }
    
    // 3. Fallback to first available language
    const firstUrl = Object.values(cache)[0]
    if (firstUrl) {
      return firstUrl
    }
  }
  
  // 4. Fallback to direct URL field
  return material.url || null
}

/**
 * Get material content in user's preferred language
 * 
 * Same fallback logic as getMaterialUrl
 */
export function getMaterialContent(
  material: {
    content?: string | null
    contentCache?: Record<string, string> | null
  },
  userLang: Lang = 'EN'
): string | null {
  // Try cache first
  if (material.contentCache && typeof material.contentCache === 'object') {
    const cache = material.contentCache as Record<string, string>
    
    if (cache[userLang]) {
      return cache[userLang]
    }
    
    if (cache['EN']) {
      return cache['EN']
    }
    
    const firstContent = Object.values(cache)[0]
    if (firstContent) {
      return firstContent
    }
  }
  
  // Fallback to direct content field
  return material.content || null
}

/**
 * Get material title in user's preferred language
 */
export function getMaterialTitle(
  material: {
    title?: string | null
    titleCache?: Record<string, string> | null
  },
  userLang: Lang = 'EN'
): string {
  // Try cache first
  if (material.titleCache && typeof material.titleCache === 'object') {
    const cache = material.titleCache as Record<string, string>
    
    if (cache[userLang]) {
      return cache[userLang]
    }
    
    if (cache['EN']) {
      return cache['EN']
    }
    
    const firstTitle = Object.values(cache)[0]
    if (firstTitle) {
      return firstTitle
    }
  }
  
  // Fallback to direct title field
  return material.title || 'Untitled Material'
}

/**
 * Get localized material content object
 * 
 * Returns an object with URL, content, and title all localized to user's language
 */
export function getLocalizedContent(
  material: {
    title?: string | null
    titleCache?: Record<string, string> | null
    url?: string | null
    urlCache?: Record<string, string> | null
    content?: string | null
    contentCache?: Record<string, string> | null
  },
  userLang: Lang = 'EN'
) {
  return {
    url: getMaterialUrl(material, userLang),
    content: getMaterialContent(material, userLang),
    title: getMaterialTitle(material, userLang),
  }
}
