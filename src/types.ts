export type Theme = 'light' | 'dark'
export type FontSize = 's' | 'm' | 'l'

export type Category = {
  id: string
  name: string
  color: string
  icon?: string
  storeId?: string
  updatedAt?: string
}

export type CategorySort = 'alpha' | 'custom'

export type TemplateItem = {
  name: string
  categoryId: string
  qty: number
  unit: string
}

export type NamedTemplate = {
  id: string
  name: string
  items: TemplateItem[]
}

export type StoreVisibility = 'private' | 'home'

export type StoreGroup = {
  id: string
  name: string
  updatedAt?: string
}

export type Store = {
  id: string
  name: string
  categorySort: CategorySort
  categoryOrder: string[]
  categoryNames: Record<string, string>
  templates: NamedTemplate[]
  visibility?: StoreVisibility
  ownerId?: string
  /** Если задан — список лежит внутри группы (второй уровень). */
  groupId?: string
  updatedAt?: string
}

export type Item = {
  id: string
  storeId: string
  name: string
  categoryId: string
  qty: number
  unit: string
  bought: boolean
  addedBy?: string
  boughtBy?: string
  updatedAt?: string
}

export type CatalogEntry = {
  id: string
  name: string
  categoryId: string
  updatedAt?: string
}

export type Settings = {
  theme: Theme
  fontSize: FontSize
}

export type AppData = {
  version: 1
  stores: Store[]
  groups: StoreGroup[]
  items: Item[]
  categories: Category[]
  catalog: CatalogEntry[]
  settings: Settings
}

export type ParsedItem = {
  name: string
  qty: number
  unit: string
}

export type Screen =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'store'; storeId: string }
  | { name: 'storeSettings'; storeId: string }
  | { name: 'add'; storeId: string; draft: ParsedItem }
  | { name: 'newStore' }
