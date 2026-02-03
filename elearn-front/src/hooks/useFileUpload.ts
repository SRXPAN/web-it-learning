import { useState, useCallback, useRef, useEffect } from 'react'
import { apiPost, apiDelete } from '@/lib/http'

interface PresignResponse {
  fileId: string
  uploadUrl: string
  key: string
}

export interface FileInfo {
  id: string
  url: string
  originalName: string
  mimeType: string
  size: number
}

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export type FileCategory = 'avatars' | 'materials' | 'attachments'

const MAX_FILE_SIZE: Record<FileCategory, number> = {
  avatars: 5 * 1024 * 1024,      // 5MB
  materials: 50 * 1024 * 1024,   // 50MB
  attachments: 25 * 1024 * 1024, // 25MB
}

const ALLOWED_TYPES: Record<FileCategory, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  materials: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'text/plain',
  ],
  attachments: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'text/plain',
  ],
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Зберігаємо посилання на поточний запит, щоб можна було скасувати
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const upload = useCallback(async (
    file: File,
    category: FileCategory = 'attachments'
  ): Promise<FileInfo | null> => {
    setError(null)

    const maxSize = MAX_FILE_SIZE[category] ?? MAX_FILE_SIZE.attachments
    if (file.size > maxSize) {
      setError(`Файл занадто великий. Максимум ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`)
      return null
    }

    const allowedTypes = ALLOWED_TYPES[category] ?? ALLOWED_TYPES.attachments
    if (!allowedTypes.includes(file.type)) {
      setError('Непідтримуваний тип файлу.')
      return null
    }

    setUploading(true)
    setProgress({ loaded: 0, total: file.size, percent: 0 })

    try {
      // 1. Отримуємо Presigned URL від бекенду
      const presign = await apiPost<PresignResponse>('/files/presign-upload', {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        category,
      })

      // 2. Завантажуємо файл напряму в R2/S3 через XHR (для прогресу)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress({
              loaded: e.loaded,
              total: e.total,
              percent: Math.round((e.loaded / e.total) * 100),
            })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('PUT', presign.uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type) // Важливо: тип має співпадати з підписаним
        xhr.send(file)
      })

      // 3. Підтверджуємо завантаження на бекенді
      const fileInfo = await apiPost<FileInfo>('/files/confirm', { fileId: presign.fileId })

      setProgress({ loaded: file.size, total: file.size, percent: 100 })
      return fileInfo

    } catch (err) {
      if (err instanceof Error && err.message === 'Upload cancelled') {
        setError(null)
      } else {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setError(message)
        console.error('File upload error:', err)
      }
      return null
    } finally {
      setUploading(false)
      xhrRef.current = null
    }
  }, [])

  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      setUploading(false)
      setProgress(null)
    }
  }, [])

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await apiDelete(`/files/${fileId}`)
      return true
    } catch {
      return false
    }
  }, [])

  // Очищення при розмонтуванні компонента
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort()
      }
    }
  }, [])

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(null)
    setError(null)
  }, [])

  return {
    upload,
    cancelUpload,
    deleteFile,
    uploading,
    progress,
    error,
    reset,
  }
}
