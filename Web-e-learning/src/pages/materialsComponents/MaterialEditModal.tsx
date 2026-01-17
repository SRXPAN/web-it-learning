import { memo, useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { http as api } from '@/lib/http'
import { useTranslation } from '@/i18n/useTranslation'

type Lang = 'EN' | 'UA' | 'PL'

interface MaterialData {
  id?: string
  title: string
  type: 'VIDEO' | 'TEXT' | 'pdf' | 'link'
  url?: string | null
  content?: string | null
  titleCache?: Record<string, string> | null
  urlCache?: Record<string, string> | null
  contentCache?: Record<string, string> | null
}

interface MaterialEditModalProps {
  material?: MaterialData | null
  lessonId: string
  preselectedType?: 'VIDEO' | 'TEXT' | 'pdf' | 'link'
  onClose: () => void
  onSave?: () => void
}

interface MaterialFormState {
  EN: { title: string; url: string; content: string }
  UA: { title: string; url: string; content: string }
  PL: { title: string; url: string; content: string }
  type: 'VIDEO' | 'TEXT' | 'pdf' | 'link'
}

const ERROR_MESSAGES = {
  invalidUrl: (lang: Lang, url: string) => `Invalid URL for ${lang}: ${url}`,
  saveFailed: 'Failed to save material. Please try again.',
  titleRequired: 'Title required in English and Ukrainian'
} as const

export const MaterialEditModal = memo(function MaterialEditModal({
  material,
  lessonId,
  preselectedType,
  onClose,
  onSave,
}: MaterialEditModalProps) {
  const { t } = useTranslation()
  const [activeLang, setActiveLang] = useState<Lang>('EN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine if we're in edit mode
  const isEditMode = !!material?.id

  // Initialize form state
  const [formData, setFormData] = useState<MaterialFormState>({
    EN: { title: '', url: '', content: '' },
    UA: { title: '', url: '', content: '' },
    PL: { title: '', url: '', content: '' },
    type: (preselectedType as any) || material?.type || 'VIDEO'
  })

  // Load material data if editing
  useEffect(() => {
    if (material) {
      setFormData({
        EN: {
          title: material.titleCache?.EN || material.title || '',
          url: material.urlCache?.EN || material.url || '',
          content: material.contentCache?.EN || material.content || ''
        },
        UA: {
          title: material.titleCache?.UA || '',
          url: material.urlCache?.UA || '',
          content: material.contentCache?.UA || ''
        },
        PL: {
          title: material.titleCache?.PL || '',
          url: material.urlCache?.PL || '',
          content: material.contentCache?.PL || ''
        },
        type: material.type || 'VIDEO'
      })
    }
  }, [material])

  // URL validation helper
  const isValidUrl = (str: string) => {
    if (!str) return true // Empty is OK
    try { 
      new URL(str)
      return true
    } catch(e) { 
      return false
    }
  }

  // Helper to update specific field for active language
  const updateField = (field: 'title' | 'url' | 'content', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value }
    }))
  }

  // Save handler
  const handleSave = async () => {
    setError(null)

    // Validate titles
    if (!formData.EN.title.trim() || !formData.UA.title.trim()) {
      setError(ERROR_MESSAGES.titleRequired)
      return
    }

    // Validate URLs if present
    for (const lang of ['EN', 'UA', 'PL'] as Lang[]) {
      const urlValue = formData[lang].url
      if (urlValue && !isValidUrl(urlValue)) {
        setError(ERROR_MESSAGES.invalidUrl(lang, urlValue))
        return
      }
    }

    setLoading(true)

    try {
      const payload = {
        topicId: lessonId,
        type: formData.type,
        titleCache: {
          EN: formData.EN.title,
          UA: formData.UA.title,
          PL: formData.PL.title || formData.EN.title
        },
        urlCache: formData.type !== 'TEXT' ? {
          EN: formData.EN.url || null,
          UA: formData.UA.url || null,
          PL: formData.PL.url || null
        } : null,
        contentCache: formData.type === 'TEXT' ? {
          EN: formData.EN.content,
          UA: formData.UA.content,
          PL: formData.PL.content || formData.EN.content
        } : null
      }

      if (isEditMode && material?.id) {
        // Update existing material
        await api.put(`/editor/materials/${material.id}`, payload)
      } else {
        // Create new material
        await api.post('/editor/materials', payload)
      }

      onSave?.()
      onClose()
    } catch (err: any) {
      console.error('Save failed:', err)
      setError(err?.response?.data?.message || ERROR_MESSAGES.saveFailed)
    } finally {
      setLoading(false)
    }
  }

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose, loading])

  const currentData = formData[activeLang]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditMode ? t('editor.edit_material') : t('editor.add_material')}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Language Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            {(['EN', 'UA', 'PL'] as Lang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeLang === lang
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Type Selector (only if not editing) */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('editor.label.type')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['VIDEO', 'TEXT', 'pdf', 'link'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData((prev) => ({ ...prev, type }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.type === type
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('editor.label.title')} ({activeLang}) *
            </label>
            <input
              type="text"
              value={currentData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('editor.label.title')}
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {/* URL Input (for VIDEO, pdf, link) */}
          {formData.type !== 'TEXT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('editor.label.url')} ({activeLang})
              </label>
              <input
                type="url"
                value={currentData.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder={t('editor.placeholder.urlOptional')}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          )}

          {/* Content Textarea (for TEXT type) */}
          {formData.type === 'TEXT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('editor.label.content')} ({activeLang})
              </label>
              <textarea
                value={currentData.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder={t('editor.label.content')}
                rows={8}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-vertical"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save size={16} />
                {t('common.save')}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
})
