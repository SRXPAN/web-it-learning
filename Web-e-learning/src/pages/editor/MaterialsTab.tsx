import { useEffect, useState } from 'react'
import { FileText, Save, Video } from 'lucide-react'
import { http as api } from '../../lib/http'

type Lang = 'EN' | 'UA' | 'PL'

interface MaterialDTO {
  id: string
  title: string
  type: 'VIDEO' | 'TEXT' | 'video' | 'text' | 'pdf' | 'link'
  url?: string | null
  content?: string | null
  titleCache?: Record<string, string> | null
  urlCache?: Record<string, string> | null
  contentCache?: Record<string, string> | null
  status?: string
  lang?: string
}

interface MaterialFormState {
  EN: { title: string; url: string; content: string }
  UA: { title: string; url: string; content: string }
  PL: { title: string; url: string; content: string }
  type: 'VIDEO' | 'TEXT'
}

const ERROR_MESSAGES = {
  invalidUrl: (lang: Lang, url: string) => `Invalid URL for ${lang}: ${url}`,
  saveFailed: 'Failed to save material. Please try again.',
  loadFailed: 'Failed to load materials'
} as const

export default function MaterialsTab({ topicId }: { topicId?: string }) {
  const [materials, setMaterials] = useState<MaterialDTO[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  // Active tab state
  const [activeLang, setActiveLang] = useState<Lang>('EN')

  // Unified form state for all languages
  const [formData, setFormData] = useState<MaterialFormState>({
    EN: { title: '', url: '', content: '' },
    UA: { title: '', url: '', content: '' },
    PL: { title: '', url: '', content: '' },
    type: 'VIDEO'
  })

  // Load materials
  const fetchMaterials = async () => {
    if (!topicId) return
    try {
      const res = await api.get<MaterialDTO[]>(`/editor/topics/${topicId}/materials`)
      setMaterials(res ?? [])
    } catch (e) {
      console.error(ERROR_MESSAGES.loadFailed, e)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [topicId])

  // Start Editing: Unpack API data (Cache -> Form State)
  const handleEdit = (m: MaterialDTO) => {
    setEditingId(m.id)
    setFormData({
      EN: {
        title: m.titleCache?.EN || m.title || '',
        url: m.urlCache?.EN || m.url || '',
        content: m.contentCache?.EN || m.content || ''
      },
      UA: {
        title: m.titleCache?.UA || '',
        url: m.urlCache?.UA || '',
        content: m.contentCache?.UA || ''
      },
      PL: {
        title: m.titleCache?.PL || '',
        url: m.urlCache?.PL || '',
        content: m.contentCache?.PL || ''
      },
      type: (m.type?.toUpperCase() === 'VIDEO' || m.type?.toUpperCase() === 'TEXT') 
        ? m.type.toUpperCase() as 'VIDEO' | 'TEXT'
        : 'VIDEO'
    })
  }

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

  // Save Changes: Flatten State (Form State -> API Payload)
  const handleSave = async () => {
    if (!editingId) return

    // Validate URLs for all languages
    const langs: Lang[] = ['EN', 'UA', 'PL']
    for (const lang of langs) {
      const url = formData[lang].url
      if (url && !isValidUrl(url)) {
        alert(ERROR_MESSAGES.invalidUrl(lang, url))
        return
      }
    }

    // Construct the payload expected by the updated backend
    const payload = {
      type: formData.type,
      // English (Default + Cache)
      titleEN: formData.EN.title,
      linkEN: formData.EN.url,
      contentEN: formData.EN.content,
      // Ukrainian
      titleUA: formData.UA.title,
      linkUA: formData.UA.url,
      contentUA: formData.UA.content,
      // Polish
      titlePL: formData.PL.title,
      linkPL: formData.PL.url,
      contentPL: formData.PL.content
    }

    try {
      await api.put(`/editor/materials/${editingId}`, payload)
      setEditingId(null)
      fetchMaterials() // Refresh list
    } catch (e) {
      alert(ERROR_MESSAGES.saveFailed)
      console.error(e)
    }
  }

  // Helper to update specific field for active language
  const updateField = (field: 'title' | 'url' | 'content', value: string) => {
    setFormData(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value }
    }))
  }

  return (
    <div className="space-y-6">
      {/* List of Materials */}
      <div className="grid gap-3">
        {materials.map(m => (
          <div
            key={m.id}
            onClick={() => handleEdit(m)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${editingId === m.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                {m.type === 'VIDEO' ? <Video size={16} /> : <FileText size={16} />}
                {m.title || '(Untitled Material)'}
              </span>
              <div className="flex gap-2 text-xs">
                {/* Show badges for available translations */}
                {m.titleCache?.UA && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">UA</span>}
                {m.titleCache?.PL && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">PL</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Form */}
      {editingId && (
        <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Edit Material Content</h3>
            {/* Language Tabs */}
            <div className="flex bg-gray-200 p-1 rounded-lg">
              {(['EN', 'UA', 'PL'] as Lang[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeLang === lang
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {lang === 'EN' ? '🇬🇧 EN' : lang === 'UA' ? '🇺🇦 UA' : '🇵🇱 PL'}
                </button>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title ({activeLang})
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData[activeLang].title}
                onChange={e => updateField('title', e.target.value)}
                placeholder={activeLang === 'UA' ? 'Назва уроку...' : 'Lesson title...'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'VIDEO' ? `Video URL (${activeLang})` : `File URL (${activeLang})`}
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-mono text-sm"
                  value={formData[activeLang].url}
                  onChange={e => updateField('url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter a specific link for <b>{activeLang}</b> users. If empty, EN link will be used.
              </p>
            </div>

            {formData.type === 'TEXT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content (Markdown)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2.5 h-32 font-mono text-sm"
                  value={formData[activeLang].content}
                  onChange={e => updateField('content', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              onClick={() => setEditingId(null)}
              className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2"
            >
              <Save size={18} />
              Save All Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
