/**
 * Admin Translations Management Page
 * Edit UI translations (key -> UA/PL/EN values)
 */
import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAdminTranslations } from '@/hooks/useAdmin'
import {
  Languages,
  Search,
  Plus,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Loading } from '@/components/Loading'

const NAMESPACES = ['common', 'nav', 'dashboard', 'materials', 'quiz', 'profile', 'auth', 'editor', 'admin', 'errors']

export default function AdminTranslations() {
  const { t, lang } = useTranslation()
  const {
    translations,
    pagination,
    loading,
    error,
    fetchTranslations,
    createTranslation,
    updateTranslation,
  } = useAdminTranslations(1, 30)
  
  const [search, setSearch] = useState('')
  const [namespaceFilter, setNamespaceFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ UA: string; PL: string; EN: string }>({ UA: '', PL: '', EN: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValues, setNewValues] = useState({ UA: '', PL: '', EN: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const startEdit = (tr: { id: string; key: string; translations: Record<string, string> }) => {
    setEditingId(tr.id)
    setEditValues({
      UA: tr.translations.UA || '',
      PL: tr.translations.PL || '',
      EN: tr.translations.EN || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({ UA: '', PL: '', EN: '' })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateTranslation(editingId, editValues)
      cancelEdit()
    } catch (err) {
      console.error('Failed to save:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save translation')
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newKey.trim()) return
    
    // Validate key format (namespace.key)
    if (!newKey.includes('.')) {
      setSaveError('Key must include namespace (e.g., common.save)')
      return
    }
    
    const namespace = newKey.split('.')[0]
    if (!NAMESPACES.includes(namespace)) {
      setSaveError(`Namespace must be one of: ${NAMESPACES.join(', ')}`)
      return
    }
    
    // Require at least one translation
    if (!newValues.UA && !newValues.PL && !newValues.EN) {
      setSaveError('At least one translation is required')
      return
    }
    
    setSaving(true)
    setSaveError(null)
    try {
      await createTranslation({ key: newKey, translations: newValues })
      setShowCreate(false)
      setNewKey('')
      setNewValues({ UA: '', PL: '', EN: '' })
    } catch (err) {
      console.error('Failed to create:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to create translation')
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = () => {
    fetchTranslations({ page: 1, search, namespace: namespaceFilter })
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchTranslations({ page: 1, search, namespace: namespaceFilter })
    }, 300)
    return () => clearTimeout(debounce)
  }, [search, namespaceFilter])

  if (loading && translations.length === 0) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Languages className="w-7 h-7 mr-3" />
            {t('admin.translations')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            UI translations management ({pagination.total} keys)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchTranslations({ page: pagination.page, search, namespace: namespaceFilter })}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Key
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={namespaceFilter}
          onChange={(e) => {
            setNamespaceFilter(e.target.value)
            fetchTranslations({ page: 1, search, namespace: e.target.value })
          }}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="">All namespaces</option>
          {NAMESPACES.map(ns => (
            <option key={ns} value={ns}>{ns}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t('common.search')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      
      {/* Save Error */}
      {saveError && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-600 dark:text-yellow-400">
          {saveError}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Translation Key
            </h2>
            {saveError && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
                {saveError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key (e.g., common.save)
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  placeholder="namespace.key"
                />
              </div>
              {(['UA', 'PL', 'EN'] as const).map(lng => (
                <div key={lng}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {lng}
                  </label>
                  <input
                    type="text"
                    value={newValues[lng]}
                    onChange={(e) => setNewValues({ ...newValues, [lng]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newKey.trim() || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                🇺🇦 UA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                🇵🇱 PL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                🇬🇧 EN
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {translations.map((tr) => (
              <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3">
                  <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {tr.key}
                  </code>
                </td>
                {editingId === tr.id ? (
                  <>
                    {(['UA', 'PL', 'EN'] as const).map(lng => (
                      <td key={lng} className="px-4 py-3">
                        <input
                          type="text"
                          value={editValues[lng]}
                          onChange={(e) => setEditValues({ ...editValues, [lng]: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={saveEdit}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {tr.translations.UA || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {tr.translations.PL || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {tr.translations.EN || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => startEdit(tr)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {translations.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No translations found
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchTranslations({ page: pagination.page - 1, search, namespace: namespaceFilter })}
              disabled={pagination.page <= 1}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => fetchTranslations({ page: pagination.page + 1, search, namespace: namespaceFilter })}
              disabled={pagination.page >= pagination.pages}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
