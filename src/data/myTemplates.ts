import type { TemplateFolder } from '../types'
import { parseTemplateList } from './templates'

export const MY_TEMPLATES_CATALOG_ID = '__pokupki_my_templates__'

export function myTemplatesCatalogIdForHome(homeId: string): string {
  return `${MY_TEMPLATES_CATALOG_ID}:${homeId}`
}

export function isMyTemplatesCatalogId(id: string): boolean {
  return id === MY_TEMPLATES_CATALOG_ID || id.startsWith(`${MY_TEMPLATES_CATALOG_ID}:`)
}

export function parseTemplateFolders(raw: unknown): TemplateFolder[] {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  const folders: TemplateFolder[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name !== 'string') continue
    const name = row.name.trim()
    if (!name) continue
    const ownerId = typeof row.ownerId === 'string' && row.ownerId.trim() ? row.ownerId.trim() : undefined
    const updatedAt = typeof row.updatedAt === 'string' ? row.updatedAt : undefined
    folders.push({
      id: row.id,
      name,
      templates: parseTemplateList(row.templates) ?? [],
      ...(ownerId ? { ownerId } : {}),
      ...(updatedAt ? { updatedAt } : {}),
    })
  }
  return folders
}

/** Более новая группа целиком заменяет старую, чтобы удаление шаблона не возвращалось. */
export function mergeTemplateFolders(
  remote: TemplateFolder[],
  local: TemplateFolder[],
  deletedIds: string[] = [],
): TemplateFolder[] {
  const drop = new Set(deletedIds)
  const byId = new Map<string, TemplateFolder>()
  for (const folder of remote) {
    if (!drop.has(folder.id)) byId.set(folder.id, folder)
  }
  for (const folder of local) {
    if (drop.has(folder.id)) {
      byId.delete(folder.id)
      continue
    }
    const current = byId.get(folder.id)
    if (!current || (folder.updatedAt ?? '') >= (current.updatedAt ?? '')) {
      byId.set(folder.id, folder)
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function foldersForUser(folders: TemplateFolder[], userId: string | undefined): TemplateFolder[] {
  if (!userId) return folders.filter((folder) => !folder.ownerId)
  return folders.filter((folder) => !folder.ownerId || folder.ownerId === userId)
}
