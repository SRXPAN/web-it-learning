import { useEffect, useState, useRef } from 'react'
import { createMaterial, listMaterials, Material } from '@/lib/editorApi'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n/useTranslation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Upload, Loader2, FileCheck, X } from 'lucide-react'

export default function MaterialsTab({ topicId }:{ topicId?:string }){
  const [items, setItems] = useState<Material[]>([])
  const [form, setForm] = useState<Partial<Material>>({ title:'', type:'link', url:'', content:'', lang:'UA' })
  const { push } = useToast()
  const { t } = useTranslation()
  const { upload, uploading, progress, error: uploadError, reset: resetUpload } = useFileUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string; url: string } | null>(null)

  async function load(){
    if (!topicId) { setItems([]); return }
    try { setItems(await listMaterials(topicId)) } catch(e: unknown){ 
      const msg = e instanceof Error ? e.message : 'Failed to load materials'
      push({type:'error', msg})
    }
  }
  useEffect(()=>{ load() }, [topicId])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    const result = await upload(file, 'materials')
    if (result) {
      setUploadedFile({ id: result.id, name: result.originalName, url: result.url })
      setForm(s => ({ ...s, url: result.url, fileId: result.id }))
      push({ type: 'success', msg: t('editor.success.fileUploaded') })
    } else if (uploadError) {
      push({ type: 'error', msg: uploadError })
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearUploadedFile() {
    setUploadedFile(null)
    setForm(s => ({ ...s, url: '', fileId: undefined }))
    resetUpload()
  }

  async function save(){
    if (!topicId) { push({type:'error', msg:t('editor.error.selectTopicFirst')}); return }
    if (!form.title || !form.type) { push({type:'error', msg:t('editor.error.titleTypeRequired')}); return }
    try {
      await createMaterial(topicId, form)
      push({ type:'success', msg:t('editor.success.materialCreated') })
      setForm({ title:'', type:'link', url:'', content:'', lang:'UA' })
      setUploadedFile(null)
      resetUpload()
      await load()
    } catch(e: unknown){ 
      const msg = e instanceof Error ? e.message : 'Failed to create material'
      push({type:'error', msg})
    }
  }

  const showFileUpload = form.type === 'pdf' || form.type === 'video'

  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold mb-4 gradient-text">{t('editor.tab.materials')}</h2>
      {!topicId ? (
        <p className="text-sm text-gray-500">{t('editor.hint.selectTopic')}</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold">{t('editor.title.createMaterial')}</h3>
            <p className="text-xs text-gray-500">{t('editor.hint.materialFields')}</p>
            
            <label className="block text-sm mb-1">{t('editor.label.title')}</label>
            <input value={form.title||''} onChange={e=>setForm(s=>({...s, title:e.target.value}))} className="w-full mb-3"/>

            <label className="block text-sm mb-1">{t('editor.label.type')}</label>
            <select value={form.type||'link'} onChange={e=>setForm(s=>({...s, type: e.currentTarget.value as Material['type']}))} className="w-full mb-3">
              <option value="pdf">{t('materials.type.pdf')}</option>
              <option value="video">{t('materials.type.video')}</option>
              <option value="link">{t('materials.type.link')}</option>
              <option value="text">{t('materials.type.text')}</option>
            </select>

            <label className="block text-sm mb-1">{t('editor.label.language')}</label>
            <select value={form.lang||'UA'} onChange={e=>setForm(s=>({...s, lang: e.currentTarget.value as 'UA'|'PL'|'EN'}))} className="w-full mb-3">
              <option>UA</option><option>PL</option><option>EN</option>
            </select>

            {form.type==='text' ? (
              <>
                <label className="block text-sm mb-1">{t('editor.label.content')}</label>
                <textarea value={form.content||''} onChange={e=>setForm(s=>({...s, content:e.target.value}))} className="w-full mb-3" rows={5}/>
              </>
            ) : (
              <div className="space-y-3">
                {/* File Upload for PDF/Video */}
                {showFileUpload && (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={form.type === 'pdf' ? '.pdf' : 'video/*'}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="material-file"
                    />
                    
                    {uploading ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('editor.label.uploading')}... {progress?.percent || 0}%
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress?.percent || 0}%` }}
                          />
                        </div>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-green-500" />
                          <span className="text-sm truncate max-w-[200px]">{uploadedFile.name}</span>
                        </div>
                        <button 
                          onClick={clearUploadedFile}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label 
                        htmlFor="material-file"
                        className="flex flex-col items-center cursor-pointer py-4"
                      >
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('editor.label.clickToUpload')}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          {form.type === 'pdf' ? 'PDF (max 50MB)' : 'MP4, WebM (max 500MB)'}
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* URL Input - always show for link type, optional for others */}
                <div>
                  <label className="block text-sm mb-1">
                    {showFileUpload ? t('editor.label.urlOrUpload') : t('editor.label.url')}
                  </label>
                  <input 
                    value={form.url||''} 
                    onChange={e=>setForm(s=>({...s, url:e.target.value}))} 
                    className="w-full"
                    placeholder={showFileUpload ? t('editor.placeholder.urlOptional') : ''}
                    disabled={!!uploadedFile}
                  />
                </div>
              </div>
            )}

            <button className="btn" onClick={save} disabled={uploading}>{t('common.create')}</button>
          </div>

          <div className="space-y-3">
            <div className="alert text-sm">
              <div className="font-semibold mb-1">{t('editor.title.structureTips')}</div>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('editor.tip.clearTitles')}</li>
                <li>{t('editor.tip.correctType')}</li>
                <li>{t('editor.tip.matchLanguage')}</li>
                <li>{t('editor.tip.textForNotes')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">{t('editor.title.materialsList')}</h3>
              <ul className="space-y-2">
                {items.map(m=>(
                  <li key={m.id} className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.type} • {m.lang ?? '—'}</div>
                  </li>
                ))}
                {!items.length && <li className="text-sm text-gray-500">{t('editor.empty.noMaterials')}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
