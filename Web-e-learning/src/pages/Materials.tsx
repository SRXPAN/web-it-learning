import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import useCatalogStore from '@/store/catalog'
import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import type { Category } from '@elearn/shared'

import {
  DEFAULT_CAT,
  TopicSidebar,
  DashboardView,
  TopicNode,
  Material,
} from '@/pages/materialsComponents'
import { MaterialsHeader } from '@/pages/materialsComponents/MaterialsHeader'
import { TopicView } from '@/pages/materialsComponents/TopicView'
import { SkeletonDashboard } from '@/components/Skeletons'

export type Tab = 'ALL' | 'PDF' | 'VIDEO' | 'TEXT' | 'LINK'

export default function Materials() {
  const { topics: roots, loadTopics, loading } = useCatalogStore()
  const { lang } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // State from URL or defaults
  const activeCat = (searchParams.get('cat') as Category) || DEFAULT_CAT
  const activeTopicId = searchParams.get('topic')
  const activeSubId = searchParams.get('sub')
  
  const [tab, setTab] = useState<Tab>('ALL')
  const [query, setQuery] = useState('')
  
  // Reserved for text material viewer modal in the future
  const [_selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  
  // Load topics on mount/lang change (force fresh data)
  useEffect(() => {
    // Ensure we always fetch fresh topics when visiting this page
    try {
      useCatalogStore.getState().invalidateTopics()
    } catch {}
    loadTopics(lang as 'UA' | 'PL' | 'EN')
  }, [loadTopics, lang])

  // --- Helpers for Navigation ---

  const setActiveCat = (cat: Category) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('cat', cat)
      newParams.delete('topic')
      newParams.delete('sub')
      return newParams
    })
  }

  const setActiveTopicId = (id: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      if (id) newParams.set('topic', id)
      else newParams.delete('topic')
      newParams.delete('sub')
      return newParams
    })
  }

  const setActiveSubId = (id: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      if (id) newParams.set('sub', id)
      else newParams.delete('sub')
      return newParams
    })
  }

  // --- Derived State ---

  const categories = useMemo(() => {
    const map = new Map<Category, TopicNode[]>()
    if (roots && roots.length > 0) {
      roots.forEach((r) => {
        const key = (r.category ?? DEFAULT_CAT) as Category
        const arr = map.get(key) || []
        arr.push(r)
        map.set(key, arr)
      })
    }
    return map
  }, [roots])

  const catTopics = categories.get(activeCat) || []

  // Auto-select first topic if none selected but category has topics
  useEffect(() => {
    if (!activeTopicId && catTopics.length > 0 && !loading) {
      // Don't auto-select on mobile to show dashboard view first
      if (window.innerWidth >= 1024) { 
        setActiveTopicId(catTopics[0].id)
      }
    }
  }, [activeCat, catTopics, activeTopicId, loading])

  const activeTopic = useMemo(
    () => catTopics.find((t) => t.id === activeTopicId) || null,
    [catTopics, activeTopicId]
  )
  
  const activeSub = useMemo(
    () => activeTopic?.children?.find((c: TopicNode) => c.id === activeSubId) || null,
    [activeTopic, activeSubId]
  )

  const isDashboardView = !activeTopic

  // --- Handlers ---

  const filteredMaterials = useCallback((list: Material[]) => {
    let result = list
    
    // Filter by Tab
    if (tab !== 'ALL') {
      result = result.filter((m) => m.type.toUpperCase() === tab)
    }
    
    // Filter by Query
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter((m) => m.title.toLowerCase().includes(q))
    }
    
    return result
  }, [tab, query])

  const handleOpenMaterial = useCallback(async (material: Material) => {
    // Optimistically mark material as seen in local state
    useCatalogStore.getState().markMaterialAsSeen(material.id)
    
    // Mark material as seen on backend
    try {
      await api('/progress/viewed', {
        method: 'POST',
        body: JSON.stringify({ materialId: material.id })
      })
    } catch (e) {
      console.error('Failed to mark material as complete', e)
      // Reload topics to ensure consistency if API call failed
      useCatalogStore.getState().invalidateTopics()
      loadTopics(lang as 'UA' | 'PL' | 'EN')
    }
    
    // Open material based on type
    const url = material.url || material.content
    if (material.type === 'text') {
      // For text materials, open content in new window/tab
      if (url) {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>${material.title}</title>
                <style>
                  body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
                  h1 { color: #333; }
                </style>
              </head>
              <body>
                <h1>${material.title}</h1>
                <div>${url}</div>
              </body>
            </html>
          `)
          newWindow.document.close()
        }
      }
      setSelectedMaterial(material)
    } else if (url && (material.type === 'link' || material.type === 'pdf' || material.type === 'video')) {
      window.open(url, '_blank')
    }
  }, [loadTopics, lang])

  return (
    <>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 px-4 md:px-8 py-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <MaterialsHeader
            activeCat={activeCat}
            categories={categories}
            onCategoryChange={setActiveCat}
          />

          <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
            
            <TopicSidebar
              catTopics={catTopics}
              activeTopicId={activeTopicId}
              activeSubId={activeSubId}
              loading={loading}
              onSelectTopic={setActiveTopicId}
              onSelectSub={(topicId, subId) => {
                setActiveTopicId(topicId)
                setActiveSubId(subId)
              }}
            />

            <main className="space-y-6 min-w-0">
              {/* Breadcrumbs can be added here if needed, but sidebar + header usually enough */}

              {loading && !roots.length ? (
                <SkeletonDashboard />
              ) : isDashboardView ? (
                <DashboardView catTopics={catTopics} onSelectTopic={setActiveTopicId} />
              ) : (
                <TopicView
                  activeTopic={activeTopic}
                  activeSub={activeSub as TopicNode | null}
                  tab={tab}
                  setTab={setTab}
                  query={query}
                  setQuery={setQuery}
                  filteredMaterials={filteredMaterials}
                  openMaterial={handleOpenMaterial}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  )
}