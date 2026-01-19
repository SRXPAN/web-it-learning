import React, { useState, useEffect } from 'react'
import { X, AlignLeft, Link as LinkIcon, Video, FileText } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import { LoadingButton } from '@/components/LoadingButton'
import type { Material, Lang } from '@elearn/shared'

interface MaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void // Callback to refresh parent list
  lessonId: string // ID теми/уроку, до якого додається матеріал
  type: string // 'TEXT' | 'VIDEO' | 'PDF' | 'LINK'
  material?: Material | null // Якщо є - редагування, інакше - створення
  lang: Lang // Поточна мова інтерфейсу для дефолтного заповнення
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lessonId,
  type,
  material,
  lang
}) => {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Визначаємо тип контенту для UI
  const isText = type.toUpperCase() === 'TEXT'
  const isUrl = ['VIDEO', 'PDF', 'LINK'].includes(type.toUpperCase())

  useEffect(() => {
    if (isOpen) {
      // Заповнюємо форму даними матеріалу або очищаємо
      if (material) {
        setTitle(material.title || '')
        setContent(material.content || material.url || '')
      } else {
        setTitle('')
        setContent('')
      }
      setError(null)
    }
  }, [isOpen, material])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Формуємо payload.
      // Для MVP дублюємо контент для всіх мов, якщо це створення.
      // В ідеалі бекенд має приймати просто title/content, а кеші будувати сам.
      const payload = {
        topicId: lessonId,
        type: type.toUpperCase(),
        title, // Бекенд має оновити titleCache для поточної мови або дефолтної
        [isText ? 'content' : 'url']: content,
        // Опціонально: передаємо кеші, якщо бекенд їх вимагає явно
        titleCache: { [lang]: title, EN: title }, 
        ...(isText 
          ? { contentCache: { [lang]: content, EN: content } } 
          : { urlCache: { [lang]: content, EN: content } }
        )
      }

      if (material?.id) {
        await api(`/editor/materials/${material.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        await api('/editor/materials', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }

      onSave()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || t('common.error'))
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

  // Іконка в залежності від типу
  const Icon = isText ? AlignLeft : type.toUpperCase() === 'VIDEO' ? Video : type.toUpperCase() === 'PDF' ? FileText : LinkIcon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]">
        
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

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t('editor.label.title')} <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introduction to Binary Search"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isText ? t('editor.label.content') : t('editor.label.url')} <span className="text-red-500">*</span>
            </label>
            
            {isText ? (
              <textarea
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all min-h-[200px] font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Markdown is supported..."
                required
                disabled={isLoading}
              />
            ) : (
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 pl-10 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://example.com/resource"
                  type="url"
                  required
                  disabled={isLoading}
                />
                <LinkIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            )}
            {!isText && (
              <p className="text-xs text-neutral-500 mt-1.5">
                {type.toUpperCase() === 'VIDEO' 
                  ? 'Supported: YouTube links or direct video files (mp4, webm)' 
                  : 'Link to an external resource or PDF file'}
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