import type { Category, Store } from '../types'
import {
  FILE_CATEGORY_ICONS,
  fileCategoryIcon,
  fileIconIdForName,
  type FileCategoryIconId,
} from './categoryIconFiles'

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

export const GROUP_ICONS = [
  { id: 'lenta', glyph: '', keywords: ['лента'] },
  { id: 'perekrestok', glyph: '', keywords: ['перекрест', 'перекрёст'] },
  { id: 'krasnoeBeloe', glyph: '', keywords: ['красное и белое', 'красное&белое', 'киб'] },
  { id: 'auchan', glyph: '', keywords: ['ашан', 'auchan'] },
  { id: 'metro', glyph: '', keywords: ['метро', 'metro'] },
  { id: 'komandor', glyph: '', keywords: ['командор'] },
  { id: 'pyaterochka', glyph: '', keywords: ['пятёроч', 'пятероч', '5ка', '5-ка'] },
  { id: 'lemanapro', glyph: '', keywords: ['лемана', 'леруа', 'leman'] },
  { id: 'baton', glyph: '', keywords: ['батон'] },
  { id: 'ozon', glyph: '', keywords: ['ozon', 'озон'] },
  { id: 'redsale', glyph: '', keywords: ['redsale', 'red sale', 'redsail', 'редсейл'] },
  { id: 'kumtigey', glyph: '', keywords: ['кум-тигей', 'кум тигей', 'кумтигей'] },
  { id: 'gubernskie', glyph: '', keywords: ['губернск'] },
  { id: 'seaVacation', glyph: '', keywords: ['отпуск на море', 'на море', 'пляж'] },
  { id: 'mountainVacation', glyph: '', keywords: ['отпуск в горах', 'в горах'] },
  { id: 'businessTrip', glyph: '', keywords: ['командиров'] },
] as const

export const CATEGORY_ICONS = [
  { id: 'dairy', glyph: '🥛', keywords: ['молок', 'кефир', 'йогурт', 'творог', 'сливк'] },
  { id: 'cheese', glyph: '🧀', keywords: ['сыр'] },
  { id: 'eggs', glyph: '🥚', keywords: ['яйц'] },
  { id: 'produce', glyph: '🥬', keywords: ['овощ', 'зелен'] },
  { id: 'fruit', glyph: '🍎', keywords: ['фрукт', 'ягод'] },
  { id: 'meat', glyph: '🥩', keywords: ['мясо', 'птиц'] },
  { id: 'sausage', glyph: '🌭', keywords: ['колбас', 'сосис', 'салями', 'ветчин'] },
  { id: 'fish', glyph: '🐟', keywords: ['рыб', 'морепрод'] },
  { id: 'bread', glyph: '🍞', keywords: ['хлеб'] },
  { id: 'bakery', glyph: '🥐', keywords: ['выпеч', 'булоч', 'батон'] },
  { id: 'pasta', glyph: '🍝', keywords: ['макарон', 'паст', 'лапш'] },
  { id: 'cereal', glyph: '🥣', keywords: ['каш', 'хлопь', 'мюсли'] },
  { id: 'grocery', glyph: '🛒', keywords: ['бакале', 'круп'] },
  { id: 'oil', glyph: '🫒', keywords: ['масл', 'уксус'] },
  { id: 'spices', glyph: '🧂', keywords: ['специ', 'приправ', 'соль', 'перец'] },
  { id: 'sauce', glyph: '🫙', keywords: ['соус', 'кетчуп', 'майонез'] },
  { id: 'can', glyph: '🥫', keywords: ['консерв'] },
  { id: 'nuts', glyph: '🥜', keywords: ['орех', 'семеч'] },
  { id: 'sweet', glyph: '🍬', keywords: ['конфет', 'сладост', 'шоколад'] },
  { id: 'cake', glyph: '🎂', keywords: ['торт', 'пирож', 'десерт'] },
  { id: 'snacks', glyph: '🍿', keywords: ['снек', 'чипс', 'сухар'] },
  { id: 'coffee', glyph: '☕', keywords: ['кофе', 'чай'] },
  { id: 'faucet', glyph: '🚰', keywords: ['кран', 'водопровод', 'смесител'] },
  { id: 'drink', glyph: '🧃', keywords: ['сок', 'напит', 'минерал'] },
  { id: 'water', glyph: '💧', keywords: ['вода'] },
  { id: 'alcohol', glyph: '🍷', keywords: ['алког', 'вино', 'пиво'] },
  { id: 'frozen', glyph: '❄️', keywords: ['замороз'] },
  { id: 'icecream', glyph: '🍦', keywords: ['морож'] },
  { id: 'baby', glyph: '🍼', keywords: ['детск', 'малыш', 'подгуз'] },
  { id: 'pet', glyph: '🐾', keywords: ['питом', 'собак', 'кошк', 'корм'] },
  { id: 'pharmacy', glyph: '', keywords: ['аптек', 'лекарств', 'витамин', 'таблет'] },
  { id: 'beauty', glyph: '💄', keywords: ['космет', 'красот', 'шампун'] },
  { id: 'chem', glyph: '🧴', keywords: ['хими', 'порош', 'моющ'] },
  { id: 'soap', glyph: '🧼', keywords: ['мыло', 'гель для'] },
  { id: 'paper', glyph: '🧻', keywords: ['бумаг', 'салфет', 'туалетн'] },
  { id: 'home', glyph: '🧹', keywords: ['хозтов', 'быт'] },
  { id: 'dish', glyph: '🍽️', keywords: ['посуд'] },
  { id: 'office', glyph: '📎', keywords: ['канцел'] },
  { id: 'computer', glyph: '', keywords: ['компьютер', 'ноутбук', 'монитор'] },
  { id: 'books', glyph: '📚', keywords: ['книг', 'журнал'] },
  { id: 'toys', glyph: '🧸', keywords: ['игрушк'] },
  { id: 'fan', glyph: '', keywords: ['вентилятор', 'вентиллятор'] },
  { id: 'painting', glyph: '🖼️', keywords: ['картин', 'постер', 'репродук'] },
  { id: 'carpet', glyph: '🟫', keywords: ['ковёр', 'ковер', 'палас', 'дорожк'] },
  { id: 'paintbrush', glyph: '', keywords: ['маляр', 'моляр', 'кист', 'валик'] },
  { id: 'tile', glyph: '', keywords: ['кафель', 'плитк', 'керамогран'] },
  { id: 'wallpaper', glyph: '📜', keywords: ['обои', 'обоев'] },
  { id: 'chandelier', glyph: '', keywords: ['люстр', 'торшер'] },
  { id: 'hinge', glyph: '🔩', keywords: ['петл', 'навес'] },
  { id: 'door', glyph: '🚪', keywords: ['двер'] },
  { id: 'insulation', glyph: '', keywords: ['утеплит', 'минват', 'изолон', 'пенофол'] },
  { id: 'shelf', glyph: '🗄️', keywords: ['стеллаж', 'стелаж', 'стеллажн'] },
  { id: 'deskLamp', glyph: '', keywords: ['настольн', 'светильник'] },
  { id: 'electric', glyph: '💡', keywords: ['электр', 'ламп'] },
  { id: 'battery', glyph: '🔋', keywords: ['батарей', 'аккумул'] },
  { id: 'bed', glyph: '', keywords: ['кроват', 'спальн', 'постел'] },
  { id: 'shower', glyph: '', keywords: ['душ'] },
  { id: 'sink', glyph: '', keywords: ['раковин', 'мойк'] },
  { id: 'plumb', glyph: '🚿', keywords: ['сантех'] },
  { id: 'tools', glyph: '🔧', keywords: ['инструм'] },
  { id: 'auto', glyph: '🚗', keywords: ['авто', 'машин', 'бензин'] },
  { id: 'sports', glyph: '⚽', keywords: ['спорт', 'фитнес'] },
  { id: 'clothes', glyph: '👕', keywords: ['одежд'] },
  { id: 'linen', glyph: '🧺', keywords: ['белье', 'бельё'] },
  { id: 'shoes', glyph: '👟', keywords: ['обув'] },
  { id: 'docs', glyph: '📄', keywords: ['документ', 'паспорт'] },
  { id: 'travel', glyph: '🧳', keywords: ['дорог', 'чемодан', 'отпуск'] },
  { id: 'garden', glyph: '🌱', keywords: ['сад', 'огород', 'газон'] },
  { id: 'flowers', glyph: '🌸', keywords: ['цвет', 'букет'] },
  { id: 'gift', glyph: '🎁', keywords: ['подар'] },
  {
    id: 'westie',
    glyph: '',
    keywords: ['вест', 'терьер', 'westie', 'west highland'],
  },
  { id: 'other', glyph: '📦', keywords: ['друго'] },
] as const

export const ALL_ICONS = [...GROUP_ICONS, ...CATEGORY_ICONS]

export type CategoryIconId = (typeof ALL_ICONS)[number]['id'] | FileCategoryIconId

export function isCategoryIconId(value: string): value is CategoryIconId {
  return ALL_ICONS.some((icon) => icon.id === value) || FILE_CATEGORY_ICONS.some((icon) => icon.id === value)
}

export function coloredIconIdFromName(name: string): CategoryIconId {
  const needle = name.trim().toLowerCase().replace(/ё/g, 'е')
  for (const icon of ALL_ICONS) {
    if (icon.keywords.some((keyword) => needle.includes(keyword.replace(/ё/g, 'е')))) {
      return icon.id
    }
  }
  return 'other'
}

export function iconIdFromName(name: string): CategoryIconId {
  const fromFile = fileIconIdForName(name)
  if (fromFile) return fromFile
  return coloredIconIdFromName(name)
}

/** Значок с учётом общего переключателя «Контурные / Цветные». */
export function displayIconId(
  name: string,
  icon: string | undefined,
  style?: 'contour' | 'color',
): string {
  if (style === 'contour') {
    const file = fileIconIdForName(name)
    if (file) return file
  }
  if (style === 'color') {
    if (icon && isCategoryIconId(icon) && !fileCategoryIcon(icon)) return icon
    return coloredIconIdFromName(name)
  }
  if (icon && isCategoryIconId(icon)) return icon
  return iconIdFromName(name)
}

export function canonicalStoreIcon(name: string, icon: string | undefined): string | undefined {
  const inferred = iconIdFromName(name)
  if (inferred === 'gubernskie' && (!icon || icon === 'pharmacy' || icon === 'other')) return 'gubernskie'
  return icon
}

export function resolvedGroupIcon(group: { name: string; icon?: string }): CategoryIconId | undefined {
  const icon = canonicalStoreIcon(group.name, group.icon)
  if (icon && isCategoryIconId(icon)) return icon
  const inferred = iconIdFromName(group.name)
  return inferred === 'other' ? undefined : inferred
}

const FILE_CATEGORY_COLORS = CATEGORY_COLORS.filter((color) => color !== 'none')

function categoryNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, 'е')
}

/**
 * Цветной значок меняется на контурный с тем же названием.
 * Уже контурный значок не трогаем, даже если он выбран для другого названия.
 */
export function contourReplacement(name: string, icon: string | undefined): string | undefined {
  const desired = fileIconIdForName(name)
  if (!desired || icon === desired) return undefined
  if (icon && FILE_CATEGORY_ICONS.some((item) => item.id === icon)) return undefined
  if (!icon && iconIdFromName(name) === desired) return undefined
  return desired
}

export function hasContourReplacements(data: {
  categories: Array<Pick<Category, 'name' | 'icon'>>
  stores: Array<{ name: string; icon?: string }>
  groups?: Array<{ name: string; icon?: string }>
}): boolean {
  if (data.categories.some((category) => contourReplacement(category.name, category.icon))) return true
  if (data.stores.some((store) => contourReplacement(store.name, store.icon))) return true
  return (data.groups ?? []).some((group) => contourReplacement(group.name, group.icon))
}

export const CONTOUR_OFFER_KEY = 'pokupki-contour-offer-v5'

/** Общие категории, которых ещё нет: имя и значок берутся из файла библиотеки. */
export function fileCategoriesToAdd(categories: Category[], at = new Date().toISOString()): Category[] {
  const names = new Set(
    categories.filter((category) => !category.storeId).map((category) => categoryNameKey(category.name)),
  )
  return FILE_CATEGORY_ICONS.filter((icon) => !names.has(categoryNameKey(icon.name))).map((icon) => {
    const index = Number(icon.file.slice(0, 2)) - 1
    return {
      id: `filecat-${icon.file.slice(0, 2)}`,
      name: icon.name,
      color: FILE_CATEGORY_COLORS[index % FILE_CATEGORY_COLORS.length] ?? '#6b7280',
      icon: icon.id,
      updatedAt: at,
    }
  })
}

export function categoryGlyph(category: Pick<Category, 'name' | 'icon'>): string {
  if (category.icon && fileIconIdForName(category.name) === category.icon) return ''
  if (category.icon && FILE_CATEGORY_ICONS.some((icon) => icon.id === category.icon)) return ''
  if (category.icon && isCategoryIconId(category.icon)) {
    const match = ALL_ICONS.find((icon) => icon.id === category.icon)
    if (match) return match.glyph
  }
  const inferredId = iconIdFromName(category.name)
  if (FILE_CATEGORY_ICONS.some((icon) => icon.id === inferredId)) return ''
  const inferred = ALL_ICONS.find((icon) => icon.id === inferredId)
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
