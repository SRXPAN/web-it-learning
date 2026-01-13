// Web-e-learning/src/i18n/i18nLoader.ts
/**
 * Lazy loader for i18n bundles
 * 
 * Dynamically loads language-specific translation JSON files
 * instead of bundling them all together in the main JS file.
 * 
 * This significantly reduces initial bundle size, especially
 * when users only need one language.
 */

import type { TranslationKey } from './types'

// Type for loaded bundle
export type TranslationBundle = Record<TranslationKey | string, string>

/**
 * Load language bundle from JSON file
 * 
 * Example:
 * const ua = await loadLanguage('UA')
 * const en = await loadLanguage('EN')
 */
export async function loadLanguageBundle(lang: 'UA' | 'EN' | 'PL'): Promise<TranslationBundle> {
  try {
    // Dynamic import based on language code
    // This tells Webpack/Vite to code-split these files
    const bundle = await import(`./locales/${lang.toLowerCase()}.json`)
    
    // Extract default export (the JSON object)
    return bundle.default || bundle
  } catch (error) {
    console.error(`[i18n] Failed to load language bundle for ${lang}:`, error)
    
    // Fallback to English if load fails
    if (lang !== 'EN') {
      return loadLanguageBundle('EN')
    }
    
    // Return empty object if even EN fails (shouldn't happen)
    return {}
  }
}

/**
 * Preload multiple language bundles in parallel
 * 
 * Example:
 * await preloadLanguages(['UA', 'EN', 'PL'])
 */
export async function preloadLanguages(langs: Array<'UA' | 'EN' | 'PL'>): Promise<Record<string, TranslationBundle>> {
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
 * 
 * Used in App initialization to provide immediate fallback
 * while full API bundle is loading
 */
export async function getInitialBundle(lang: 'UA' | 'EN' | 'PL'): Promise<TranslationBundle> {
  try {
    return await loadLanguageBundle(lang)
  } catch {
    // Return empty object - will fallback to useTranslation API
    return {}
  }
}
