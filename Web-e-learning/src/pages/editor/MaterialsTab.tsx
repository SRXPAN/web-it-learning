import { useEffect, useState, useRef } from 'react'
import { createMaterial, listMaterials, Material } from '@/lib/editorApi'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n/useTranslation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Upload, Loader2, FileCheck, X, Edit2, Save, XCircle } from 'lucide-react'

type MaterialFormData = {
  type: Material['type']
  titleUA: string
  titleEN: string
  titlePL: string
  contentUA: string
  contentEN: string
  contentPL: string
  urlUA: string
  urlEN: string
  urlPL: string
}

export default function MaterialsTab({ topicId }:{ topicId?:string }){
  const [items, setItems] = useState<Material[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MaterialFormData>({
    type: 'link',
    titleUA: '', titleEN: '', titlePL: '',
    contentUA: '', contentEN: '', contentPL: '',
    urlUA: '', urlEN: '', urlPL: ''
  })
  const [activeLanguage, setActiveLanguage] = useState<'UA' | 'EN' | 'PL'>('UA')
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
      // Set URL for active language
      setForm(s => ({ 
        ...s, 
        [`url${activeLanguage}`]: result.url
      }))
      push({ type: 'success', msg: t('editor.success.fileUploaded') })
    } else if (uploadError) {
      push({ type: 'error', msg: uploadError })
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function clearUploadedFile() {
    setUploadedFile(null)
    setForm(s => ({ ...s, [`url${activeLanguage}`]: '' }))
    resetUpload()
  }

  async function save(){
    if (!topicId) { push({type:'error', msg:t('editor.error.selectTopicFirst')}); return }
    
    // At least one language must have title
    if (!form.titleUA && !form.titleEN && !form.titlePL) { 
      push({type:'error', msg:t('editor.error.titleRequired')}); 
      return 
    }
    
    try {
      if (editingId) {
        // Update existing material via multi-language API
        const payload = {
          titleUA: form.titleUA || undefined,
          titleEN: form.titleEN || undefined,
          titlePL: form.titlePL || undefined,
          contentUA: form.contentUA || undefined,
          contentEN: form.contentEN || undefined,
          contentPL: form.contentPL || undefined,
          urlUA: form.urlUA || undefined,
          urlEN: form.urlEN || undefined,
          urlPL: form.urlPL || undefined,
          type: form.type,
        }
        
        const response = await fetch(
          `/api/editor/topics/${topicId}/materials/${editingId}/translations`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
          }
        )
        if (!response.ok) throw new Error('Failed to update material')
        
        push({ type:'success', msg:t('editor.success.materialUpdated') })
      } else {
        // Create new material
        await createMaterial(topicId, { 
          title: form.titleUA || form.titleEN || form.titlePL || 'Untitled',
          type: form.type, 
          lang: 'UA'
        })
        
        push({ type:'success', msg:t('editor.success.materialCreated') })
      }
      
      resetForm()
      await load()
    } catch(e: unknown){ 
      const msg = e instanceof Error ? e.message : 'Failed to save material'
      push({type:'error', msg})
    }
  }
  
  function resetForm() {
    setForm({
      type: 'link',
      titleUA: '', titleEN: '', titlePL: '',
      contentUA: '', contentEN: '', contentPL: '',
      urlUA: '', urlEN: '', urlPL: ''
    })
    setUploadedFile(null)
    setEditingId(null)
    resetUpload()
  }
  
  function startEdit(material: Material) {
    setEditingId(material.id)
    setForm({
      type: material.type,
      titleUA: (material.titleCache?.UA as string) || material.title || '',
      titleEN: (material.titleCache?.EN as string) || material.title || '',
      titlePL: (material.titleCache?.PL as string) || material.title || '',
      contentUA: (material.contentCache?.UA as string) || material.content || '',
      contentEN: (material.contentCache?.EN as string) || material.content || '',
      contentPL: (material.contentCache?.PL as string) || material.content || '',
      urlUA: (material.urlCache?.UA as string) || material.url || '',
      urlEN: (material.urlCache?.EN as string) || material.url || '',
      urlPL: (material.urlCache?.PL as string) || material.url || '',
    })
    setActiveLanguage('UA')
  }

  const showFileUpload = form.type === 'pdf' || form.type === 'video'
  const langTitle = activeLanguage === 'UA' ? 'Українська' : activeLanguage === 'EN' ? 'English' : 'Polski'

  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold mb-4 gradient-text">{t('editor.tab.materials')}</h2>
      {!topicId ? (
        <p className="text-sm text-gray-500">{t('editor.hint.selectTopic')}</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-semibold">
              {editingId ? 'Редагування матеріалу' : t('editor.title.createMaterial')}
            </h3>
            <p className="text-xs text-gray-500">Заповніть переклади для всіх мов</p>
            
            {/* Type selector */}
            <label className="block text-sm mb-1">{t('editor.label.type')}</label>
            <select value={form.type} onChange={e=>setForm(s=>({...s, type: e.currentTarget.value as Material['type']}))} className="w-full mb-3">
              <option value="pdf">{t('materials.type.pdf')}</option>
              <option value="video">{t('materials.type.video')}</option>
              <option value="link">{t('materials.type.link')}</option>
              <option value="text">{t('materials.type.text')}</option>
            </select>

            {/* Language tabs */}
            <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700 mb-4">
              {(['UA', 'EN', 'PL'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setActiveLanguage(lang)}
                  className={`px-4 py-2 font-semibold text-sm transition-colors ${
                    activeLanguage === lang
                      ? 'text-primary-500 border-b-2 border-primary-500 -mb-0.5'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Title input for active language */}
            <div>
              <label className="block text-sm mb-1">{t('editor.label.title')} ({langTitle})</label>
              <input 
                value={form[`title${activeLanguage}`]} 
                onChange={e=>setForm(s=>({...s, [`title${activeLanguage}`]: e.target.value}))} 
                className="w-full mb-3"
                placeholder={`Введіть заголовок ${langTitle.toLowerCase()}`}
              />
            </div>

            {/* Content or URL based on type */}
            {form.type === 'text' ? (
              <div>
                <label className="block text-sm mb-1">{t('editor.label.content')} ({langTitle})</label>
                <textarea 
                  value={form[`content${activeLanguage}`]} 
                  onChange={e=>setForm(s=>({...s, [`content${activeLanguage}`]: e.target.value}))} 
                  className="w-full mb-3" 
                  rows={5}
                  placeholder={`Введіть контент ${langTitle.toLowerCase()}`}
                />
              </div>
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

                {/* URL Input for active language */}
                <div>
                  <label className="block text-sm mb-1">
                    {showFileUpload ? `${t('editor.label.url')} (${langTitle})` : t('editor.label.url')} ({langTitle})
                  </label>
                  <input 
                    value={form[`url${activeLanguage}`]} 
                    onChange={e=>setForm(s=>({...s, [`url${activeLanguage}`]: e.target.value}))} 
                    className="w-full"
                    placeholder={showFileUpload ? t('editor.placeholder.urlOptional') : 'https://...'}
                    disabled={!!uploadedFile}
                  />
                </div>
              </div>
            )}

            <button className="btn" onClick={save} disabled={uploading}>
              {editingId ? (
                <>
                  <Save size={16} className="inline mr-2" />
                  {t('common.update')}
                </>
              ) : (
                t('common.create')
              )}
            </button>
            {editingId && (
              <button 
                className="btn-outline" 
                onClick={() => resetForm()}
              >
                <XCircle size={16} className="inline mr-2" />
                {t('common.cancel')}
              </button>
            )}
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
                  <li key={m.id} className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{m.title}</div>
                      <div className="text-xs text-gray-500">{m.type} • {m.lang ?? '—'}</div>
                    </div>
                    <button
                      onClick={() => startEdit(m)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit2 size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
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
