import React, { useState, useEffect } from 'react'
import { X, AlignLeft, Link as LinkIcon, Video, FileText } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import { LoadingButton } from '@/components/LoadingButton'
import type { Material, Lang, LocalizedString } from '@elearn/shared'

interface MaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  lessonId: string
  type: string
  material?: Material | null
  lang: Lang
}

interface FormState {
  titleJson: LocalizedString
  contentJson: LocalizedString
  urlJson: LocalizedString
}

const EMPTY_FORM: FormState = {
  titleJson: { UA: '', PL: '', EN: '' },
  contentJson: { UA: '', PL: '', EN: '' },
  urlJson: { UA: '', PL: '', EN: '' }
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lessonId,
  type,
  material
}) => {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isText = type.toUpperCase() === 'TEXT'
  const languages: Lang[] = ['UA', 'PL', 'EN']

  // Заповнення форми при відкритті
  useEffect(() => {
    if (isOpen) {
      if (material) {
        setForm({
          titleJson: material.titleJson || EMPTY_FORM.titleJson,
          contentJson: material.contentJson || EMPTY_FORM.contentJson,
          urlJson: material.url ? { UA: material.url, PL: material.url, EN: material.url } : EMPTY_FORM.urlJson
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setError(null)
    }
  }, [isOpen, material])

  const handleFieldChange = (field: 'titleJson' | 'contentJson' | 'urlJson', langKey: Lang, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [langKey]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Перевірка обов'язкових полів
    const hasTitle = Object.values(form.titleJson).some(v => v?.trim())
    const hasContent = isText 
      ? Object.values(form.contentJson).some(v => v?.trim())
      : Object.values(form.urlJson).some(v => v?.trim())

    if (!hasTitle) {
      setError('Назва матеріалу обов\'язкова на хоча б одній мові')
      setIsLoading(false)
      return
    }
    if (!hasContent) {
      setError(isText ? 'Контент обов\'язковий на хоча б одній мові' : 'URL обов\'язковий на хоча б одній мові')
      setIsLoading(false)
      return
    }

    try {
      const payload: Record<string, any> = {
        topicId: lessonId,
        type: type.toUpperCase(),
        titleJson: form.titleJson
      }

      if (isText) {
        payload.contentJson = form.contentJson
      } else {
        payload.urlJson = form.urlJson
      }

      if (material?.id) {
        // Редагування
        await api(`/editor/materials/${material.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        // Створення
        await api('/editor/materials', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }

      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Помилка при збереженні матеріалу')
    } finally {
      setIsLoading(false)
    }
  }

  // Закриття по Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, isLoading])

  if (!isOpen) return null

  const Icon = isText ? AlignLeft : type.toUpperCase() === 'VIDEO' ? Video : type.toUpperCase() === 'PDF' ? FileText : LinkIcon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600 dark:text-primary-400">
              <Icon size={20} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {material ? t('editor.edit_material') : t('editor.add_material')}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Назва матеріалу на трьох мовах */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              {t('editor.label.title')} <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-neutral-500 ml-1">(На всіх мовах)</span>
            </label>
            <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
              {languages.map(langKey => (
                <div key={langKey} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-bold text-neutral-500 uppercase">{langKey}</span>
                  <input
                    className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                    value={form.titleJson[langKey] || ''}
                    onChange={(e) => handleFieldChange('titleJson', langKey, e.target.value)}
                    placeholder={`Назва матеріалу ${langKey === 'UA' ? 'українською' : langKey === 'PL' ? 'польською' : 'англійською'}`}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Контент або URL на трьох мовах */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              {isText ? t('editor.label.content') : t('editor.label.url')} <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-neutral-500 ml-1">(На всіх мовах)</span>
            </label>
            <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
              {languages.map(langKey => (
                <div key={langKey} className="flex items-start gap-2">
                  <span className="w-10 text-xs font-bold text-neutral-500 uppercase pt-2">{langKey}</span>
                  {isText ? (
                    <textarea
                      className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all min-h-[100px] font-mono resize-none"
                      value={form.contentJson[langKey] || ''}
                      onChange={(e) => handleFieldChange('contentJson', langKey, e.target.value)}
                      placeholder={`Контент матеріалу ${langKey === 'UA' ? 'українською' : langKey === 'PL' ? 'польською' : 'англійською'}...`}
                      disabled={isLoading}
                    />
                  ) : (
                    <input
                      className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                      value={form.urlJson[langKey] || ''}
                      onChange={(e) => handleFieldChange('urlJson', langKey, e.target.value)}
                      placeholder={`URL матеріалу ${langKey === 'UA' ? 'українською' : langKey === 'PL' ? 'польською' : 'англійською'}`}
                      type="url"
                      disabled={isLoading}
                    />
                  )}
                </div>
              ))}
            </div>
            {!isText && (
              <p className="text-xs text-neutral-500 mt-2">
                {type.toUpperCase() === 'VIDEO' 
                  ? 'Підтримуються: YouTube посилання або прямі посилання на відео (mp4, webm)' 
                  : 'Посилання на зовнішній ресурс або PDF файл'}
              </p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-3 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t('common.cancel')}
          </button>
          <LoadingButton
            onClick={handleSubmit}
            loading={isLoading}
            className="px-6"
          >
            {t('common.save')}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}

export default MaterialModal
