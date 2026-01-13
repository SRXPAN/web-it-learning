import { useCallback, useEffect, useMemo, useState } from 'react'
import { markMaterialSeen, isMaterialSeen } from '@/utils/progress'
import { logMaterialView } from '@/utils/activity'
import Breadcrumb from '@/components/Breadcrumb'
import { useTranslation } from '@/i18n/useTranslation'
import useCatalogStore from '@/store/catalog'
import { localize, Lang } from '@/utils/localize'
import {
  type TopicNode,
  type Material,
  type Tab,
  type Category,
  DEFAULT_CAT,
  getCategoryLabel,
  TopicSidebar,
  DashboardView,
} from './materialsComponents'
import { MaterialsHeader } from './materialsComponents/MaterialsHeader'
import { TopicView } from './materialsComponents/TopicView'
import { MaterialModal } from './materialsComponents/MaterialModal'

export default function Materials() {
  const { topics: roots, loadTopics } = useCatalogStore()
  const [loading, setLoading] = useState(false)
  const [activeCat, setActiveCat] = useState<Category>(DEFAULT_CAT)
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)
  const [activeSubId, setActiveSubId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ALL')
  const [query, setQuery] = useState('')
  const { lang } = useTranslation()
  const [initialized, setInitialized] = useState(false)
  
  // Модальне вікно
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  
  // Тригер для оновлення UI після позначки матеріалу
  const [progressVersion, setProgressVersion] = useState(0)

  useEffect(() => {
    setLoading(true)
    // Pass lang to load localized topics from API
    loadTopics(lang as 'UA' | 'PL' | 'EN').catch(console.error).finally(() => setLoading(false))
  }, [loadTopics, lang])

  // Ініціалізація один раз після завантаження тем
  useEffect(() => {
    if (!initialized && roots.length) {
      const firstCat = (roots[0].category ?? DEFAULT_CAT) as Category
      setActiveCat(firstCat)

      const topicsForCat = roots.filter(
        (r) => (r.category ?? DEFAULT_CAT) === firstCat
      )
      if (topicsForCat[0]) setActiveTopicId(topicsForCat[0].id)

      setInitialized(true)
    }
  }, [roots, initialized])

  const categories = useMemo(() => {
    const map = new Map<Category, TopicNode[]>()
    roots.forEach((r) => {
      const key = (r.category ?? DEFAULT_CAT) as Category
      const arr = map.get(key) || []
      arr.push(r)
      map.set(key, arr)
    })
    return map
  }, [roots])

  const catTopics = categories.get(activeCat) || []

  // При зміні категорії – вибираємо перший розділ цієї категорії
  useEffect(() => {
    if (!catTopics.length) {
      setActiveTopicId(null)
      setActiveSubId(null)
      return
    }
    if (activeTopicId && catTopics.some((t) => t.id === activeTopicId)) return
    setActiveTopicId(catTopics[0].id)
    setActiveSubId(null)
  }, [activeCat, catTopics, activeTopicId])

  const activeTopic = useMemo(
    () => catTopics.find((t) => t.id === activeTopicId) || null,
    [catTopics, activeTopicId]
  )
  const activeSub = useMemo(
    () => activeTopic?.children?.find((c) => c.id === activeSubId) || null,
    [activeTopic, activeSubId]
  )

  const isDashboardView = !activeTopic

  const filteredMaterials = useCallback((list: Material[]) => {
    // Не фільтруємо за lang, бо маємо мультимовну систему через titleCache/contentCache
    const byTab = tab === 'ALL' ? list : list.filter((m) => m.type === tab)
    const q = query.trim().toLowerCase()
    return q ? byTab.filter((m) => m.title.toLowerCase().includes(q)) : byTab
  }, [tab, query])

  // Відкриття матеріалу в модальному вікні
  const openMaterial = useCallback((m: Material) => {
    setSelectedMaterial(m)
  }, [])

  // Закриття модального вікна
  const closeMaterial = useCallback(() => {
    setSelectedMaterial(null)
  }, [])

  // Позначка матеріалу як переглянутого (з оновленням UI)
  const handleMarkComplete = useCallback((materialId: string) => {
    if (!isMaterialSeen(materialId)) {
      markMaterialSeen(materialId)
      logMaterialView()
      // Тригер оновлення UI
      setProgressVersion((v) => v + 1)
    }
  }, [])

  const handleSelectTopic = useCallback((topicId: string) => {
    setActiveTopicId(topicId)
    setActiveSubId(null)
  }, [])

  const handleSelectSub = useCallback((topicId: string, subId: string) => {
    setActiveTopicId(topicId)
    setActiveSubId(subId)
  }, [])

  const crumbs = useMemo(() => {
    const items: { label: string; onClick?: () => void; current?: boolean }[] = [
      {
        label: getCategoryLabel(activeCat, lang as Lang),
        onClick: () => {
          setActiveTopicId(catTopics[0]?.id ?? null)
          setActiveSubId(null)
        },
      },
    ]
    if (activeTopic) {
      const topicName = localize((activeTopic as any).nameJson, activeTopic.name, lang as Lang)
      items.push({
        label: topicName,
        onClick: () => setActiveSubId(null),
        current: !activeSub,
      })
    }
    if (activeSub) {
      const subName = localize((activeSub as any).nameJson, activeSub.name, lang as Lang)
      items.push({ label: subName, current: true })
    }
    return items
  }, [activeCat, catTopics, activeTopic, activeSub, lang])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-[#0f1115] dark:via-[#0f1115] dark:to-[#0f1115] px-3 sm:px-4 md:px-6 lg:px-8 py-5 md:py-6">
        <div className="max-w-7xl mx-auto space-y-5 md:space-y-6">
          <MaterialsHeader
            activeCat={activeCat}
            categories={categories}
            onCategoryChange={setActiveCat}
          />

          <div className="grid lg:grid-cols-[280px_1fr] gap-5 lg:gap-6 items-start">
            <TopicSidebar
              catTopics={catTopics}
              activeTopicId={activeTopicId}
              activeSubId={activeSubId}
              loading={loading}
              onSelectTopic={handleSelectTopic}
              onSelectSub={handleSelectSub}
            />

            <main className="space-y-5">
              <Breadcrumb items={crumbs} />

              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-28 sm:h-32 rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900" />
                  <div className="h-52 sm:h-64 rounded-2xl md:rounded-3xl bg-white dark:bg-gray-900" />
                </div>
              ) : isDashboardView ? (
                <DashboardView catTopics={catTopics} />
              ) : (
                <TopicView
                  key={progressVersion} // Ключ для примусового оновлення
                  activeTopic={activeTopic}
                  activeSub={activeSub}
                  tab={tab}
                  setTab={setTab}
                  query={query}
                  setQuery={setQuery}
                  filteredMaterials={filteredMaterials}
                  openMaterial={openMaterial}
                  progressVersion={progressVersion}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Material Modal */}
      {selectedMaterial && (
        <MaterialModal
          material={selectedMaterial}
          lang={lang as Lang}
          onClose={closeMaterial}
          onMarkComplete={handleMarkComplete}
        />
      )}
    </>
  )
}
