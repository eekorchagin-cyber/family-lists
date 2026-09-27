import type { Category, NamedTemplate, Store, StoreGroup, TemplateItem } from '../types'
import { knownCategoriesForStore } from './categories'

export type SharedTemplate = {
  storeId: string
  storeName: string
  template: NamedTemplate
  groupId?: string
}

function parseTemplate(value: unknown): NamedTemplate | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !Array.isArray(row.items)) {
    return null
  }
  const items: TemplateItem[] = []
  for (const entry of row.items) {
    if (!entry || typeof entry !== 'object') return null
    const item = entry as Record<string, unknown>
    if (
      typeof item.name !== 'string' ||
      typeof item.categoryId !== 'string' ||
      typeof item.qty !== 'number' ||
      !Number.isFinite(item.qty) ||
      typeof item.unit !== 'string'
    ) {
      return null
    }
    items.push({
      name: item.name,
      categoryId: item.categoryId,
      qty: item.qty,
      unit: item.unit,
    })
  }
  const visibility = row.visibility === 'private' || row.visibility === 'home' ? row.visibility : undefined
  const ownerId = typeof row.ownerId === 'string' && row.ownerId.trim() ? row.ownerId.trim() : undefined
  return {
    id: row.id,
    name: row.name,
    items,
    ...(visibility ? { visibility } : {}),
    ...(ownerId ? { ownerId } : {}),
  }
}

export function parseTemplateList(value: unknown): NamedTemplate[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map(parseTemplate)
    .filter((template): template is NamedTemplate => template !== null)
}

export function groupTemplatesForUser(group: StoreGroup, userId: string | undefined): StoreGroup {
  if (!group.templates) return group
  const templates = group.templates.filter((template) => templateVisible(template, userId))
  if (templates.length === group.templates.length) return group
  const next = { ...group, templates }
  if (templates.length === 0) delete next.templates
  return next
}

export function templateVisible(template: NamedTemplate, userId: string | undefined): boolean {
  if (template.visibility !== 'private') return true
  if (!userId || !template.ownerId) return true
  return template.ownerId === userId
}

export function mergeTemplates(
  local: NamedTemplate[] | undefined,
  remote: NamedTemplate[] | undefined,
  userId: string | undefined,
): NamedTemplate[] {
  const remoteVisible = (remote ?? []).filter((template) => templateVisible(template, userId))
  const remoteIds = new Set(remoteVisible.map((template) => template.id))
  const ownPrivate = (local ?? []).filter(
    (template) =>
      template.visibility === 'private' &&
      !remoteIds.has(template.id) &&
      (!template.ownerId || !userId || template.ownerId === userId),
  )
  return [...remoteVisible, ...ownPrivate]
}

export function sharedTemplates(
  stores: Store[],
  userId?: string,
  groups: StoreGroup[] = [],
): SharedTemplate[] {
  const rows: SharedTemplate[] = []
  for (const store of stores) {
    for (const template of store.templates ?? []) {
      if (!templateVisible(template, userId)) continue
      rows.push({ storeId: store.id, storeName: store.name, template })
    }
  }
  for (const group of groups) {
    for (const template of group.templates ?? []) {
      if (!templateVisible(template, userId)) continue
      rows.push({
        storeId: '',
        storeName: group.name,
        template,
        groupId: group.id,
      })
    }
  }
  return rows
}

export function findSharedTemplate(
  stores: Store[],
  templateId: string,
  groups: StoreGroup[] = [],
  userId?: string,
): SharedTemplate | undefined {
  return sharedTemplates(stores, userId, groups).find((row) => row.template.id === templateId)
}

export function mapTemplateCategoryId(
  entry: TemplateItem,
  store: Store,
  categories: Category[],
): string {
  const known = knownCategoriesForStore(categories, store.id)
  if (known.some((category) => category.id === entry.categoryId)) return entry.categoryId
  const source = categories.find((category) => category.id === entry.categoryId)
  if (!source) return known[0]?.id ?? entry.categoryId
  const byName = known.find(
    (category) => category.name.trim().toLowerCase() === source.name.trim().toLowerCase(),
  )
  return byName?.id ?? known[0]?.id ?? entry.categoryId
}
