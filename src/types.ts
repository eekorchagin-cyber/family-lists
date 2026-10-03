export type Theme = 'light' | 'dark'
export type FontSize = 's' | 'm' | 'l'
export type IconStyle = 'contour' | 'color'

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
  /** Нет поля или «home» — шаблон виден всей семье. */
  visibility?: StoreVisibility
  ownerId?: string
}

/** Группа в «Мои шаблоны»: внутри неё лежат шаблоны списков. */
export type TemplateFolder = {
  id: string
  name: string
  templates: NamedTemplate[]
  ownerId?: string
  updatedAt?: string
}

export type StoreVisibility = 'private' | 'home'

export type LoyaltyKind = 'barcode' | 'qr' | 'app'

export type LoyaltyCard = {
  kind: LoyaltyKind
  value: string
  format?: string
  label?: string
  /** Снимок штрих-кода, если телефон не разобрал код. */
  image?: string
}

export type StoreGroup = {
  id: string
  name: string
  icon?: string
  loyaltyCard?: LoyaltyCard
  templates?: NamedTemplate[]
  /** Нет поля или «home» — группа видна всей семье. */
  visibility?: StoreVisibility
  ownerId?: string
  /** Списки внутри личной группы: на других ваших телефонах, без публикации семье. */
  storeIds?: string[]
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
  /** Присланный список: отдельная копия, не список семьи. */
  incomingFrom?: string
  incomingId?: string
  /** Если задан — список лежит внутри группы (второй уровень). */
  groupId?: string
  icon?: string
  loyaltyCard?: LoyaltyCard
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
  /** Как рисовать значки категорий, списков и групп. Пусто — как сохранено у каждого. */
  iconStyle?: IconStyle
  /** Списки, которые не входят в число на ярлыке. Пусто — считаются все. */
  badgeExcludedStoreIds?: string[]
  /** Новые списки сразу входят в число на ярлыке. По умолчанию да. */
  badgeIncludeNew?: boolean
}

export type AppData = {
  version: 1
  stores: Store[]
  groups: StoreGroup[]
  items: Item[]
  categories: Category[]
  catalog: CatalogEntry[]
  settings: Settings
  /** Личные группы шаблонов из «Мои шаблоны». */
  templateFolders?: TemplateFolder[]
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
  | { name: 'storeSettings'; storeId: string; section?: 'list' | 'categories' | 'templates' }
  | { name: 'add'; storeId: string; draft: ParsedItem }
  | { name: 'newStore' }
