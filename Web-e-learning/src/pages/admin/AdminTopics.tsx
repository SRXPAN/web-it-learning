/**
 * Admin Topics Management
 * Enhanced version of TopicsTab with AdminContent-style UI
 * Accessible by ADMIN and EDITOR roles
 */
import { useState } from 'react'
import { useAdminContent, type Topic as AdminTopic } from '@/hooks/useAdmin'
import { useTranslation } from '@/i18n/useTranslation'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Loader2,
  Globe,
  Search,
} from 'lucide-react'
import { Loading } from '@/components/Skeleton'
import { PageHeader } from '@/components/admin/PageHeader'

type TopicWithChildren = AdminTopic & {
  children?: TopicWithChildren[]
}

type TopicFormData = {
  name: string
  slug: string
  description?: string
  category?: string
  parentId?: string | null
  nameJson?: Record<string, string>
  descJson?: Record<string, string>
}

const CATEGORIES = ['Programming', 'Mathematics', 'Databases', 'Networks', 'Security', 'DevOps', 'Design', 'Other']

export default function AdminTopics() {
  const { t } = useTranslation()
  const { topics, loading, error, fetchTopics, createTopic, updateTopic, deleteTopic, publishTopic, unpublishTopic } = useAdminContent()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingTopic, setEditingTopic] = useState<AdminTopic | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<AdminTopic | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'UA' | 'PL' | 'EN'>('UA')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Build tree structure
  const buildTree = (items: AdminTopic[]): TopicWithChildren[] => {
    const map = new Map<string, TopicWithChildren>()
    const roots: TopicWithChildren[] = []

    items.forEach(item => {
      map.set(item.id, { ...item, children: [] })
    })

    items.forEach(item => {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePublishToggle = async (topic: AdminTopic) => {
    try {
      if (topic.status === 'Published') {
        await unpublishTopic(topic.id)
      } else {
        await publishTopic(topic.id)
      }
    } catch (err) {
      // Error handled by hook
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteTopic(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      // Error handled by hook
    }
  }

  const renderTopicNode = (topic: TopicWithChildren, level = 0) => {
    const hasChildren = topic.children && topic.children.length > 0
    const isExpanded = expandedIds.has(topic.id)

    return (
      <div key={topic.id}>
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button onClick={() => toggleExpand(topic.id)} className="text-gray-400 hover:text-gray-600">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          ) : (
            <div className="w-[18px]" />
          )}

          {/* Icon */}
          <BookOpen size={18} className="text-blue-600 flex-shrink-0" />

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {topic.nameJson?.UA || topic.name}
            </div>
            <div className="text-xs text-gray-500">
              {topic.slug} • {topic.category || 'Uncategorized'}
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              topic.status === 'Published'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {topic.status}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePublishToggle(topic)}
              className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              title={topic.status === 'Published' ? 'Unpublish' : 'Publish'}
            >
              {topic.status === 'Published' ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button
              onClick={() => setEditingTopic(topic)}
              className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => setDeleteConfirm(topic)}
              className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && topic.children!.map((child: TopicWithChildren) => renderTopicNode(child, level + 1))}
      </div>
    )
  }

  if (loading && (!topics || topics.length === 0)) {
    return <Loading />
  }

  // Filter topics
  const filteredTopics = (topics || []).filter(topic => {
    const matchesSearch = !searchTerm || 
      topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.nameJson?.UA && topic.nameJson.UA.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !categoryFilter || topic.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  // Limit to prevent rendering too many items
  const MAX_VISIBLE = 100
  const limitedTopics = filteredTopics.slice(0, MAX_VISIBLE)
  const hasMore = filteredTopics.length > MAX_VISIBLE

  const tree = buildTree(limitedTopics)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={BookOpen}
        title={t('editor.tab.topics')}
        description="Управління темами курсів"
        stats={`${filteredTopics.length} / ${topics?.length || 0} ${t('common.total')}`}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            {t('common.create')}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Topics Tree */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        {hasMore && (
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 text-sm text-yellow-600 dark:text-yellow-400">
            Showing {MAX_VISIBLE} of {filteredTopics.length} topics. Use filters to narrow down.
          </div>
        )}
        {(!limitedTopics || limitedTopics.length === 0) && !loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('editor.empty.noTopics')}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tree.map(topic => renderTopicNode(topic))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTopic) && (
        <TopicEditModal
          topic={editingTopic}
          allTopics={topics || []}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => {
            setShowCreateModal(false)
            setEditingTopic(null)
          }}
          onSave={async (data: TopicFormData) => {
            try {
              if (editingTopic) {
                await updateTopic(editingTopic.id, data)
              } else {
                await createTopic(data)
              }
              setShowCreateModal(false)
              setEditingTopic(null)
            } catch (err) {
              console.error('Failed to save:', err)
            }
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t('common.delete')} Topic
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deleteConfirm.nameJson?.UA || deleteConfirm.name}"?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-outline">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} className="btn-primary bg-red-600 hover:bg-red-700">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Topic Edit Modal Component
function TopicEditModal({
  topic,
  allTopics,
  activeTab,
  setActiveTab,
  onClose,
  onSave,
}: {
  topic: AdminTopic | null
  allTopics: AdminTopic[]
  activeTab: 'UA' | 'PL' | 'EN'
  setActiveTab: (tab: 'UA' | 'PL' | 'EN') => void
  onClose: () => void
  onSave: (data: TopicFormData) => Promise<void>
}) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<TopicFormData>({
    name: topic?.name || '',
    slug: topic?.slug || '',
    description: topic?.description || '',
    category: topic?.category || 'Programming',
    parentId: topic?.parentId || null,
    nameJson: topic?.nameJson || { UA: '', PL: '', EN: '' },
    descJson: topic?.descJson || { UA: '', PL: '', EN: '' },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.slug) {
      setError(t('editor.error.nameSlugRequired'))
      return
    }

    setSaving(true)
    try {
      await onSave(formData)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full my-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe size={24} />
            {topic ? t('editor.title.editTopic') : t('editor.title.createTopic')}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Language Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {(['UA', 'PL', 'EN'] as const).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveTab(lang)}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === lang
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Translations for active language */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('editor.label.name')} ({activeTab})
              </label>
              <input
                type="text"
                value={formData.nameJson?.[activeTab] || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    nameJson: { ...prev.nameJson, [activeTab]: e.target.value },
                    name: activeTab === 'UA' ? e.target.value : prev.name,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={activeTab === 'UA'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('editor.label.description')} ({activeTab})
              </label>
              <textarea
                value={formData.descJson?.[activeTab] || ''}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    descJson: { ...prev.descJson, [activeTab]: e.target.value },
                    description: activeTab === 'UA' ? e.target.value : prev.description,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Common fields (shown on all tabs) */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('editor.label.slug')}
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('editor.label.category')}
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent Topic (Optional)
              </label>
              <select
                value={formData.parentId || ''}
                onChange={e => setFormData(prev => ({ ...prev, parentId: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None (Root Topic)</option>
                {allTopics
                  .filter(t => !topic || t.id !== topic.id)
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nameJson?.UA || t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn-outline" disabled={saving}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
