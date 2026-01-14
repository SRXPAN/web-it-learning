// src/utils/i18n.ts
/**
 * Utility functions for JSON-based localization
 * 
 * The system uses JSON cache fields for translations:
 * - titleCache: {"UA": "...", "EN": "...", "PL": "..."}
 * - descCache, contentCache, urlCache (similar structure)
 */
import type { Lang } from '@elearn/shared'

type TranslationsJson = Record<string, string> | null | undefined

/**
 * Отримує переклад з JSON поля або fallback значення
 * @param json - JSON об'єкт з перекладами {"UA": "...", "PL": "...", "EN": "..."}
 * @param lang - Мова користувача
 * @param fallback - Значення за замовчуванням (зазвичай EN версія)
 */
export function getTranslation(
  json: TranslationsJson,
  lang: Lang,
  fallback: string
): string {
  if (!json || typeof json !== 'object') return fallback
  
  const translations = json as Record<string, string>
  
  // Спробувати отримати переклад для запитаної мови
  if (translations[lang]) return translations[lang]
  
  // Fallback на EN
  if (translations['EN']) return translations['EN']
  
  // Повернути будь-який доступний переклад
  const firstAvailable = Object.values(translations)[0]
  if (firstAvailable) return firstAvailable
  
  return fallback
}

/**
 * Отримує вкладений переклад (для об'єктів типу {topic: {UA, PL, EN}, advice: {UA, PL, EN}})
 */
export function getNestedTranslation(
  json: Record<string, TranslationsJson> | null | undefined,
  field: string,
  lang: Lang,
  fallback: string = ''
): string {
  if (!json || typeof json !== 'object') return fallback
  
  const fieldTranslations = json[field]
  return getTranslation(fieldTranslations, lang, fallback)
}

/**
 * Трансформує об'єкт з JSON перекладами в об'єкт з локалізованими полями
 */
export function localizeObject<T extends Record<string, unknown>>(
  obj: T,
  lang: Lang,
  fieldsMap: Record<string, string> // {"nameJson": "name", "descJson": "description"}
): T {
  const result = { ...obj }
  
  for (const [jsonField, targetField] of Object.entries(fieldsMap)) {
    const json = obj[jsonField] as TranslationsJson
    const fallback = obj[targetField] as string || ''
    
    if (json) {
      (result as Record<string, unknown>)[targetField] = getTranslation(json, lang, fallback)
    }
  }
  
  return result
}

/**
 * Локалізує масив об'єктів
 */
export function localizeArray<T extends Record<string, unknown>>(
  arr: T[],
  lang: Lang,
  fieldsMap: Record<string, string>
): T[] {
  return arr.map(item => localizeObject(item, lang, fieldsMap))
}
