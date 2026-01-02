import { useEffect, useState } from 'react'
import { BookOpen, FileText, ListChecks, Plus } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n/useTranslation'
import { Category, Topic, listRootTopics } from '@/lib/editorApi'
import TopicsTab from './TopicsTab'
import MaterialsTab from './MaterialsTab'
import QuizzesTab from './QuizzesTab'

type Tab = 'topics'|'materials'|'quizzes'

export default function Editor(){
  const [tab, setTab] = useState<Tab>('topics')
  const [topics, setTopics] = useState<Topic[]>([])
  const [activeTopicId, setActiveTopicId] = useState<string|undefined>()
  const { push } = useToast()
  const { t } = useTranslation()

  async function reload() {
    try {
      const data = await listRootTopics()
      setTopics(data)
      if (!activeTopicId && data.length) setActiveTopicId(data[0].id)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('editor.error.loadTopicsFailed')
      push({ type:'error', msg })
    }
  }

  useEffect(()=>{ reload() }, [])

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="card h-max sticky top-24">
        <h3 className="font-display font-semibold mb-3">{t('editor.title')}</h3>
        <div className="flex flex-col gap-2">
          <button onClick={()=>setTab('topics')}
                  className={'px-4 py-2 rounded-xl text-left '+(tab==='topics'?'bg-gradient-primary text-white':'hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <ListChecks size={16} className="inline mr-2"/> {t('editor.tab.topics')}
          </button>
          <button onClick={()=>setTab('materials')}
                  className={'px-4 py-2 rounded-xl text-left '+(tab==='materials'?'bg-gradient-primary text-white':'hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <FileText size={16} className="inline mr-2"/> {t('editor.tab.materials')}
          </button>
          <button onClick={()=>setTab('quizzes')}
                  className={'px-4 py-2 rounded-xl text-left '+(tab==='quizzes'?'bg-gradient-primary text-white':'hover:bg-gray-100 dark:hover:bg-gray-800')}>
            <BookOpen size={16} className="inline mr-2"/> {t('editor.tab.quizzes')}
          </button>
        </div>

        <div className="mt-6">
          <h4 className="font-semibold mb-2 text-sm">{t('editor.label.activeTopic')}</h4>
          <select
            value={activeTopicId || ''}
            onChange={e=> setActiveTopicId(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-gray-900"
          >
            <option value="" disabled>{t('editor.placeholder.selectTopic')}</option>
            {topics.map(topic=> <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          <button onClick={reload} className="btn-outline mt-2 w-full"><Plus size={14}/> {t('editor.action.reloadList')}</button>
        </div>
      </aside>

      <section className="space-y-6">
        {tab==='topics' && <TopicsTab onChanged={reload} />}
        {tab==='materials' && <MaterialsTab topicId={activeTopicId} />}
        {tab==='quizzes' && <QuizzesTab topicId={activeTopicId} />}
      </section>
    </div>
  )
}
