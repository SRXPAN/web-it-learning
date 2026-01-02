/**
 * Check i18n coverage - compare keys used in frontend vs keys in DB
 * Run: npm run i18n:check
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

const FRONTEND_SRC = path.join(__dirname, '../../Web-e-learning/src')
const LANGS = ['UA', 'PL', 'EN'] as const

// Regex patterns to find translation keys
const KEY_PATTERNS = [
  /t\(['"]([^'"]+)['"]\)/g,           // t('key') or t("key")
  /t\(`([^`]+)`\)/g,                   // t(`key`) - template literal without interpolation
]

/**
 * Recursively scan directory for files
 */
function scanDir(dir: string, extensions: string[]): string[] {
  const files: string[] = []
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ Directory not found: ${dir}`)
    return files
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        files.push(...scanDir(fullPath, extensions))
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (extensions.includes(ext)) {
        files.push(fullPath)
      }
    }
  }
  
  return files
}

/**
 * Extract translation keys from file content
 */
function extractKeys(content: string): Set<string> {
  const keys = new Set<string>()
  
  for (const pattern of KEY_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1]
      // Skip keys with template interpolation like ${var}
      // Skip keys that don't look like translation keys (must have dot and be lowercase)
      if (!key.includes('${') && /^[a-z]+\.[a-zA-Z.]+$/.test(key)) {
        keys.add(key)
      }
    }
  }
  
  return keys
}

/**
 * Scan frontend for all translation keys used
 */
function scanFrontendKeys(): Set<string> {
  console.log(`📂 Scanning frontend: ${FRONTEND_SRC}`)
  
  const files = scanDir(FRONTEND_SRC, ['.tsx', '.ts', '.jsx', '.js'])
  console.log(`   Found ${files.length} source files`)
  
  const allKeys = new Set<string>()
  const keysByFile = new Map<string, Set<string>>()
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const keys = extractKeys(content)
    
    if (keys.size > 0) {
      const relativePath = path.relative(FRONTEND_SRC, file)
      keysByFile.set(relativePath, keys)
      keys.forEach(k => allKeys.add(k))
    }
  }
  
  console.log(`   Found ${allKeys.size} unique translation keys`)
  console.log(`   In ${keysByFile.size} files using translations\n`)
  
  return allKeys
}

/**
 * Get all translations from database
 */
async function getDbTranslations(): Promise<Map<string, Record<string, string>>> {
  const translations = await prisma.uiTranslation.findMany({
    select: { key: true, translations: true }
  })
  
  const map = new Map<string, Record<string, string>>()
  for (const t of translations) {
    map.set(t.key, t.translations as Record<string, string>)
  }
  
  return map
}

/**
 * Main check function
 */
async function main() {
  console.log('🔍 i18n Coverage Check\n')
  console.log('='.repeat(60))
  
  // 1. Scan frontend for keys
  const usedKeys = scanFrontendKeys()
  
  // 2. Get DB translations
  console.log('📊 Fetching translations from database...')
  const dbTranslations = await getDbTranslations()
  console.log(`   Found ${dbTranslations.size} keys in database\n`)
  
  // 3. Find missing keys
  const missingInDb: string[] = []
  const missingByLang: Record<string, string[]> = { UA: [], PL: [], EN: [] }
  const extraInDb: string[] = []
  
  // Keys used in frontend but not in DB at all
  for (const key of usedKeys) {
    if (!dbTranslations.has(key)) {
      missingInDb.push(key)
    } else {
      // Check if translation exists for each language
      const trans = dbTranslations.get(key)!
      for (const lang of LANGS) {
        if (!trans[lang] || trans[lang].trim() === '') {
          missingByLang[lang].push(key)
        }
      }
    }
  }
  
  // Keys in DB but not used in frontend (potential dead code)
  for (const key of dbTranslations.keys()) {
    if (!usedKeys.has(key)) {
      extraInDb.push(key)
    }
  }
  
  // 4. Report results
  console.log('='.repeat(60))
  console.log('📋 RESULTS\n')
  
  // Missing in DB entirely
  if (missingInDb.length > 0) {
    console.log(`❌ Keys used in frontend but NOT in database (${missingInDb.length}):`)
    missingInDb.sort().slice(0, 30).forEach(k => console.log(`   - ${k}`))
    if (missingInDb.length > 30) {
      console.log(`   ... and ${missingInDb.length - 30} more`)
    }
    console.log()
  } else {
    console.log('✅ All frontend keys exist in database\n')
  }
  
  // Missing translations per language
  for (const lang of LANGS) {
    const missing = missingByLang[lang]
    if (missing.length > 0) {
      console.log(`⚠️  Keys missing ${lang} translation (${missing.length}):`)
      missing.sort().slice(0, 10).forEach(k => console.log(`   - ${k}`))
      if (missing.length > 10) {
        console.log(`   ... and ${missing.length - 10} more`)
      }
      console.log()
    } else {
      console.log(`✅ All keys have ${lang} translation\n`)
    }
  }
  
  // Extra keys in DB (unused)
  if (extraInDb.length > 0) {
    console.log(`ℹ️  Keys in database but NOT used in frontend (${extraInDb.length}):`)
    extraInDb.sort().slice(0, 15).forEach(k => console.log(`   - ${k}`))
    if (extraInDb.length > 15) {
      console.log(`   ... and ${extraInDb.length - 15} more`)
    }
    console.log()
  }
  
  // Summary
  console.log('='.repeat(60))
  console.log('📈 SUMMARY\n')
  console.log(`   Frontend keys used:     ${usedKeys.size}`)
  console.log(`   Database keys:          ${dbTranslations.size}`)
  console.log(`   Missing in DB:          ${missingInDb.length}`)
  console.log(`   Missing UA translation: ${missingByLang.UA.length}`)
  console.log(`   Missing PL translation: ${missingByLang.PL.length}`)
  console.log(`   Missing EN translation: ${missingByLang.EN.length}`)
  console.log(`   Unused in frontend:     ${extraInDb.length}`)
  
  const coverage = dbTranslations.size > 0 
    ? Math.round(((usedKeys.size - missingInDb.length) / usedKeys.size) * 100)
    : 0
  console.log(`\n   Coverage: ${coverage}%`)
  
  // Exit code for CI
  if (missingInDb.length > 0) {
    console.log('\n⚠️  Some keys are missing translations!')
    process.exit(1)
  } else {
    console.log('\n✅ All keys covered!')
  }
}

main()
  .catch((e) => {
    console.error('❌ Check error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
