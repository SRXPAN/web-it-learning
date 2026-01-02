// src/__tests__/i18n.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockI18nKeyFindMany = vi.fn()
const mockTranslationVersionFindMany = vi.fn()
const mockUiTranslationFindMany = vi.fn()

vi.mock('../db.js', () => ({
  prisma: {
    i18nKey: { findMany: () => mockI18nKeyFindMany() },
    translationVersion: { findMany: () => mockTranslationVersionFindMany() },
    uiTranslation: { findMany: () => mockUiTranslationFindMany() },
  },
}))

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import express from 'express'
import request from 'supertest'
import i18nRouter from '../routes/i18n.js'

const app = express()
app.use(express.json())
app.use('/i18n', i18nRouter)

describe('GET /i18n/bundle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return translations bundle for UA', async () => {
    // Mock data
    mockTranslationVersionFindMany.mockResolvedValue([
      { namespace: 'common', version: 1 },
    ])
    
    mockI18nKeyFindMany.mockResolvedValue([
      { 
        key: 'common.loading', 
        values: [
          { lang: 'UA', value: 'Завантаження...' },
          { lang: 'EN', value: 'Loading...' },
        ] 
      },
      { 
        key: 'nav.dashboard', 
        values: [
          { lang: 'UA', value: 'Дашборд' },
          { lang: 'EN', value: 'Dashboard' },
        ] 
      },
    ])

    const res = await request(app).get('/i18n/bundle?lang=UA')
    
    expect(res.status).toBe(200)
    expect(res.body.lang).toBe('UA')
    expect(res.body.count).toBe(2)
    expect(res.body.bundle).toEqual({
      'common.loading': 'Завантаження...',
      'nav.dashboard': 'Дашборд',
    })
  })

  it('should fallback to EN when translation missing', async () => {
    mockTranslationVersionFindMany.mockResolvedValue([
      { namespace: 'common', version: 1 },
    ])
    
    mockI18nKeyFindMany.mockResolvedValue([
      { 
        key: 'common.test', 
        values: [
          { lang: 'EN', value: 'English only' },
          // No PL value
        ] 
      },
    ])

    const res = await request(app).get('/i18n/bundle?lang=PL')
    
    expect(res.status).toBe(200)
    expect(res.body.bundle['common.test']).toBe('English only')
  })

  it('should return 304 with matching ETag', async () => {
    mockTranslationVersionFindMany.mockResolvedValue([
      { namespace: 'common', version: 1 },
    ])
    
    mockI18nKeyFindMany.mockResolvedValue([
      { key: 'test.key', values: [{ lang: 'EN', value: 'Test' }] },
    ])

    // First request to get ETag
    const first = await request(app).get('/i18n/bundle?lang=EN')
    const etag = first.headers['etag']
    
    // Second request with If-None-Match
    const second = await request(app)
      .get('/i18n/bundle?lang=EN')
      .set('If-None-Match', etag)
    
    expect(second.status).toBe(304)
  })

  it('should filter by namespace', async () => {
    mockTranslationVersionFindMany.mockResolvedValue([
      { namespace: 'auth', version: 1 },
    ])
    
    mockI18nKeyFindMany.mockResolvedValue([
      { 
        key: 'auth.login', 
        values: [{ lang: 'EN', value: 'Login' }] 
      },
    ])

    const res = await request(app).get('/i18n/bundle?lang=EN&ns=auth')
    
    expect(res.status).toBe(200)
    expect(res.body.namespaces).toEqual(['auth'])
    expect(res.body.bundle['auth.login']).toBe('Login')
  })

  it('should set Cache-Control headers', async () => {
    mockTranslationVersionFindMany.mockResolvedValue([])
    mockI18nKeyFindMany.mockResolvedValue([])
    mockUiTranslationFindMany.mockResolvedValue([])

    const res = await request(app).get('/i18n/bundle?lang=EN')
    
    expect(res.headers['cache-control']).toContain('max-age=300')
    expect(res.headers['vary']).toBe('Accept-Language')
  })
})
