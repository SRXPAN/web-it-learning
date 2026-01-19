import { Globe, Check, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import type { Lang } from '@elearn/shared'

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'pills'
  className?: string
}

const languages: { code: Lang; name: string; flag: string }[] = [
  { code: 'UA', name: 'Українська', flag: '🇺🇦' },
  { code: 'PL', name: 'Polski', flag: '🇵🇱' },
  { code: 'EN', name: 'English', flag: '🇬🇧' },
]

export default function LanguageSelector({ variant = 'dropdown', className = '' }: LanguageSelectorProps) {
  const { t, lang, setLang } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = languages.find(l => l.code === lang) || languages[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Варіант "Таблетки" (наприклад, для футера або налаштувань)
  if (variant === 'pills') {
    return (
      <div className={`flex gap-2 ${className}`} role="group" aria-label={t('profile.language', 'Language')}>
        {languages.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              lang === l.code
                ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <span>{l.flag}</span>
            {l.code}
          </button>
        ))}
      </div>
    )
  }

  // Варіант "Випадаючий список" (для хедера)
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 group ${
          open 
            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
            : 'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
        }`}
        aria-label={t('profile.language', 'Select Language')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe size={18} />
        <span className="text-sm font-medium hidden sm:inline">{current.name}</span>
        <span className="text-sm font-medium sm:hidden">{current.code}</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
        />
      </button>

      {open && (
        <div 
          className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200"
          role="listbox"
        >
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              role="option"
              aria-selected={lang === l.code}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                lang === l.code 
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' 
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg leading-none">{l.flag}</span>
                {l.name}
              </span>
              {lang === l.code && <Check size={16} className="text-primary-600 dark:text-primary-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}