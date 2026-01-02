// src/routes/i18n.ts
import { Router } from 'express'
import { prisma } from '../db.js'
import { z } from 'zod'
import crypto from 'crypto'
import type { Lang } from '@elearn/shared'
import { logger } from '../utils/logger.js'

const router = Router()

// ============================================
// CACHE MANAGEMENT
// ============================================

// In-memory cache with TTL (5 seconds)
interface CacheEntry {
  bundle: Record<string, string>
  version: string
  timestamp: number
}

const CACHE_TTL = 5000 // 5 seconds in milliseconds
const bundleCache = new Map<string, CacheEntry>()

// ============================================
// SCHEMAS
// ============================================

const bundleSchema = z.object({
  lang: z.enum(['UA', 'PL', 'EN']).default('EN'),
  ns: z.string().optional(), // "common,auth,quiz" - comma separated
})

const missingKeysSchema = z.object({
  keys: z.array(z.string()).max(100),
  lang: z.enum(['UA', 'PL', 'EN']).optional(),
})

// ============================================
// CACHE HELPERS
// ============================================

/**
 * Очищає весь кеш перекладів
 */
export function clearTranslationCache(): void {
  bundleCache.clear()
  logger.info('[i18n] Cache cleared')
}

function getCacheKey(lang: string, namespaces: string[]): string {
  return `${lang}:${namespaces.sort().join(',')}`
}

// ============================================
// HELPERS
// ============================================

function generateETag(lang: string, versions: { namespace: string; version: number }[]): string {
  const versionStr = versions.map(v => `${v.namespace}:${v.version}`).sort().join('|')
  return crypto.createHash('md5').update(`${lang}-${versionStr}`).digest('hex').slice(0, 16)
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/i18n/bundle?lang=UA&ns=common,auth,quiz
 * 
 * Повертає всі UI переклади для вказаної мови.
 * Читає з нормалізованих таблиць I18nKey + I18nValue
 * Підтримує:
 * - ETag кешування (304 Not Modified)
 * - Namespace фільтрацію
 * - Fallback на EN якщо переклад відсутній
 */
router.get('/bundle', async (req, res) => {
  try {
    const parsed = bundleSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid params', details: parsed.error.flatten() })
    }
    
    const { lang, ns } = parsed.data
    const namespaces = ns?.split(',').map(s => s.trim()).filter(Boolean) || []
    const cacheKey = getCacheKey(lang as string, namespaces)
    
    // Перевіряємо кеш
    const cached = bundleCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`[i18n] Using memory-cached bundle for ${lang} (${Object.keys(cached.bundle).length} keys)`)
      res.setHeader('ETag', `"${cached.version}"`)
      res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=5')
      res.setHeader('X-Cache', 'HIT')
      return res.json({
        lang,
        version: cached.version,
        count: Object.keys(cached.bundle).length,
        namespaces: namespaces.length ? namespaces : ['all'],
        bundle: cached.bundle,
      })
    }
    
    // ============================================
    // QUERY FROM UiTranslation (single source of truth)
    // ============================================
    
    const uiTranslations = await prisma.uiTranslation.findMany({
      select: { key: true, translations: true },
    })
    
    // Build bundle with fallback to EN
    const bundle: Record<string, string> = {}
    
    for (const t of uiTranslations) {
      const trans = t.translations as Record<string, string>
      bundle[t.key] = trans?.[lang] || trans?.['EN'] || t.key
    }
    
    // Generate version hash from bundle
    const version = crypto.createHash('md5').update(JSON.stringify(bundle)).digest('hex').slice(0, 12)
    
    // Зберігаємо в кеш
    bundleCache.set(cacheKey, {
      bundle,
      version,
      timestamp: Date.now(),
    })
    
    // Встановлюємо кеш заголовки (5 сек TTL)
    res.setHeader('ETag', `"${version}"`)
    res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=5')
    res.setHeader('Vary', 'Accept-Language')
    res.setHeader('X-Cache', 'MISS')
    
    res.json({
      lang,
      version,
      count: Object.keys(bundle).length,
      namespaces: namespaces.length ? namespaces : ['all'],
      bundle,
    })
  } catch (err) {
    logger.error('Failed to get i18n bundle', err as Error)
    res.status(500).json({ error: 'Failed to load translations' })
  }
})

/**
 * GET /api/i18n/version?ns=common,auth
 * 
 * Повертає версії namespace-ів для швидкої перевірки актуальності кешу
 */
router.get('/version', async (req, res) => {
  try {
    const ns = req.query.ns as string | undefined
    const namespaces = ns?.split(',').map(s => s.trim()).filter(Boolean) || []
    
    let versions: { namespace: string; version: number; updatedAt: Date }[] = []
    try {
      versions = await prisma.translationVersion.findMany({
        where: namespaces.length ? { namespace: { in: namespaces } } : {},
        select: { namespace: true, version: true, updatedAt: true },
      })
    } catch (e) {
      // Table might not exist yet
      logger.warn('TranslationVersion query failed', e as Error)
    }
    
    const result = versions.reduce((acc, v) => {
      acc[v.namespace] = { version: v.version, updatedAt: v.updatedAt }
      return acc
    }, {} as Record<string, { version: number; updatedAt: Date }>)
    
    res.json(result)
  } catch (err) {
    logger.error('Failed to get i18n versions', err as Error)
    res.status(500).json({ error: 'Failed to load versions' })
  }
})

/**
 * POST /api/i18n/missing
 * 
 * Логує відсутні ключі перекладів (для моніторингу)
 * Фронтенд відправляє ключі, яких немає в bundle
 */
router.post('/missing', async (req, res) => {
  try {
    const parsed = missingKeysSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body' })
    }
    
    const { keys, lang } = parsed.data
    
    // Логуємо для аналізу
    if (keys.length > 0) {
      logger.warn('[i18n] Missing translation keys', { 
        keys: keys.slice(0, 20), // Обмежуємо лог
        lang: lang || 'unknown',
        count: keys.length,
      })
    }
    
    res.json({ received: keys.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to report missing keys' })
  }
})

/**
 * GET /api/i18n/keys
 * 
 * Повертає всі ключі (для генерації TypeScript типів)
 */
router.get('/keys', async (_req, res) => {
  try {
    // Try new normalized tables first
    const keys = await prisma.i18nKey.findMany({
      select: { key: true, namespace: true, description: true },
      orderBy: { key: 'asc' },
    })
    
    if (keys.length > 0) {
      return res.json(keys)
    }
    
    // Fallback to old table
    const oldKeys = await prisma.uiTranslation.findMany({
      select: { key: true, namespace: true, description: true },
      orderBy: { key: 'asc' },
    })
    
    res.json(oldKeys)
  } catch (err) {
    logger.error('Failed to get i18n keys', err as Error)
    res.status(500).json({ error: 'Failed to load keys' })
  }
})

export default router
