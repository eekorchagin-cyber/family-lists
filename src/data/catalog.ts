import { CATEGORY_COLORS, iconIdFromName } from './categories'
import type { CatalogEntry, Category, Item } from '../types'

export function globalCategories(categories: Category[]): Category[] {
  return categories.filter((category) => !category.storeId)
}

export function groupCatalog(
  catalog: CatalogEntry[],
  categories: Category[],
): { category: Category | null; items: CatalogEntry[] }[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const groups = new Map<string, CatalogEntry[]>()
  const unknown: CatalogEntry[] = []
  for (const entry of catalog) {
    if (byId.has(entry.categoryId)) {
      const list = groups.get(entry.categoryId)
      if (list) list.push(entry)
      else groups.set(entry.categoryId, [entry])
    } else {
      unknown.push(entry)
    }
  }
  const ordered: { category: Category | null; items: CatalogEntry[] }[] = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .flatMap((category) => {
      const items = groups.get(category.id)
      return items && items.length > 0 ? [{ category, items }] : []
    })
  if (unknown.length > 0) ordered.push({ category: null, items: unknown })
  return ordered
}

export function sortCatalog(catalog: CatalogEntry[]): CatalogEntry[] {
  return [...catalog].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function findCatalogEntry(
  catalog: CatalogEntry[],
  name: string,
): CatalogEntry | undefined {
  const needle = name.trim().toLowerCase()
  if (!needle) return undefined
  return catalog.find((entry) => entry.name.toLowerCase() === needle)
}

export function catalogCategoryId(
  catalog: CatalogEntry[],
  name: string,
  availableCategoryIds: Iterable<string>,
): string | undefined {
  const entry = findCatalogEntry(catalog, name)
  if (!entry) return undefined
  const ids = new Set(availableCategoryIds)
  return ids.has(entry.categoryId) ? entry.categoryId : undefined
}

function newCatalogId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}`
}

export function upsertCatalog(
  catalog: CatalogEntry[],
  name: string,
  categoryId: string,
): CatalogEntry[] {
  const trimmed = name.trim()
  if (!trimmed || !categoryId) return catalog
  const existing = findCatalogEntry(catalog, trimmed)
  if (existing) {
    if (existing.name === trimmed && existing.categoryId === categoryId) return catalog
    return catalog.map((entry) =>
      entry.id === existing.id ? { ...entry, name: trimmed, categoryId } : entry,
    )
  }
  return [...catalog, { id: newCatalogId(), name: trimmed, categoryId }]
}

export function mergeCatalogFromItems(
  catalog: CatalogEntry[],
  items: Item[],
): CatalogEntry[] {
  let next = catalog
  for (const item of items) {
    next = upsertCatalog(next, item.name, item.categoryId)
  }
  return next
}

export function catalogFromItems(
  items: Item[],
  _categories: Category[],
): CatalogEntry[] {
  return mergeCatalogFromItems([], items)
}

export type CatalogImportRow = {
  name: string
  category: string
}

export type CatalogImportSummary = {
  addedItems: number
  skippedItems: number
  addedCategories: number
  catalog: CatalogEntry[]
  categories: Category[]
}

function nameKey(value: string): string {
  return value.trim().toLowerCase()
}

function colorForName(name: string): string {
  const colors = CATEGORY_COLORS.filter((color) => color !== 'none')
  let hash = 0
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % Math.max(colors.length, 1)
  return colors[hash] ?? '#6b7280'
}

export function findCategoryByName(
  categories: Category[],
  name: string,
): Category | undefined {
  const needle = nameKey(name)
  if (!needle) return undefined
  const globals = categories.filter((category) => !category.storeId)
  return (
    globals.find((category) => nameKey(category.name) === needle) ??
    categories.find((category) => nameKey(category.name) === needle)
  )
}

export function catalogExportRows(
  catalog: CatalogEntry[],
  categories: Category[],
): CatalogImportRow[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  return [...catalog]
    .sort((a, b) => {
      const left = byId.get(a.categoryId)?.name ?? ''
      const right = byId.get(b.categoryId)?.name ?? ''
      return left.localeCompare(right, 'ru') || a.name.localeCompare(b.name, 'ru')
    })
    .map((entry) => ({
      name: entry.name,
      category: byId.get(entry.categoryId)?.name ?? '',
    }))
}

export function applyCatalogImport(
  catalog: CatalogEntry[],
  categories: Category[],
  rows: CatalogImportRow[],
  now = new Date().toISOString(),
): CatalogImportSummary {
  const nextCatalog = [...catalog]
  const nextCategories = [...categories]
  let addedItems = 0
  let skippedItems = 0
  let addedCategories = 0

  for (const row of rows) {
    const name = row.name.trim()
    const categoryName = row.category.trim()
    if (!name) continue
    if (!categoryName || findCatalogEntry(nextCatalog, name)) {
      skippedItems += 1
      continue
    }
    let category = findCategoryByName(nextCategories, categoryName)
    if (!category) {
      category = {
        id: newCatalogId(),
        name: categoryName,
        color: colorForName(categoryName),
        icon: iconIdFromName(categoryName),
        updatedAt: now,
      }
      nextCategories.push(category)
      addedCategories += 1
    }
    nextCatalog.push({
      id: newCatalogId(),
      name,
      categoryId: category.id,
      updatedAt: now,
    })
    addedItems += 1
  }

  return {
    addedItems,
    skippedItems,
    addedCategories,
    catalog: nextCatalog,
    categories: nextCategories,
  }
}
