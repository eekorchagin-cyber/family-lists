import type { AppData, Category, Settings, Store } from '../types'

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'pokupki-data'
export const STORE_ORDER_KEY = 'pokupki-store-order'
export const CLEARED_STORES_KEY = 'pokupki-cleared-stores'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'dairy', name: 'Молочное', color: '#3b82f6' },
  { id: 'produce', name: 'Овощи и фрукты', color: '#22c55e' },
  { id: 'meat', name: 'Мясо и рыба', color: '#ef4444' },
  { id: 'grocery', name: 'Бакалея', color: '#f59e0b' },
  { id: 'household', name: 'Бытовая химия', color: '#8b5cf6' },
  { id: 'other', name: 'Другое', color: '#6b7280' },
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 'm',
}

export function emptyStoreFields(): Pick<
  Store,
  'categorySort' | 'categoryOrder' | 'categoryNames' | 'templates' | 'visibility'
> {
  return {
    categorySort: 'custom',
    categoryOrder: DEFAULT_CATEGORIES.map((category) => category.id),
    categoryNames: {},
    templates: [],
    visibility: 'private',
  }
}

export function createDefaultData(): AppData {
  return {
    version: SCHEMA_VERSION,
    stores: [],
    items: [],
    categories: DEFAULT_CATEGORIES,
    catalog: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}
