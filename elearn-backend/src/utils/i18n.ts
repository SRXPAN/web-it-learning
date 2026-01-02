// src/utils/i18n.ts
import type { Lang } from '@elearn/shared'

type TranslationsJson = Record<string, string> | null | undefined

// Type for I18nKey with values from Prisma include
export type I18nKeyWithValues = {
  id: string
  key: string
  namespace: string
  values: { lang: string; value: string }[]
} | null

/**
 * Отримує переклад з I18nKey.values масиву
 * @param i18nKey - Об'єкт I18nKey з включеними values
 * @param lang - Мова користувача
 * @param fallback - Значення за замовчуванням
 */
export function getI18nKeyTranslation(
  i18nKey: I18nKeyWithValues,
  lang: Lang,
  fallback: string
): string {
  if (!i18nKey?.values?.length) return fallback
  
  // Find translation for requested language
  const requestedLang = i18nKey.values.find(v => v.lang === lang)
  if (requestedLang?.value) return requestedLang.value
  
  // Fallback to EN
  const enLang = i18nKey.values.find(v => v.lang === 'EN')
  if (enLang?.value) return enLang.value
  
  // Return first available
  const firstAvailable = i18nKey.values[0]
  if (firstAvailable?.value) return firstAvailable.value
  
  return fallback
}

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
