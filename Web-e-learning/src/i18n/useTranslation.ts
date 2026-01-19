import { useI18n } from '@/store/i18n'
import type { TranslationKey } from './types'
import { create } from 'zustand'
import { useEffect, useCallback } from 'react'
import { api } from '@/lib/http'
import { loadLanguageBundle, type TranslationBundle } from './i18nLoader'
import type { Lang } from '@elearn/shared'

// API response type
type BundleResponse = {
  lang: string
  version: string
  count: number
  namespaces: string[]
  bundle: Record<string, string>
}

// LocalStorage keys for caching
const STORAGE_KEY_PREFIX = 'i18n_bundle_'
const STORAGE_VERSION_PREFIX = 'i18n_version_'

// Helper: load bundle from localStorage
function loadCachedBundle(lang: string): Record<string, string> | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PREFIX + lang)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

// Helper: save bundle to localStorage
function saveBundleToCache(lang: string, bundle: Record<string, string>, version: string) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + lang, JSON.stringify(bundle))
    localStorage.setItem(STORAGE_VERSION_PREFIX + lang, version)
  } catch (e) {
    console.warn('[i18n] Failed to cache bundle:', e)
  }
}

// Store for API translations
type TranslationsState = {
  bundles: Record<string, Record<string, string>> // lang -> key -> value
  localBundles: Record<string, TranslationBundle> // Local JSON fallback bundles
  versions: Record<string, string> // lang -> version
  loading: boolean
  initialized: boolean
  error: string | null
  fetchTranslations: (lang: string) => Promise<void>
  loadLocalBundle: (lang: Lang) => Promise<void>
  clearCache: () => void
}

export const useTranslationsStore = create<TranslationsState>((set, get) => ({
  bundles: {},
  localBundles: {},
  versions: {},
  loading: false,
  initialized: false,
  error: null,
  
  // Load local bundle (UA.json, EN.json, etc.)
  loadLocalBundle: async (lang: Lang) => {
    const state = get()
    if (state.localBundles[lang]) return // Already loaded

    try {
      const bundle = await loadLanguageBundle(lang)
      set(s => ({
        localBundles: { ...s.localBundles, [lang]: bundle }
      }))
    } catch (error) {
      console.error(`Failed to load local bundle for ${lang}:`, error)
    }
  },
  
  fetchTranslations: async (lang: string) => {
    const state = get()
    
    // Skip if already loaded for this language AND has content
    const existingBundle = state.bundles[lang]
    if (existingBundle && Object.keys(existingBundle).length > 0) {
      return
    }
    
    // Try localStorage cache first
    const cachedBundle = loadCachedBundle(lang)
    if (cachedBundle && Object.keys(cachedBundle).length > 0) {
      set(s => ({
        bundles: { ...s.bundles, [lang]: cachedBundle },
        initialized: true
      }))
      // Background refresh (optional, removed for MVP to save requests)
      // return 
    }
    
    set({ loading: true, error: null })
    try {
      // Use generic api client
      const response = await api<BundleResponse>(`/i18n/bundle?lang=${lang}`)
      const bundle = response.bundle || {}
      
      // Save to localStorage
      saveBundleToCache(lang, bundle, response.version)
      
      set(s => ({
        bundles: { ...s.bundles, [lang]: bundle },
        versions: { ...s.versions, [lang]: response.version },
        loading: false,
        initialized: true
      }))
    } catch (err) {
      // Try fallback to cache again if request failed
      const fallbackCached = loadCachedBundle(lang) || loadCachedBundle('EN')
      
      if (fallbackCached) {
        set(s => ({
          bundles: { ...s.bundles, [lang]: fallbackCached },
          loading: false,
          initialized: true,
          error: null
        }))
      } else {
        set({ loading: false, initialized: true, error: 'Failed to load translations' })
      }
    }
  },

  clearCache: () => {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(STORAGE_KEY_PREFIX) || k.startsWith(STORAGE_VERSION_PREFIX)) {
          localStorage.removeItem(k)
        }
      })
    } catch (e) {
      console.warn('[i18n] Failed to clear localStorage cache:', e)
    }
    set({ bundles: {}, versions: {}, initialized: false, error: null })
  }
}))

export function useTranslation() {
  const { lang, setLang } = useI18n()
  const { bundles, localBundles, loading, initialized, fetchTranslations, loadLocalBundle } = useTranslationsStore()
  
  // Load local bundle immediately for fast fallback
  useEffect(() => {
    loadLocalBundle(lang as Lang)
  }, [lang, loadLocalBundle])
  
  // Load translations from API on mount and when lang changes
  useEffect(() => {
    fetchTranslations(lang)
  }, [lang, fetchTranslations])
  
  const t = useCallback((key: TranslationKey, defaultValue?: string): string => {
    // 1. Try API bundle for current language (most up-to-date)
    const apiBundle = bundles[lang]
    if (apiBundle?.[key]) return apiBundle[key]
    
    // 2. Try local bundle for current language (fast fallback)
    const localBundle = localBundles[lang]
    if (localBundle?.[key]) return localBundle[key]!
    
    // 3. Fallback to EN API bundle
    if (lang !== 'EN') {
      const enApiBundle = bundles['EN']
      if (enApiBundle?.[key]) return enApiBundle[key]
    }
    
    // 4. Fallback to EN local bundle
    if (lang !== 'EN') {
      const enLocalBundle = localBundles['EN']
      if (enLocalBundle?.[key]) return enLocalBundle[key]!
    }
    
    // 5. Return default value or key as last resort
    return defaultValue || key
  }, [lang, bundles, localBundles])
  
  return { t, lang, setLang, loading, initialized }
}

// Hook to preload all translations (e.g. in Admin Panel)
export function usePreloadTranslations() {
  const { fetchTranslations } = useTranslationsStore()
  
  useEffect(() => {
    fetchTranslations('UA')
    fetchTranslations('PL')
    fetchTranslations('EN')
  }, [fetchTranslations])
}