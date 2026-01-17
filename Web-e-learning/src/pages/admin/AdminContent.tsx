/**
 * Admin Content Management Page  
 * Visual editor: see what students see, but with edit controls
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { type TranslationKey } from '@/i18n/types'
import { useAdminContent } from '@/hooks/useAdmin'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TopicSidebar, TopicView, MaterialModal } from '@/pages/materialsComponents'
import type { TopicNode, Material } from '@/pages/materialsComponents/types'
import { Loading } from '@/components/Loading'
import { QuizModal } from '@/pages/materialsComponents/QuizModal'
import {
  BookOpen,
  Plus,
  Save,
  X,
  Globe,
} from 'lucide-react'

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

export default function AdminContent() {
  const { t, lang } = useTranslation()
  const tx = (key: TranslationKey, fallback: string) => {
    const val = t(key)
    return val === key ? fallback : val
  }

  const {
    topics,
    loading,
    error,
    fetchTopics,
    createTopic,
    updateTopic,
    deleteTopic,
  } = useAdminContent()

  // Visual editor state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)

  // Modals
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Topic | null>(null)

  // Material/Quiz management
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [materialLessonId, setMaterialLessonId] = useState<string | null>(null)
  const [materialType, setMaterialType] = useState<'VIDEO' | 'TEXT' | 'pdf' | 'link' | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizTopicId, setQuizTopicId] = useState<string | null>(null)

  // Transform topics tree for student view
  const topicsAsNodes = useMemo((): TopicNode[] => {
    if (!topics) return []
    // Filter to root (no parentId) and map to TopicNode shape
    return topics.filter((t) => !t.parentId).map((root) => {
      const transform = (topic: Topic): TopicNode => ({
        id: topic.id,
        name: topic.name,
        nameJson: topic.nameJson,
        description: topic.description,
        descJson: topic.descJson,
        slug: topic.slug,
        category: (topic.category || 'Programming') as any,
        materials: [], // Could fetch from server if needed
        quizzes: [],
        children: topic.children ? topic.children.map(transform) : []
      })
      return transform(root)
    })
  }, [topics])

  useEffect(() => {
    if (!selectedTopicId && topicsAsNodes.length) {
      setSelectedTopicId(topicsAsNodes[0].id)
    }
  }, [topicsAsNodes, selectedTopicId])

  const activeTopic = topicsAsNodes.find((t) => t.id === selectedTopicId) || null
  const activeSub =
    activeTopic?.children?.find((c) => c.id === selectedSubId) || null

  // Handlers
  const handleAddTopic = useCallback(() => {
    setShowCreateTopic(true)
  }, [])

  const handleEditTopic = useCallback((topic: TopicNode) => {
    // Convert TopicNode back to Topic for modal
    setEditingTopic({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      nameJson: topic.nameJson as any,
      description: topic.description || '',
      descJson: topic.descJson as any,
      category: topic.category || 'Programming',
      status: 'Published',
      parentId: null,
    })
  }, [])

  const handleDeleteTopic = useCallback((topic: TopicNode) => {
    setDeleteConfirm({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      nameJson: topic.nameJson as any,
      description: topic.description || '',
      descJson: topic.descJson as any,
      category: topic.category || 'Programming',
      status: 'Published',
      parentId: null,
    })
  }, [])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteTopic(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // Lesson/Material stubs
  const handleAddLesson = useCallback((topic: TopicNode) => {
    console.log('Add lesson under', topic.name)
    // Open create sub-topic modal
    setShowCreateTopic(true)
  }, [])

  const handleEditLesson = useCallback((topic: TopicNode) => {
    handleEditTopic(topic)
  }, [handleEditTopic])

  const handleDeleteLesson = useCallback((topic: TopicNode) => {
    handleDeleteTopic(topic)
  }, [handleDeleteTopic])

  const handleAddMaterial = useCallback((lessonId: string, type: 'VIDEO' | 'TEXT' | 'pdf' | 'link') => {
    setMaterialLessonId(lessonId)
    setEditingMaterial(null) // Clear any existing material
    setShowMaterialModal(true)
  }, [])

  const handleEditMaterial = useCallback((material: Material, topic: TopicNode) => {
    setMaterialLessonId(topic.id)
    setMaterialType(null)
    setEditingMaterial(material) // Set the material to edit
    setMaterialType(null) // No type restriction when editing
    setShowMaterialModal(true)
  }, [])

  const handleDeleteMaterial = useCallback(async (material: Material, topic: TopicNode) => {
    if (!confirm(`Delete "${material.title}"?`)) return
    // TODO: Implement delete via API
    console.log('Delete material', material.title)
  }, [])

  const handleAddQuiz = useCallback((topic: TopicNode) => {
    setQuizTopicId(topic.id)
    setShowQuizModal(true)
  }, [])

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
            {tx('admin.content', 'Content Editor')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tx('admin.contentDescription', 'Edit topics, lessons, and materials as students see them')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Visual Editor Layout */}
      <div className="flex h-[calc(100vh-200px)] gap-6">
        {/* Sidebar */}
        <div className="w-64 overflow-y-auto">
          <TopicSidebar
            catTopics={topicsAsNodes}
            activeTopicId={selectedTopicId}
            activeSubId={selectedSubId}
            loading={loading}
            isEditable={true}
            onSelectTopic={setSelectedTopicId}
            onSelectSub={(topicId, subId) => {
              setSelectedTopicId(topicId)
              setSelectedSubId(subId)
            }}
            onAddTopic={handleAddTopic}
            onEditTopic={handleEditTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-6">
          {activeTopic ? (
            <TopicView
              activeTopic={activeTopic}
              activeSub={activeSub}
              tab="ALL"
              setTab={() => {}}
              query=""
              setQuery={() => {}}
              filteredMaterials={(list) => list}
              openMaterial={(m) => console.log('Open', m.title)}
              progressVersion={0}
              isEditable={true}
              onAddLesson={handleAddLesson}
              onEditLesson={handleEditLesson}
              onDeleteLesson={handleDeleteLesson}
              onAddMaterial={handleAddMaterial}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onAddQuiz={handleAddQuiz}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              {tx('admin.selectTopic', 'Select a topic from the sidebar to start editing')}
            </div>
          )}
        </div>
      </div>

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

      {/* Material Editor Modal */}
      {showMaterialModal && materialLessonId && (
        <MaterialModal
          material={editingMaterial as any}
          lessonId={materialLessonId}
          preselectedType={materialType || undefined}
          onClose={() => {
            setShowMaterialModal(false)
            setMaterialLessonId(null)
            setMaterialType(null)
            setEditingMaterial(null)
          }}
          onSave={() => {
            setShowMaterialModal(false)
            setMaterialLessonId(null)
            setMaterialType(null)
            setEditingMaterial(null)
            fetchTopics()
          }}
        />
      )}

      {/* Quiz Editor Modal */}
      {showQuizModal && quizTopicId && (
        <QuizModal
          topicId={quizTopicId}
          onClose={() => {
            setShowQuizModal(false)
            setQuizTopicId(null)
          }}
          onSave={() => {
            setShowQuizModal(false)
            setQuizTopicId(null)
            fetchTopics()
          }}
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
