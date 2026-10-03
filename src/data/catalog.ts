import { CATEGORY_COLORS, iconIdFromName } from './categories'
import { foldRu, sameRuText } from './text'
import type { CatalogEntry, Category, Item, Store } from '../types'

/** В category_names списка: карта «товар → отдел» для этого списка. */
export const ITEM_CATEGORIES_KEY = '__bs'

export function globalCategories(categories: Category[]): Category[] {
  return categories.filter((category) => !category.storeId)
}

export function itemCategoryKey(name: string): string {
  return foldRu(name)
}

export function parseItemCategories(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const next: Record<string, string> = {}
  for (const [key, categoryId] of Object.entries(value as Record<string, unknown>)) {
    const name = itemCategoryKey(key)
    if (!name || typeof categoryId !== 'string' || !categoryId.trim()) continue
    next[name] = categoryId.trim()
  }
  return Object.keys(next).length > 0 ? next : undefined
}

export function stripItemCategoriesMarker(names: Record<string, string>): {
  names: Record<string, string>
  itemCategories?: Record<string, string>
} {
  const next: Record<string, string> = {}
  let itemCategories: Record<string, string> | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key === ITEM_CATEGORIES_KEY) {
      try {
        itemCategories = parseItemCategories(JSON.parse(value) as unknown)
      } catch {
        itemCategories = undefined
      }
      continue
    }
    next[key] = value
  }
  return { names: next, ...(itemCategories ? { itemCategories } : {}) }
}

export function withItemCategoriesMarker(
  names: Record<string, string>,
  itemCategories: Record<string, string> | undefined,
): Record<string, string> {
  const { names: clean } = stripItemCategoriesMarker(names)
  const parsed = parseItemCategories(itemCategories)
  if (!parsed) return clean
  return { ...clean, [ITEM_CATEGORIES_KEY]: JSON.stringify(parsed) }
}

export function mergeItemCategories(
  primary: Record<string, string> | undefined,
  secondary: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!primary && !secondary) return undefined
  const next = { ...(secondary ?? {}), ...(primary ?? {}) }
  return Object.keys(next).length > 0 ? next : undefined
}

export function rememberStoreCategory(
  store: Store,
  name: string,
  categoryId: string,
): Store {
  const key = itemCategoryKey(name)
  if (!key || !categoryId) return store
  const current = store.itemCategories ?? {}
  if (current[key] === categoryId) return store
  return {
    ...store,
    itemCategories: { ...current, [key]: categoryId },
  }
}

export function seedStoreItemCategories(store: Store, items: Item[]): Store {
  if (store.itemCategories && Object.keys(store.itemCategories).length > 0) return store
  const map: Record<string, string> = {}
  for (const item of items) {
    if (item.storeId !== store.id) continue
    const key = itemCategoryKey(item.name)
    if (!key || !item.categoryId) continue
    map[key] = item.categoryId
  }
  return Object.keys(map).length > 0 ? { ...store, itemCategories: map } : store
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
  const needle = foldRu(name)
  if (!needle) return undefined
  return catalog.find((entry) => sameRuText(entry.name, name))
}

export function catalogCategoryId(
  catalog: CatalogEntry[],
  name: string,
  knownCategoryIds?: Iterable<string>,
  store?: Pick<Store, 'itemCategories'>,
): string | undefined {
  const ids = knownCategoryIds ? new Set(knownCategoryIds) : undefined
  const fromStore = store?.itemCategories?.[itemCategoryKey(name)]
  if (fromStore && (!ids || ids.has(fromStore))) return fromStore
  const entry = findCatalogEntry(catalog, name)
  if (!entry) return undefined
  if (!ids) return entry.categoryId
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
  return foldRu(value)
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
