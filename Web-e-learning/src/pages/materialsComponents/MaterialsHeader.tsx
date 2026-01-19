import { memo, useState, useRef, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { CategoryIcon } from './CategoryIcon'
import { useTranslation } from '@/i18n/useTranslation'
import type { Category, TopicNode } from './types'
import type { Lang } from '@elearn/shared'

interface MaterialsHeaderProps {
  activeCat: Category
  categories: Map<Category, TopicNode[]> // Виправлено тип
  onCategoryChange: (cat: Category) => void
}

export const MaterialsHeader = memo(function MaterialsHeader({
  activeCat,
  categories,
  onCategoryChange,
}: MaterialsHeaderProps) {
  const { t, lang } = useTranslation()
  const [showDropdown, setShowDropdown] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const catArray = Array.from(categories.keys()) as Category[]

  // Перевірка можливості скролу
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        setCanScrollLeft(scrollLeft > 0)
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
      }
    }
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [categories])

  // Закриття dropdown при кліку за межами
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
          setCanScrollLeft(scrollLeft > 0)
          setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
        }
      }, 300)
    }
  }

  // Helper to get translated category name
  const getCategoryName = (cat: Category) => {
    // Assuming keys in translation file follow the pattern 'category.Programming', etc.
    // If not, fallback to the category string itself
    return t(`category.${cat.charAt(0).toLowerCase() + cat.slice(1)}` as any, cat)
  }

  return (
    <header className="rounded-2xl md:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* Top Section */}
      <div className="px-4 sm:px-6 md:px-7 py-5 md:py-6 border-b border-neutral-100 dark:border-neutral-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white font-display">
                {t('materials.title', 'Materials')}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {catArray.length} {t('materials.categoriesAvailable', 'categories available')}
              </p>
            </div>
          </div>

          {/* Mobile Dropdown */}
          <div className="relative sm:hidden" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-primary-600 dark:text-primary-400">
                  <CategoryIcon category={activeCat} />
                </span>
                <span className="font-medium text-neutral-900 dark:text-white">
                  {getCategoryName(activeCat)}
                </span>
              </div>
              <ChevronDown
                size={18}
                className={`text-neutral-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl z-50 max-h-80 overflow-auto">
                {catArray.map((cat) => {
                  const isActive = activeCat === cat
                  const count = categories.get(cat)?.length || 0
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        onCategoryChange(cat)
                        setShowDropdown(false)
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                        isActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}>
                          <CategoryIcon category={cat} />
                        </span>
                        <span className={`font-medium ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {getCategoryName(cat)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">{count}</span>
                        {isActive && <Check size={16} className="text-primary-600 dark:text-primary-400" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Category Pills */}
      <div className="hidden sm:block relative px-4 sm:px-6 md:px-7 py-4 bg-neutral-50/50 dark:bg-neutral-900/50">
        {/* Scroll buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={() => {
            if (scrollRef.current) {
              const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
              setCanScrollLeft(scrollLeft > 0)
              setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5)
            }
          }}
        >
          {catArray.map((cat) => {
            const isActive = activeCat === cat
            const count = categories.get(cat)?.length || 0
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 transform scale-[1.02]'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm'
                }`}
              >
                <span className={isActive ? 'text-primary-200' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-primary-500 transition-colors'}>
                  <CategoryIcon category={cat} />
                </span>
                <span>{getCategoryName(cat)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md min-w-[1.2rem] text-center ${
                  isActive
                    ? 'bg-primary-500 text-primary-100'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
})