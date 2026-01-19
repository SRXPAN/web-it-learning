import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen,
  Trash2,
  Download,
  Image,
  FileText,
  File,
  Film,
  Music,
  Filter,
  AlertCircle
} from 'lucide-react'

import { useTranslation } from '@/i18n/useTranslation'
import { api } from '@/lib/http'
import { SkeletonList } from '@/components/Skeletons'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Pagination } from '@/components/admin/Pagination'

// --- Types ---

interface FileRecord {
  id: string
  originalName: string
  mimeType: string
  size: number
  category: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'SIGNED'
  createdAt: string
  url: string // Presigned or direct URL
  uploadedBy?: {
    id: string
    name: string
    email: string
  }
}

interface FilesResponse {
  data: FileRecord[]
  meta: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// --- Constants ---

const CATEGORY_COLORS: Record<string, string> = {
  avatar: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  material: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  attachment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function AdminFiles() {
  const { t } = useTranslation()
  
  // State
  const [files, setFiles] = useState<FileRecord[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<FileRecord | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const fetchFiles = useCallback(async (page = 1, category = '') => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(category && { category })
      })

      const response = await api<FilesResponse>(`/admin/files?${params.toString()}`)
      setFiles(response.data)
      setPagination(response.meta)
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || t('common.loadFailed'))
      }
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [t])

  // Initial load
  useEffect(() => {
    fetchFiles(1, categoryFilter)
  }, [fetchFiles, categoryFilter])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await api(`/admin/files/${deleteConfirm.id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      fetchFiles(pagination.page, categoryFilter)
    } catch (err: any) {
      setError(err.message || 'Failed to delete file')
    }
  }

  const handleDownload = (file: FileRecord) => {
    // If we have a direct URL, use it. Otherwise, request a signed URL.
    if (file.url) {
      window.open(file.url, '_blank')
    } else {
      // Fallback: Request download URL from API
      api<{ url: string }>(`/files/${file.id}/download`)
        .then(res => window.open(res.url, '_blank'))
        .catch(() => alert('Download failed'))
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 font-display">
            <FolderOpen className="w-8 h-8 text-primary-600" />
            {t('admin.files', 'Files')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('admin.filesDescription', 'Manage uploaded files and assets')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
            >
              <option value="">{t('admin.allCategories', 'All Categories')}</option>
              <option value="avatar">{t('admin.avatars', 'Avatars')}</option>
              <option value="material">{t('admin.materials', 'Materials')}</option>
              <option value="attachment">{t('admin.attachments', 'Attachments')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <SkeletonList count={6} />
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('admin.noFilesFound', 'No files found')}
              </h3>
              {categoryFilter && (
                <button 
                  onClick={() => setCategoryFilter('')}
                  className="mt-2 text-primary-600 hover:underline text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.mimeType)
                return (
                  <div
                    key={file.id}
                    className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all hover:border-primary-300 dark:hover:border-primary-700"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shrink-0">
                        <FileIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm" title={file.originalName}>
                          {file.originalName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other}`}>
                            {file.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 px-1">
                      <div>Uploaded: {new Date(file.createdAt).toLocaleDateString()}</div>
                      {file.uploadedBy && (
                        <div className="truncate">By: {file.uploadedBy.name}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handleDownload(file)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('common.download', 'Download')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(file)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                onPageChange={(p) => fetchFiles(p, categoryFilter)}
                disabled={loading}
              />
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={t('admin.deleteFile', 'Delete File')}
        message={t('admin.deleteFileConfirm', 'Are you sure you want to delete {name}?').replace('{name}', deleteConfirm?.originalName || '')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  )
}