/**
 * S3/R2 Compatible Storage Service
 * Works with Cloudflare R2 (Recommended), AWS S3, MinIO
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import path from 'path'
import { getEnv } from '../utils/env.js' // Припускаю, що цей хелпер у тебе є з попередніх файлів

// === CONFIGURATION ===
const config = {
  endpoint: getEnv('S3_ENDPOINT', 'R2 API Endpoint URL'), // Напр: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  region: getEnv('S3_REGION', 'auto',), // Для R2 завжди 'auto'
  bucket: getEnv('S3_BUCKET_NAME', 'your-bucket-name'),
  accessKeyId: getEnv('S3_ACCESS_KEY_ID', 'your-access-key-id'),
  secretAccessKey: getEnv('S3_SECRET_ACCESS_KEY', 'your-secret-access-key'),
  publicUrl: getEnv('S3_PUBLIC_URL', 'https://cdn.elearn.com'), // Напр: https://cdn.elearn.com (твій домен підключений до R2)
}

// === S3 CLIENT INIT ===
const s3Client = new S3Client({
  region: config.region,
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  forcePathStyle: false, // Для R2 зазвичай false, для MinIO може бути true
})

// File categories
export type FileCategory = 'avatars' | 'materials' | 'attachments' | 'temp'

// Generate unique file key (Year/Month/UUID)
export function generateFileKey(category: FileCategory, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const uuid = randomUUID()
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/') // 2023/10/25
  return `${category}/${date}/${uuid}${ext}`
}

/**
 * Get presigned URL for upload (DIRECT Browser -> R2)
 * Server RAM is NOT used for the file content.
 */
export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn = 3600
): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: mimeType,
    // ACL: 'public-read', // R2 не підтримує ACL, керуйте доступом через бакети/домени
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })
  return { url, key }
}

/**
 * Get presigned URL for download (For PRIVATE files)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get public URL (For PUBLIC files like avatars)
 * Requires R2 bucket to be connected to a custom domain or allow public access
 */
export function getPublicUrl(key: string): string {
  if (config.publicUrl) {
    // Remove trailing slash if exists to avoid double slash
    const baseUrl = config.publicUrl.replace(/\/$/, '')
    return `${baseUrl}/${key}`
  }
  // Fallback (Not recommended for prod as R2 raw URLs are usually private)
  return `${config.endpoint}/${config.bucket}/${key}`
}

// Delete file
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  await s3Client.send(command)
}

// Allowed MIME types
export const allowedMimeTypes: Record<FileCategory, string[]> = {
  avatars: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  materials: [
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/markdown',
    'application/epub+zip', // Books
  ],
  attachments: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
  ],
  temp: ['*/*'],
}

// Max file sizes (in bytes)
// NOTE: Since we use Presigned URLs, these limits are logical checks, 
// not server RAM limits. We can safely increase them for videos.
export const maxFileSizes: Record<FileCategory, number> = {
  avatars: 5 * 1024 * 1024,      // 5MB
  materials: 500 * 1024 * 1024,  // 500MB (Videos/Books allowed)
  attachments: 50 * 1024 * 1024, // 50MB
  temp: 500 * 1024 * 1024,       // 500MB
}

// Validate file metadata (runs on server before giving upload URL)
export function validateFile(
  category: FileCategory,
  mimeType: string,
  size: number
): { valid: boolean; error?: string } {
  const allowedTypes = allowedMimeTypes[category]
  const maxSize = maxFileSizes[category]

  // Check wildcard or specific type
  if (!allowedTypes.includes('*/*') && !allowedTypes.includes(mimeType)) {
    return { valid: false, error: `File type ${mimeType} not allowed for ${category}` }
  }

  if (size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` }
  }

  return { valid: true }
}

export { config as storageConfig }