import { useState, useEffect } from 'react'
import { http as api } from '@/lib/http'

type Lang = 'EN' | 'UA' | 'PL'

type MaterialForm = {
  EN: { title: string; url: string; content: string }
  UA: { title: string; url: string; content: string }
  PL: { title: string; url: string; content: string }
  type: string
}

export default function MaterialsTab({ topicId }: { topicId?: string }) {
  const [materials, setMaterials] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeLang, setActiveLang] = useState<Lang>('EN')
  const [formData, setFormData] = useState<MaterialForm>({
    EN: { title: '', url: '', content: '' },
    UA: { title: '', url: '', content: '' },
    PL: { title: '', url: '', content: '' },
    type: 'VIDEO'
  })

  useEffect(() => {
    if (!topicId) return
    api.get<any[]>(`/editor/topics/${topicId}/materials`).then(res => setMaterials(res ?? [])).catch(() => {})
  }, [topicId])

  const handleEdit = (m: any) => {
    setEditingId(m.id)
    setFormData({
      EN: { title: m.titleCache?.EN || m.title || '', url: m.urlCache?.EN || m.url || '', content: m.contentCache?.EN || m.content || '' },
      UA: { title: m.titleCache?.UA || '', url: m.urlCache?.UA || '', content: m.contentCache?.UA || '' },
      PL: { title: m.titleCache?.PL || '', url: m.urlCache?.PL || '', content: m.contentCache?.PL || '' },
      type: m.type || 'VIDEO'
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    const payload = {
      type: formData.type,
      titleEN: formData.EN.title, titleUA: formData.UA.title, titlePL: formData.PL.title,
      linkEN: formData.EN.url,    linkUA: formData.UA.url,    linkPL: formData.PL.url,
      contentEN: formData.EN.content, contentUA: formData.UA.content, contentPL: formData.PL.content,
    }
    await api.put(`/editor/materials/${editingId}`, payload)
    setEditingId(null)
    const res = await api.get<any[]>(`/editor/topics/${topicId}/materials`)
    setMaterials(res ?? [])
  }

  return (
    <div className="space-y-4">
      {materials.map(m => (
        <div key={m.id} onClick={() => handleEdit(m)} className="p-3 border rounded cursor-pointer hover:bg-gray-50">
          {m.title} <span className="text-gray-400 text-sm">({m.type})</span>
        </div>
      ))}

      {editingId && (
        <div className="p-4 border-2 border-blue-500 rounded-lg mt-4 bg-white">
          <div className="flex gap-2 mb-4 border-b pb-2">
            {(['EN', 'UA', 'PL'] as Lang[]).map(lang => (
              <button 
                key={lang} 
                onClick={() => setActiveLang(lang)}
                className={`px-4 py-1 rounded ${activeLang === lang ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold">Title ({activeLang})</label>
            <input 
              className="w-full border p-2 rounded" 
              value={formData[activeLang].title}
              onChange={e => setFormData({
                ...formData,
                [activeLang]: { ...formData[activeLang], title: e.target.value }
              })}
            />
            
            <label className="block text-sm font-bold">URL ({activeLang})</label>
            <input 
              className="w-full border p-2 rounded" 
              value={formData[activeLang].url}
              placeholder={activeLang === 'UA' ? 'Посилання для українців...' : 'Link...'}
              onChange={e => setFormData({
                ...formData,
                [activeLang]: { ...formData[activeLang], url: e.target.value }
              })}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-gray-500">Cancel</button>
            <button onClick={handleSave} className="px-3 py-1 bg-green-600 text-white rounded">Save All Languages</button>
          </div>
        </div>
      )}
    </div>
  )
}
