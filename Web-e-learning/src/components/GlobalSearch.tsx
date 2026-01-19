// src/components/GlobalSearch.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, BookOpen, Trophy, FileText, Loader2 } from 'lucide-react'
import useCatalogStore from '@/store/catalog'
import { useTranslation } from '@/i18n/useTranslation'

interface SearchResult {
  id: string
  type: 'topic' | 'quiz' | 'lesson'
  title: string
  description?: string
  url: string
}

export default function GlobalSearch() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { topics } = useCatalogStore()

  // Search logic
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    const q = searchQuery.toLowerCase()
    const searchResults: SearchResult[] = []

    // Search through topics
    topics.forEach(topic => {
      if (topic.name.toLowerCase().includes(q)) {
        searchResults.push({
          id: topic.id,
          type: 'topic',
          title: topic.name,
          description: `${t('search.topicWith', 'Topic with')} ${topic.quizzes.length} ${t('search.quizzes', 'quizzes')}`,
          url: `/materials` // Можна змінити на конкретний URL топіка, якщо є
        })
      }

      // Search through quizzes
      topic.quizzes.forEach(quiz => {
        if (quiz.title.toLowerCase().includes(q)) {
          searchResults.push({
            id: quiz.id,
            type: 'quiz',
            title: quiz.title,
            description: `${quiz.durationSec} ${t('common.seconds', 'sec')}`,
            url: `/quiz` // Можна додати ID квіза в URL
          })
        }
      })
    })

    // Limit results
    setResults(searchResults.slice(0, 10))
    setLoading(false)
    setSelectedIndex(0)
  }, [topics, t])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSelect = (result: SearchResult) => {
    navigate(result.url)
    setIsOpen(false)
    setQuery('')
  }

  // Keyboard navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    }
  }

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'topic': return <BookOpen size={18} />
      case 'quiz': return <Trophy size={18} />
      case 'lesson': return <FileText size={18} />
    }
  }

  return (
    <>
      {/* Search Trigger (Desktop) */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm group border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
        aria-label={t('search.placeholder', 'Search...')}
      >
        <Search size={16} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
        <span className="hidden lg:inline">{t('search.placeholder', 'Search...')}</span>
        <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs font-sans">⌘K</kbd>
      </button>

      {/* Search Trigger (Mobile) */}
      <button
        onClick={() => setIsOpen(true)}
        className="sm:hidden p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label={t('search.open', 'Open search')}
      >
        <Search size={20} />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Panel */}
          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-neutral-200 dark:ring-neutral-800">
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <Search size={20} className="text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.fullPlaceholder', 'Search topics, quizzes, lessons...')}
                className="flex-1 bg-transparent outline-none text-neutral-900 dark:text-white placeholder-neutral-400 h-10"
              />
              {loading ? (
                <Loader2 size={18} className="animate-spin text-neutral-400 shrink-0" />
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
              {results.length > 0 ? (
                <ul className="py-2">
                  {results.map((result, index) => (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          result.type === 'quiz' 
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : result.type === 'topic'
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-white truncate">
                            {result.title}
                          </p>
                          {result.description && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:block">
                          {t(`search.type.${result.type}`, result.type)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim() ? (
                <div className="py-16 text-center text-neutral-500 dark:text-neutral-400">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                    <Search size={24} className="opacity-50" />
                  </div>
                  <p className="font-medium">{t('search.noResults', 'No results found')}</p>
                  <p className="text-sm mt-1">{t('search.tryAnother', 'Try searching for something else')}</p>
                </div>
              ) : (
                <div className="py-12 px-4 text-center text-neutral-500 dark:text-neutral-400">
                  <p className="text-sm mb-6">{t('search.startTyping', 'Type to start searching')}</p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    <span className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">↑↓ {t('search.hint.navigation', 'to navigate')}</span>
                    <span className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">↵ {t('search.hint.select', 'to select')}</span>
                    <span className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">esc {t('search.hint.close', 'to close')}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer (Results count) */}
            {results.length > 0 && (
              <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 flex justify-between">
                <span>{results.length} {t('search.results', 'results')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}