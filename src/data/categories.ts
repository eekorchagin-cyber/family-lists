import type { Category, Store } from '../types'

export const CATEGORY_COLORS = [
  'none',
  '#3b82f6',
  '#0ea5e9',
  '#14b8a6',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#e11d48',
  '#ec4899',
  '#d946ef',
  '#8b5cf6',
  '#6366f1',
  '#1d4ed8',
  '#0f766e',
  '#b45309',
  '#78716c',
  '#6b7280',
  '#111827',
]

export const CATEGORY_ICONS = [
  { id: 'dairy', glyph: '🥛', keywords: ['молок', 'кефир', 'йогурт', 'творог', 'сливк'] },
  { id: 'cheese', glyph: '🧀', keywords: ['сыр'] },
  { id: 'produce', glyph: '🥬', keywords: ['овощ', 'фрукт', 'зелен'] },
  { id: 'fruit', glyph: '🍎', keywords: ['ягод'] },
  { id: 'meat', glyph: '🥩', keywords: ['мясо', 'рыб', 'птиц'] },
  { id: 'sausage', glyph: '🌭', keywords: ['колбас', 'сосис', 'салями', 'ветчин'] },
  { id: 'fish', glyph: '🐟', keywords: [] },
  { id: 'bread', glyph: '🍞', keywords: ['хлеб', 'выпеч'] },
  { id: 'grocery', glyph: '🛒', keywords: ['бакале', 'круп', 'яйц'] },
  { id: 'can', glyph: '🥫', keywords: ['консерв'] },
  { id: 'sweet', glyph: '🍬', keywords: ['чай', 'кофе', 'конфет', 'сладост'] },
  { id: 'drink', glyph: '🧃', keywords: ['вода', 'сок', 'напит'] },
  { id: 'alcohol', glyph: '🍷', keywords: ['алког', 'вино', 'пиво'] },
  { id: 'frozen', glyph: '❄️', keywords: ['замороз', 'морож'] },
  { id: 'chem', glyph: '🧴', keywords: ['хими', 'порош', 'моющ'] },
  { id: 'home', glyph: '🧹', keywords: ['хозтов', 'быт'] },
  { id: 'dish', glyph: '🍽️', keywords: ['посуд'] },
  { id: 'office', glyph: '📎', keywords: ['канцел'] },
  { id: 'electric', glyph: '💡', keywords: ['электр'] },
  { id: 'plumb', glyph: '🚿', keywords: ['сантех'] },
  { id: 'tools', glyph: '🔧', keywords: ['инструм'] },
  { id: 'clothes', glyph: '👕', keywords: ['одежд'] },
  { id: 'linen', glyph: '🧺', keywords: ['белье', 'бельё'] },
  { id: 'shoes', glyph: '👟', keywords: ['обув'] },
  { id: 'docs', glyph: '📄', keywords: ['документ', 'паспорт'] },
  { id: 'travel', glyph: '🧳', keywords: ['дорог', 'чемодан'] },
  { id: 'garden', glyph: '🌱', keywords: ['сад', 'огород', 'газон'] },
  {
    id: 'westie',
    glyph: '',
    keywords: ['вест', 'терьер', 'westie', 'west highland'],
  },
  { id: 'other', glyph: '📦', keywords: ['друго'] },
] as const

export type CategoryIconId = (typeof CATEGORY_ICONS)[number]['id']

export function isCategoryIconId(value: string): value is CategoryIconId {
  return CATEGORY_ICONS.some((icon) => icon.id === value)
}

export function iconIdFromName(name: string): CategoryIconId {
  const needle = name.trim().toLowerCase()
  for (const icon of CATEGORY_ICONS) {
    if (icon.keywords.some((keyword) => needle.includes(keyword))) return icon.id
  }
  return 'other'
}

export function categoryGlyph(category: Pick<Category, 'name' | 'icon'>): string {
  if (category.icon && isCategoryIconId(category.icon)) {
    const match = CATEGORY_ICONS.find((icon) => icon.id === category.icon)
    if (match) return match.glyph
  }
  const inferred = CATEGORY_ICONS.find((icon) => icon.id === iconIdFromName(category.name))
  return inferred?.glyph ?? '📦'
}

export function categoriesForStore(
  categories: Category[],
  store: Pick<Store, 'id' | 'categoryOrder'>,
): Category[] {
  const enabled = new Set(store.categoryOrder ?? [])
  return categories.filter((category) => {
    if (category.storeId) return category.storeId === store.id
    return enabled.has(category.id)
  })
}

export function unusedGlobalCategories(
  categories: Category[],
  store: Pick<Store, 'id' | 'categoryOrder'>,
): Category[] {
  const enabled = new Set(store.categoryOrder ?? [])
  return categories
    .filter((category) => !category.storeId && !enabled.has(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export function knownCategoriesForStore(
  categories: Category[],
  storeId: string,
): Category[] {
  return categories.filter((category) => !category.storeId || category.storeId === storeId)
}

export function storeHasLocalCategories(categories: Category[], storeId: string): boolean {
  return categories.some((category) => category.storeId === storeId)
}

export function withCategoryEnabled(
  store: Store,
  categoryId: string,
  categories: Category[],
): Store {
  const category = categories.find((item) => item.id === categoryId)
  if (!category) return store
  if (category.storeId && category.storeId !== store.id) return store
  if ((store.categoryOrder ?? []).includes(categoryId)) return store
  return {
    ...store,
    categoryOrder: [...(store.categoryOrder ?? []), categoryId],
  }
}

export function withCategoriesEnabled(
  store: Store,
  categoryIds: Iterable<string>,
  categories: Category[],
): Store {
  let next = store
  for (const categoryId of categoryIds) {
    next = withCategoryEnabled(next, categoryId, categories)
  }
  return next
}

export function restoreLocalCategoryStoreIds(
  categories: Category[],
  source: Category[],
): Category[] {
  const sourceById = new Map(source.map((category) => [category.id, category]))
  return categories.map((category) => {
    if (category.storeId) return category
    const fromSource = sourceById.get(category.id)
    return fromSource?.storeId ? { ...category, storeId: fromSource.storeId } : category
  })
}

export function appendCategoryToStores(
  stores: Store[],
  categories: Category[],
): Store[] {
  return stores.map((store) => ({
    ...store,
    categoryOrder: ensureCategoryOrder(
      store,
      categoriesForStore(categories, store),
    ),
  }))
}

export function categoryName(category: Category, store: Store): string {
  return store.categoryNames?.[category.id] ?? category.name
}

export function isLocalToStore(category: Category, store: Store): boolean {
  return category.storeId === store.id || Boolean(store.categoryNames?.[category.id])
}

export function ensureCategoryOrder(store: Store, categories: Category[]): string[] {
  const ids = categories.map((category) => category.id)
  const existing = (store.categoryOrder ?? []).filter((id) => ids.includes(id))
  const missing = ids.filter((id) => !existing.includes(id))
  return [...existing, ...missing]
}

export function sortCategories(categories: Category[], store: Store): Category[] {
  if (store.categorySort === 'alpha') {
    return [...categories].sort((a, b) =>
      categoryName(a, store).localeCompare(categoryName(b, store), 'ru'),
    )
  }

  const order = ensureCategoryOrder(store, categories)
  return [...categories].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}
