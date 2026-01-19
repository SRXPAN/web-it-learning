// Web-e-learning/src/i18n/i18nLoader.ts
/**
 * Lazy loader for i18n bundles
 * * Dynamically loads language-specific translation JSON files
 * instead of bundling them all together in the main JS file.
 */

import type { TranslationKey } from './types'
import type { Lang } from '@elearn/shared'

// Type for loaded bundle
export type TranslationBundle = Partial<Record<TranslationKey, string>>

/**
 * Load language bundle from JSON file
 */
export async function loadLanguageBundle(lang: Lang): Promise<TranslationBundle> {
  try {
    // Dynamic import based on language code
    // Vite will automatically code-split these files
    const module = await import(`./locales/${lang.toLowerCase()}.json`)
    
    // Extract default export (JSON content)
    return module.default || module
  } catch (error) {
    console.error(`[i18n] Failed to load language bundle for ${lang}:`, error)
    
    // Fallback to English if load fails and we are not already trying to load English
    if (lang !== 'EN') {
      console.warn('[i18n] Falling back to English bundle')
      return loadLanguageBundle('EN')
    }
    
    return {}
  }
}

/**
 * Preload multiple language bundles in parallel
 */
export async function preloadLanguages(langs: Lang[]): Promise<Record<string, TranslationBundle>> {
  const promises = langs.map(lang => 
    loadLanguageBundle(lang).then(bundle => ({ lang, bundle }))
  )
  
  const results = await Promise.all(promises)
  const bundles: Record<string, TranslationBundle> = {}
  
  for (const { lang, bundle } of results) {
    bundles[lang] = bundle
  }
  
  return bundles
}

/**
 * Get initial bundle for SSR or hydration
 */
export async function getInitialBundle(lang: Lang): Promise<TranslationBundle> {
  try {
    return await loadLanguageBundle(lang)
  } catch {
    return {}
  }
}