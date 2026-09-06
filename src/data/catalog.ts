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
