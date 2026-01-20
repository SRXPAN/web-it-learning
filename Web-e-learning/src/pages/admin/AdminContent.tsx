import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  BookOpen,
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react'

import { useTranslation } from '@/i18n/useTranslation'
import { useAdminContent } from '@/hooks/useAdmin'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TopicSidebar, TopicView, MaterialModal } from '@/pages/materialsComponents'
import { QuizModal } from '@/pages/materialsComponents/QuizModal'
import { SkeletonDashboard } from '@/components/Skeletons'
import { LoadingButton } from '@/components/LoadingButton'
import { api } from '@/lib/http'

import type { TopicNode, Material } from '@/pages/materialsComponents/types'
import type { Lang, LocalizedString, Category, MaterialType } from '@elearn/shared'

// Temporary Topic interface for the modal (before saving)
interface TopicForm {
  id?: string
  slug: string
  name: string
  nameJson: LocalizedString
  description: string
  descJson: LocalizedString
  category: Category
  parentId: string | null
}

export default function AdminContent() {
  const { t, lang } = useTranslation()
  const {
    topics,
    loading,
    error,
    fetchTopics,
    deleteTopic,
  } = useAdminContent()

  // Visual editor state
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)

  // Modals State
  const [editingTopic, setEditingTopic] = useState<TopicForm | null>(null) // null = closed
  const [isCreatingTopic, setIsCreatingTopic] = useState(false)
  
  const [deleteConfirm, setDeleteConfirm] = useState<TopicNode | null>(null)

  // Material/Quiz management
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [materialLessonId, setMaterialLessonId] = useState<string | null>(null)
  const [materialType, setMaterialType] = useState<MaterialType>('text')
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizTopicId, setQuizTopicId] = useState<string | null>(null)

  // Transform topics tree for student view (TopicNode)
  const topicsAsNodes = useMemo((): TopicNode[] => {
    if (!topics) return []
    // Filter to root (no parentId) and map to TopicNode shape
    // Note: useAdminContent already returns nested structure in `children`
    // but we need to ensure types match TopicNode
    return topics.map(root => root as unknown as TopicNode)
  }, [topics])

  // Auto-select first topic on load
  useEffect(() => {
    if (!selectedTopicId && topicsAsNodes.length > 0) {
      setSelectedTopicId(topicsAsNodes[0].id)
    }
  }, [topicsAsNodes, selectedTopicId])

  const activeTopic = topicsAsNodes.find((t) => t.id === selectedTopicId) || null
  const activeSub = activeTopic?.children?.find((c) => c.id === selectedSubId) || null

  // --- Handlers ---

  const handleAddTopic = useCallback(() => {
    setEditingTopic({
      slug: '',
      name: '',
      nameJson: { UA: '', PL: '', EN: '' },
      description: '',
      descJson: { UA: '', PL: '', EN: '' },
      category: 'Programming',
      parentId: null
    })
    setIsCreatingTopic(true)
  }, [])

  const handleEditTopic = useCallback((topic: TopicNode) => {
    setEditingTopic({
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      nameJson: (topic.nameJson || { UA: '', PL: '', EN: '' }) as LocalizedString,
      description: topic.description || '',
      descJson: (topic.descJson || { UA: '', PL: '', EN: '' }) as LocalizedString,
      category: topic.category || 'Programming',
      parentId: topic.parentId || null,
    })
    setIsCreatingTopic(false)
  }, [])

  const handleDeleteTopic = useCallback((topic: TopicNode) => {
    setDeleteConfirm(topic)
  }, [])

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteTopic(deleteConfirm.id)
      setDeleteConfirm(null)
      // If active topic was deleted, reset selection
      if (selectedTopicId === deleteConfirm.id) {
        setSelectedTopicId(null)
        setSelectedSubId(null)
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // --- Material Handlers ---

  const handleAddMaterial = useCallback((lessonId: string, type: MaterialType) => {
    setMaterialLessonId(lessonId)
    setMaterialType(type)
    setEditingMaterial(null)
    setShowMaterialModal(true)
  }, [])

  const handleEditMaterial = useCallback((material: Material, topic: TopicNode) => {
    setMaterialLessonId(topic.id)
    setMaterialType(material.type)
    setEditingMaterial(material)
    setShowMaterialModal(true)
  }, [])

  const handleDeleteMaterial = useCallback(async (material: Material, topic: TopicNode) => {
    if (!confirm(t('dialog.deleteConfirmation', 'Delete this material?'))) return
    try {
      await api(`/editor/topics/${topic.id}/materials/${material.id}`, { method: 'DELETE' })
      fetchTopics() // Refresh list
    } catch (err) {
      console.error(err)
    }
  }, [fetchTopics, t])

  const handleAddQuiz = useCallback((topic: TopicNode) => {
    setQuizTopicId(topic.id)
    setShowQuizModal(true)
  }, [])

  // --- Lesson (Subtopic) Handlers ---

  const handleAddLesson = useCallback((parentTopic: TopicNode) => {
    setEditingTopic({
      slug: '',
      name: '',
      nameJson: { UA: '', PL: '', EN: '' },
      description: '',
      descJson: { UA: '', PL: '', EN: '' },
      category: parentTopic.category || 'Programming',
      parentId: parentTopic.id
    })
    setIsCreatingTopic(true)
  }, [])

  // --- Render ---

  if (loading && (!topics || topics.length === 0)) {
    return <SkeletonDashboard />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 font-display">
            <BookOpen className="w-8 h-8 text-primary-600" />
            {t('admin.content', 'Content Editor')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.contentDescription', 'Edit topics, lessons, and materials as students see them')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          {error}
        </div>
      )}

      {/* Editor Layout */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        
        {/* Sidebar */}
        <div className="lg:w-72 shrink-0">
          <TopicSidebar
            catTopics={topicsAsNodes}
            activeTopicId={selectedTopicId}
            activeSubId={selectedSubId}
            loading={loading}
            isEditable={true}
            onSelectTopic={setSelectedTopicId}
            onSelectSub={(tId, sId) => {
              setSelectedTopicId(tId)
              setSelectedSubId(sId)
            }}
            onAddTopic={handleAddTopic}
            onEditTopic={handleEditTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 dark:bg-neutral-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-4 md:p-6 lg:p-8 min-h-[600px]">
          {activeTopic ? (
            <TopicView
              activeTopic={activeTopic}
              activeSub={activeSub}
              tab="ALL"
              setTab={() => {}}
              query=""
              setQuery={() => {}}
              filteredMaterials={(list) => list} // No filtering in admin mode
              openMaterial={(m) => {
                // In admin mode, clicking opens edit modal
                handleEditMaterial(m, activeSub || activeTopic)
              }}
              isEditable={true}
              onAddLesson={handleAddLesson}
              onEditLesson={handleEditTopic}
              onDeleteLesson={handleDeleteTopic}
              onAddMaterial={handleAddMaterial}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={(m, topic) => handleDeleteMaterial(m, topic)}
              onAddQuiz={handleAddQuiz}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 py-20">
              <BookOpen size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">
                {t('admin.selectTopic', 'Select a topic to start editing')}
              </p>
              <button 
                onClick={handleAddTopic}
                className="mt-4 btn-outline btn-sm"
              >
                {t('admin.createTopic', 'Create Topic')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Topic Modal */}
      {editingTopic && (
        <TopicEditModal
          form={editingTopic}
          isCreating={isCreatingTopic}
          onClose={() => setEditingTopic(null)}
          onSave={() => {
            setEditingTopic(null)
            fetchTopics()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t('dialog.delete', 'Delete')}
        message={t('dialog.deleteConfirmation', `Are you sure you want to delete "${deleteConfirm?.name}"?`)}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />

      {/* Material Modal */}
      {materialLessonId && materialType && (
        <MaterialModal
          isOpen={showMaterialModal}
          material={editingMaterial}
          lessonId={materialLessonId}
          type={materialType}
          lang={lang as Lang}
          onClose={() => {
            setShowMaterialModal(false)
            setMaterialLessonId(null)
            setEditingMaterial(null)
          }}
          onSave={() => {
            setShowMaterialModal(false)
            setMaterialLessonId(null)
            setEditingMaterial(null)
            fetchTopics()
          }}
        />
      )}

      {/* Quiz Modal */}
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

// --- Topic Form Modal ---

function TopicEditModal({ 
  form: initialForm, 
  isCreating,
  onClose, 
  onSave
}: { 
  form: TopicForm
  isCreating: boolean
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()

  const categories: Category[] = [
    'Programming', 'Mathematics', 'Databases', 'Networks', 
    'WebDevelopment', 'MobileDevelopment', 'MachineLearning', 
    'Security', 'DevOps', 'OperatingSystems'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.slug || !form.name) {
      setError(t('editor.error.nameSlugRequired', 'Name and Slug are required'))
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isCreating) {
        await api('/editor/topics', { 
          method: 'POST', 
          body: JSON.stringify(form) 
        })
      } else {
        await api(`/editor/topics/${form.id}`, { 
          method: 'PUT', 
          body: JSON.stringify(form) 
        })
      }
      onSave()
    } catch (err: any) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  // Helper to update nested localized strings
  const setLoc = (field: 'nameJson' | 'descJson', lang: Lang, val: string) => {
    setForm(prev => ({
      ...prev,
      [field]: { ...prev[field], [lang]: val }
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isCreating ? t('editor.title.createTopic', 'Create Topic') : t('editor.title.editTopic', 'Edit Topic')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <Trash2 size={0} className="hidden" /> {/* Dummy icon import fix */}
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-900/50 flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('editor.label.slug', 'Slug')} <span className="text-red-500">*</span></label>
              <input
                value={form.slug}
                onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="input w-full"
                placeholder="my-topic-slug"
                required
              />
            </div>
            
            {!form.parentId && (
              <div>
                <label className="label">{t('editor.label.category', 'Category')}</label>
                <select
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value as Category})}
                  className="input w-full"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Name & Translations */}
          <div>
            <label className="label mb-2">{t('editor.label.name', 'Name')} (Translations)</label>
            <div className="grid gap-3 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-100 dark:border-neutral-800">
              {(['EN', 'UA', 'PL'] as Lang[]).map(l => (
                <div key={l} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-bold text-gray-400 uppercase">{l}</span>
                  <input
                    value={form.nameJson[l] || ''}
                    onChange={e => {
                      setLoc('nameJson', l, e.target.value)
                      // Auto-update main name if EN
                      if (l === 'EN') setForm(prev => ({...prev, name: e.target.value}))
                    }}
                    className="input w-full text-sm"
                    placeholder={`Name in ${l}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description & Translations */}
          <div>
            <label className="label mb-2">{t('editor.label.description', 'Description')}</label>
            <div className="grid gap-3 p-4 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-100 dark:border-neutral-800">
              {(['EN', 'UA', 'PL'] as Lang[]).map(l => (
                <div key={l} className="flex items-start gap-3">
                  <span className="w-8 text-xs font-bold text-gray-400 uppercase pt-2.5">{l}</span>
                  <textarea
                    value={form.descJson[l] || ''}
                    onChange={e => {
                      setLoc('descJson', l, e.target.value)
                      if (l === 'EN') setForm(prev => ({...prev, description: e.target.value}))
                    }}
                    rows={2}
                    className="input w-full text-sm resize-none"
                    placeholder={`Description in ${l}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-sm font-medium transition-colors"
          >
            {t('common.cancel')}
          </button>
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            icon={<Save size={16} />}
            className="px-6"
          >
            {t('common.save')}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}