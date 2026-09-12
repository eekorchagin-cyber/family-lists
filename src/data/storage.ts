import type {
  AppData,
  CatalogEntry,
  Category,
  Item,
  Settings,
  Store,
  StoreGroup,
  TemplateItem,
  NamedTemplate,
} from '../types'
import { catalogFromItems, mergeCatalogFromItems } from './catalog'
import backup from './backup.json'
import { appendCategoryToStores } from './categories'
import { groupsFromStores, isGroupsCatalogId, mergeGroups, parseGroupsCatalog, stripGroupMarker } from './homeLayout'
import {
  createDefaultData,
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  emptyStoreFields,
  SCHEMA_VERSION,
  CLEARED_STORES_KEY,
  STORE_ORDER_KEY,
  STORAGE_KEY,
} from './defaults'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCategory(value: unknown): value is Category {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    (value.icon === undefined || typeof value.icon === 'string') &&
    (value.storeId === undefined || typeof value.storeId === 'string') &&
    (value.updatedAt === undefined || typeof value.updatedAt === 'string')
  )
}

function parseQtyValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeItem(value: unknown): Item | null {
  if (!isRecord(value)) return null
  const qty = parseQtyValue(value.qty)
  if (
    typeof value.id !== 'string' ||
    typeof value.storeId !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.categoryId !== 'string' ||
    qty === null ||
    typeof value.unit !== 'string' ||
    typeof value.bought !== 'boolean'
  ) {
    return null
  }
  return {
    id: value.id,
    storeId: value.storeId,
    name: value.name,
    categoryId: value.categoryId,
    qty,
    unit: value.unit,
    bought: value.bought,
    ...(typeof value.addedBy === 'string' ? { addedBy: value.addedBy } : {}),
    ...(typeof value.boughtBy === 'string' ? { boughtBy: value.boughtBy } : {}),
    ...(typeof value.updatedAt === 'string' ? { updatedAt: value.updatedAt } : {}),
  }
}

function isTemplateItem(value: unknown): value is TemplateItem {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.categoryId === 'string' &&
    typeof value.qty === 'number' &&
    Number.isFinite(value.qty) &&
    typeof value.unit === 'string'
  )
}

function isNamedTemplate(value: unknown): value is NamedTemplate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.items) &&
    value.items.every(isTemplateItem)
  )
}

function normalizeTemplates(value: Record<string, unknown>): NamedTemplate[] {
  if (Array.isArray(value.templates)) {
    return value.templates.filter(isNamedTemplate)
  }
  if (Array.isArray(value.template)) {
    const items = value.template.filter(isTemplateItem)
    if (items.length === 0) return []
    return [{ id: 'legacy', name: 'Шаблон', items }]
  }
  return []
}

function normalizeCategoryNames(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const names: Record<string, string> = {}
  for (const [key, name] of Object.entries(value)) {
    if (typeof name === 'string' && name.trim()) names[key] = name
  }
  return names
}

function normalizeStore(value: unknown): Store | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }

  const defaults = emptyStoreFields()
  const marked = stripGroupMarker(normalizeCategoryNames(value.categoryNames))
  const groupId =
    typeof value.groupId === 'string' && value.groupId.trim()
      ? value.groupId.trim()
      : marked.groupId
  return {
    id: value.id,
    name: value.name,
    categorySort: value.categorySort === 'alpha' ? 'alpha' : 'custom',
    categoryOrder: Array.isArray(value.categoryOrder)
      ? value.categoryOrder.filter((id): id is string => typeof id === 'string')
      : defaults.categoryOrder,
    categoryNames: marked.names,
    templates: normalizeTemplates(value),
    visibility: value.visibility === 'home' ? 'home' : 'private',
    ...(typeof value.ownerId === 'string' ? { ownerId: value.ownerId } : {}),
    ...(groupId ? { groupId } : {}),
    ...(typeof value.updatedAt === 'string' ? { updatedAt: value.updatedAt } : {}),
  }
}

function normalizeGroup(value: unknown): StoreGroup | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null
  }
  const name = value.name.trim()
  if (!name) return null
  return {
    id: value.id,
    name,
    ...(typeof value.updatedAt === 'string' ? { updatedAt: value.updatedAt } : {}),
  }
}

function normalizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS }
  return {
    theme: value.theme === 'dark' ? 'dark' : 'light',
    fontSize:
      value.fontSize === 's' || value.fontSize === 'l' ? value.fontSize : 'm',
  }
}

function normalizeCategories(value: unknown): Category[] {
  if (!Array.isArray(value)) return DEFAULT_CATEGORIES
  const categories = value.filter(isCategory)
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    value.name.trim() !== '' &&
    typeof value.categoryId === 'string'
  )
}

function normalizeCatalog(
  value: unknown,
  items: Item[],
  categories: Category[],
): CatalogEntry[] {
  if (Array.isArray(value)) {
    const seen = new Set<string>()
    const catalog: CatalogEntry[] = []
    for (const entry of value.filter(isCatalogEntry)) {
      const key = entry.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      catalog.push({
        id: entry.id,
        name: entry.name.trim(),
        categoryId: entry.categoryId,
        ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : {}),
      })
    }
    return catalog
  }
  return catalogFromItems(items, categories)
}

export function migrate(raw: unknown): AppData {
  if (!isRecord(raw)) return createDefaultData()

  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeItem).filter((item): item is Item => item !== null)
    : []
  const categories = normalizeCategories(raw.categories)
  const stores = Array.isArray(raw.stores)
    ? raw.stores.map(normalizeStore).filter((store): store is Store => store !== null)
    : []
  let groups = Array.isArray(raw.groups)
    ? raw.groups.map(normalizeGroup).filter((group): group is StoreGroup => group !== null)
    : []
  const catalogRaw = normalizeCatalog(raw.catalog, items, categories)
  const groupsEntry = catalogRaw.find((entry) => isGroupsCatalogId(entry.id))
  if (groups.length === 0 && groupsEntry) {
    groups = parseGroupsCatalog(groupsEntry.name) ?? []
  }
  const catalog = mergeCatalogFromItems(
    catalogRaw.filter((entry) => !isGroupsCatalogId(entry.id)),
    items,
  )
  // Если карточек групп нет, но у списков есть groupId — восстановим группы-заглушки.
  const storesWithCategories = appendCategoryToStores(stores, categories)
  groups = mergeGroups(groups, groupsFromStores(storesWithCategories, new Map()), [])
  return {
    version: SCHEMA_VERSION,
    stores: storesWithCategories,
    groups,
    items,
    categories,
    catalog,
    settings: normalizeSettings(raw.settings),
  }
}

function isEmptyData(data: AppData): boolean {
  return (
    data.stores.length === 0 &&
    data.items.length === 0 &&
    (data.catalog ?? []).length === 0
  )
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = migrate(JSON.parse(raw))
      if (!isEmptyData(data)) {
        try {
          saveData(data)
        } catch {
          // ignore quota / private mode
        }
        return data
      }
    }
  } catch {
    // повреждённые данные — восстановим из резервной копии
  }

  const recovered = migrate(backup)
  try {
    if (!isEmptyData(recovered)) saveData(recovered)
  } catch {
    // ignore quota / private mode
  }
  return recovered
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadStoreOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORE_ORDER_KEY)
    if (!raw) return []
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function saveStoreOrder(ids: string[]): void {
  localStorage.setItem(STORE_ORDER_KEY, JSON.stringify(ids))
}

export function loadClearedStoreIds(): string[] {
  try {
    const raw = localStorage.getItem(CLEARED_STORES_KEY)
    if (!raw) return []
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function saveClearedStoreIds(ids: string[]): void {
  localStorage.setItem(CLEARED_STORES_KEY, JSON.stringify(ids))
}

export function applyAppearance(settings: Settings): void {
  const root = document.documentElement
  root.dataset.theme = settings.theme
  root.dataset.font = settings.fontSize
}
