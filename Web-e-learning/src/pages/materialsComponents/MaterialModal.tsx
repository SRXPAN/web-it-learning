import { memo, useEffect, useState } from 'react'
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

interface MaterialModalProps {
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

export const MaterialModal = memo(function MaterialModal({
  material,
  lessonId,
  preselectedType,
  onClose,
  onSave,
}: MaterialModalProps) {
  const { t } = useTranslation()
  const [activeLang, setActiveLang] = useState<Lang>('EN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditMode = !!material?.id

  const [formData, setFormData] = useState<MaterialFormState>({
    EN: { title: '', url: '', content: '' },
    UA: { title: '', url: '', content: '' },
    PL: { title: '', url: '', content: '' },
    type: (preselectedType as any) || material?.type || 'VIDEO'
  })

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

  const updateField = (field: 'title' | 'url' | 'content', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value }
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.EN.title.trim() || !formData.UA.title.trim()) {
      setError('Title required in English and Ukrainian')
      return
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
        await api.put(`/editor/materials/${material.id}`, payload)
      } else {
        await api.post('/editor/materials', payload)
      }

      onSave?.()
      onClose()
    } catch (err: any) {
      console.error('Save failed:', err)
      setError(err?.response?.data?.message || 'Failed to save material')
    } finally {
      setLoading(false)
    }
  }

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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
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

        <form onSubmit={handleSave} className="flex-1 overflow-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
            {(['EN', 'UA', 'PL'] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
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

          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('editor.label.type')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['VIDEO', 'TEXT', 'pdf', 'link'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('editor.label.title')} ({activeLang}) *
            </label>
            <input
              type="text"
              value={currentData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('editor.label.title')}
              className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

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
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

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
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-vertical"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
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
          </div>
        </form>
      </div>
    </div>
  )
})
