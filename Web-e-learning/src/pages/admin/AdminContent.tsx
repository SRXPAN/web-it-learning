/**
 * Admin Content Management Page  
 * Edit Topics, Materials, Quizzes with translations
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { type TranslationKey } from '@/i18n/types'
import { useAdminContent } from '@/hooks/useAdmin'
import MaterialsTab from '@/pages/editor/MaterialsTab'
import QuizzesTab from '@/pages/editor/QuizzesTab'
import {
  BookOpen,
  FolderTree,
  FileText,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  RefreshCw,
} from 'lucide-react'
import { Loading } from '@/components/Loading'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface Topic {
  id: string
  slug: string
  name: string
  nameJson?: { UA?: string; PL?: string; EN?: string }
  description: string
  descJson?: { UA?: string; PL?: string; EN?: string }
  category: string
  status: string
  parentId: string | null
  _count?: {
    materials: number
    quizzes: number
    children: number
  }
  children?: Topic[]
}

type ContentTab = 'topics' | 'materials' | 'quizzes'

export default function AdminContent() {
  const { t, lang } = useTranslation()
  const tx = (key: TranslationKey, fallback: string) => {
    const val = t(key)
    return val === key ? fallback : val
  }
  const [activeTab, setActiveTab] = useState<ContentTab>('topics')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  
  // Use admin content hook
  const {
    topics,
    loading,
    error,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    publishTopic,
    unpublishTopic,
  } = useAdminContent()
  
  // Edit state
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Topic | null>(null)

  const flattenedTopics = useMemo(() => {
    const result: Array<{ id: string; label: string }> = []
    const walk = (items?: Topic[], prefix = '') => {
      if (!items) return
      for (const item of items) {
        const label = prefix ? `${prefix} / ${item.name}` : item.name
        result.push({ id: item.id, label })
        if (item.children?.length) {
          walk(item.children, label)
        }
      }
    }
    const roots = (topics || []).filter(t => !t.parentId)
    walk(roots)
    return result
  }, [topics])

  useEffect(() => {
    if (!selectedTopicId && flattenedTopics.length) {
      setSelectedTopicId(flattenedTopics[0].id)
    }
  }, [flattenedTopics, selectedTopicId])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handlePublish = async (topicId: string, publish: boolean) => {
    try {
      if (publish) {
        await publishTopic(topicId)
      } else {
        await unpublishTopic(topicId)
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteTopic(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const renderTopicRow = (topic: Topic, level = 0) => {
    const hasChildren = topic._count?.children && topic._count.children > 0
    const isExpanded = expandedIds.has(topic.id)
    
    return (
      <div key={topic.id}>
        <div 
          className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50`}
          style={{ paddingLeft: `${16 + level * 24}px` }}
        >
          {/* Expand button */}
          <button
            onClick={() => toggleExpand(topic.id)}
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
              !hasChildren ? 'invisible' : ''
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Topic info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {topic.nameJson?.[lang as 'UA' | 'PL' | 'EN'] || topic.name}
              </span>
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                {topic.slug}
              </code>
              {topic.nameJson && (
                <span title="Has translations">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className={`px-1.5 py-0.5 rounded ${
                topic.category === 'Programming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                topic.category === 'Databases' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {topic.category}
              </span>
              <span>{topic._count?.materials || 0} materials</span>
              <span>{topic._count?.quizzes || 0} quizzes</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            {topic.status === 'Published' ? (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Eye className="w-3.5 h-3.5" /> Published
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <EyeOff className="w-3.5 h-3.5" /> Draft
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePublish(topic.id, topic.status !== 'Published')}
              className={`p-1.5 rounded ${
                topic.status === 'Published' 
                  ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                  : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
              title={topic.status === 'Published' ? 'Unpublish' : 'Publish'}
            >
              {topic.status === 'Published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditingTopic(topic)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteConfirm(topic)}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {isExpanded && topic.children?.map(child => renderTopicRow(child, level + 1))}
      </div>
    )
  }

  if (loading && (!topics || topics.length === 0)) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7" />
            {tx('admin.content', 'Контент')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tx('admin.contentDescription', 'Керування темами, матеріалами та вікторинами')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => setShowCreateTopic(true)}
            className="px-4 py-2 min-h-[40px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {tx('admin.createTopic', 'Створити тему')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {([
          { id: 'topics', icon: FolderTree, label: tx('admin.topicsTab', 'Topics') },
          { id: 'materials', icon: FileText, label: tx('admin.materialsTab', 'Materials') },
          { id: 'quizzes', icon: HelpCircle, label: tx('admin.quizzesTab', 'Quizzes') },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Topics Tree */}
      {activeTab === 'topics' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">{tx('admin.topicHierarchy', 'Ієрархія тем')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tx('admin.topicHierarchyHint', 'Розгортай, редагуй, публікуй теми')}</p>
            </div>
            <button
              onClick={fetchTopics}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              {t('common.refresh')}
            </button>
          </div>
          
          {!topics || topics.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {tx('admin.noTopics', 'Ще немає тем. Створи першу тему!')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {topics.filter(t => !t.parentId).map(topic => renderTopicRow(topic))}
            </div>
          )}
        </div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              {tx('admin.materialsHint', 'Оберіть тему для матеріалів')}
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="min-w-[220px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            >
              {!selectedTopicId && <option value="">{tx('admin.selectTopic', 'Виберіть тему')}</option>}
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
            <button
              onClick={() => setActiveTab('topics')}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <FolderTree className="w-4 h-4" />
              {tx('admin.openTopics', 'Відкрити теми')}
            </button>
          </div>

          <MaterialsTab topicId={selectedTopicId || undefined} />
        </div>
      )}

      {/* Quizzes Tab */}
      {activeTab === 'quizzes' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {tx('admin.quizzesHint', 'Оберіть тему для вікторин')}
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="min-w-[220px] px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            >
              {!selectedTopicId && <option value="">{tx('admin.selectTopic', 'Виберіть тему')}</option>}
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
            <button
              onClick={() => setActiveTab('topics')}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <FolderTree className="w-4 h-4" />
              {tx('admin.openTopics', 'Відкрити теми')}
            </button>
          </div>

          <QuizzesTab topicId={selectedTopicId || undefined} />
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
        <TopicEditModal
          topic={editingTopic}
          topics={topics}
          onClose={() => setEditingTopic(null)}
          onSave={() => setEditingTopic(null)}
          onUpdate={updateTopic}
        />
      )}

      {/* Create Topic Modal */}
      {showCreateTopic && (
        <TopicEditModal
          topics={topics}
          onClose={() => setShowCreateTopic(false)}
          onSave={() => setShowCreateTopic(false)}
          onCreate={createTopic}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          title="Delete Topic"
          description={`Are you sure you want to delete "${deleteConfirm.name}"? This will also delete all materials and quizzes under this topic.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  )
}

// Topic Edit Modal Component
function TopicEditModal({ 
  topic, 
  topics, 
  onClose, 
  onSave,
  onCreate,
  onUpdate,
}: { 
  topic?: Topic
  topics: Topic[]
  onClose: () => void
  onSave: () => void
  onCreate?: (data: {
    slug: string
    name: string
    nameJson?: Record<string, string>
    description?: string
    descJson?: Record<string, string>
    category?: string
    parentId?: string | null
  }) => Promise<unknown>
  onUpdate?: (id: string, data: Record<string, unknown>) => Promise<unknown>
}) {
  const [form, setForm] = useState({
    slug: topic?.slug || '',
    name: topic?.name || '',
    nameUA: topic?.nameJson?.UA || '',
    namePL: topic?.nameJson?.PL || '',
    nameEN: topic?.nameJson?.EN || '',
    description: topic?.description || '',
    descUA: topic?.descJson?.UA || '',
    descPL: topic?.descJson?.PL || '',
    descEN: topic?.descJson?.EN || '',
    category: topic?.category || 'Programming',
    parentId: topic?.parentId || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = [
    'Programming', 'Mathematics', 'Databases', 'Networks', 
    'WebDevelopment', 'MobileDevelopment', 'MachineLearning', 
    'Security', 'DevOps', 'OperatingSystems'
  ]

  const handleSave = async () => {
    if (!form.slug || !form.name) {
      setError('Slug and name are required')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const data = {
        slug: form.slug,
        name: form.name,
        nameJson: { UA: form.nameUA, PL: form.namePL, EN: form.nameEN },
        description: form.description,
        descJson: { UA: form.descUA, PL: form.descPL, EN: form.descEN },
        category: form.category,
        parentId: form.parentId || null,
      }

      if (topic && onUpdate) {
        await onUpdate(topic.id, data)
      } else if (onCreate) {
        await onCreate(data)
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {topic ? 'Edit Topic' : 'Create Topic'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                placeholder="my-topic"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Parent Topic (optional)
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            >
              <option value="">None (root topic)</option>
              {(topics || []).filter(t => t.id !== topic?.id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Name Translations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name * (with translations)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-8 text-xs text-gray-500">EN</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Topic name (default)"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-xs text-gray-500">🇺🇦</span>
                <input
                  type="text"
                  value={form.nameUA}
                  onChange={(e) => setForm({ ...form, nameUA: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Назва українською"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 text-xs text-gray-500">🇵🇱</span>
                <input
                  type="text"
                  value={form.namePL}
                  onChange={(e) => setForm({ ...form, namePL: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Nazwa po polsku"
                />
              </div>
            </div>
          </div>

          {/* Description Translations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (with translations)
            </label>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-8 text-xs text-gray-500 pt-2">EN</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Description (default)"
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="w-8 text-xs text-gray-500 pt-2">🇺🇦</span>
                <textarea
                  value={form.descUA}
                  onChange={(e) => setForm({ ...form, descUA: e.target.value })}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Опис українською"
                />
              </div>
              <div className="flex items-start gap-2">
                <span className="w-8 text-xs text-gray-500 pt-2">🇵🇱</span>
                <textarea
                  value={form.descPL}
                  onChange={(e) => setForm({ ...form, descPL: e.target.value })}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="Opis po polsku"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
