// src/services/materials.service.ts
import { prisma } from '../db.js'
import type { Prisma } from '@prisma/client'

export interface MaterialLocalizationDTO {
  type?: string
  titleEN?: string
  titleUA?: string
  titlePL?: string
  linkEN?: string
  linkUA?: string
  linkPL?: string
  contentEN?: string
  contentUA?: string
  contentPL?: string
}

/**
 * Updates a material with localized content
 * Handles fallbacks and JSON fields construction
 */
export async function updateMaterialWithLocalization(
  id: string,
  dto: MaterialLocalizationDTO
) {
  const updateData: Prisma.MaterialUpdateInput = {}

  // Type update if provided
  if (dto.type) {
    updateData.type = dto.type as any // Ideally imports MaterialType enum from client
  }

  // Legacy/Fallback fields (Main language EN)
  if (dto.titleEN) updateData.title = dto.titleEN
  if (dto.linkEN) updateData.url = dto.linkEN
  if (dto.contentEN) updateData.content = dto.contentEN

  // JSON Localization fields (The real localization)
  // We use simple objects, Prisma handles JSON serialization
  
  // 1. Build titleJson
  const titleJson = {
    EN: dto.titleEN || '',
    UA: dto.titleUA || '',
    PL: dto.titlePL || ''
  }
  // Remove empty keys to keep DB clean (optional, but good practice)
  Object.keys(titleJson).forEach(k => (titleJson as any)[k] === '' && delete (titleJson as any)[k])
  updateData.titleJson = titleJson

  // 2. Build urlJson (was urlCache)
  const urlJson = {
    EN: dto.linkEN || '',
    UA: dto.linkUA || '',
    PL: dto.linkPL || ''
  }
  Object.keys(urlJson).forEach(k => (urlJson as any)[k] === '' && delete (urlJson as any)[k])
  // Note: Ensure your schema has 'urlJson'. If it's 'urlCache', change it back here.
  // Based on your architecture 'titleJson', it implies 'urlJson'.
  updateData.urlJson = urlJson 

  // 3. Build contentJson
  const contentJson = {
    EN: dto.contentEN || '',
    UA: dto.contentUA || '',
    PL: dto.contentPL || ''
  }
  Object.keys(contentJson).forEach(k => (contentJson as any)[k] === '' && delete (contentJson as any)[k])
  updateData.contentJson = contentJson

  const updated = await prisma.material.update({
    where: { id },
    data: updateData
  })

  return updated
}