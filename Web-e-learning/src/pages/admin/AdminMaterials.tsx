/**
 * Admin Materials Management - embedded editor
 */
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, FolderTree, RefreshCw } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAdminContent } from '@/hooks/useAdmin'
import MaterialsTab from '@/pages/editor/MaterialsTab'

export default function AdminMaterials() {
  const { t } = useTranslation()
  const { topics, fetchTopics } = useAdminContent()
  const [selectedTopicId, setSelectedTopicId] = useState('')

  const flattenedTopics = useMemo(() => {
    const result: Array<{ id: string; label: string }> = []
    const walk = (items: typeof topics | undefined, prefix = '') => {
      if (!items) return
      for (const item of items) {
        const label = prefix ? `${prefix} / ${item.name}` : item.name
        result.push({ id: item.id, label })
        if (item.children?.length) walk(item.children, label)
      }
    }
    walk((topics || []).filter(t => !t.parentId))
    return result
  }, [topics])

  useEffect(() => {
    if (!selectedTopicId && flattenedTopics.length) {
      setSelectedTopicId(flattenedTopics[0].id)
    }
  }, [flattenedTopics, selectedTopicId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-blue-600" />
            {t('editor.tab.materials')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.contentDescription')}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            {t('admin.materialsHint')}
          </label>
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="min-w-[220px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          >
            {!selectedTopicId && <option value="">{t('admin.selectTopic')}</option>}
            {flattenedTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            onClick={fetchTopics}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh')}
          </button>
        </div>

        <MaterialsTab topicId={selectedTopicId || undefined} />
      </div>
    </div>
  )
}
