import type { Store, StoreGroup } from '../types'
import { parseLoyaltyCard } from './loyalty'
import { mergeTemplates, parseTemplateList } from './templates'

export const HOME_ORDER_KEY = 'pokupki-home-order'
export const GROUP_COLLAPSED_KEY = 'pokupki-group-collapsed'
export const GROUPS_CATALOG_ID = '__pokupki_groups__'
export const STORE_ICON_KEY = '__ic'
export const GROUP_NAME_KEY = '__g'
export const GROUP_TITLE_KEY = '__gn'

/** Id строки каталога с группами: на дом, чтобы семьи не затирали друг друга. */
export function groupsCatalogIdForHome(homeId: string): string {
  return `${GROUPS_CATALOG_ID}:${homeId}`
}

export function isGroupsCatalogId(id: string): boolean {
  return id === GROUPS_CATALOG_ID || id.startsWith(`${GROUPS_CATALOG_ID}:`)
}

export type HomeEntry =
  | { type: 'store'; id: string }
  | { type: 'group'; id: string }

export type HomeRow =
  | { key: string; kind: 'group'; group: StoreGroup }
  | { key: string; kind: 'store'; store: Store; depth: 0 | 1 }

export function groupHomeKey(groupId: string): string {
  return `g:${groupId}`
}

export function groupVisibleTo(group: StoreGroup, userId: string | undefined): boolean {
  if (group.visibility !== 'private') return true
  if (!userId || !group.ownerId) return true
  return group.ownerId === userId
}

export function groupVisibilityFields(row: Record<string, unknown>): Pick<StoreGroup, 'visibility' | 'ownerId' | 'storeIds'> {
  const visibility = row.visibility === 'private' || row.visibility === 'home' ? row.visibility : undefined
  const ownerId = typeof row.ownerId === 'string' && row.ownerId.trim() ? row.ownerId.trim() : undefined
  const storeIds = Array.isArray(row.storeIds)
    ? row.storeIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    : undefined
  return {
    ...(visibility ? { visibility } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(storeIds ? { storeIds } : {}),
  }
}

export function nestStoresInPrivateGroups(stores: Store[], groups: StoreGroup[]): Store[] {
  const groupByStore = new Map<string, string>()
  for (const group of groups) {
    if (group.visibility !== 'private') continue
    for (const storeId of group.storeIds ?? []) groupByStore.set(storeId, group.id)
  }
  if (groupByStore.size === 0) return stores
  return stores.map((store) => {
    const groupId = groupByStore.get(store.id)
    if (!groupId || store.groupId === groupId) return store
    return { ...store, groupId }
  })
}

export function parseHomeKey(key: string): HomeEntry | null {
  if (key.startsWith('g:')) {
    const id = key.slice(2)
    return id ? { type: 'group', id } : null
  }
  if (key) return { type: 'store', id: key }
  return null
}

export function loadHomeOrder(): string[] {
  try {
    const raw = localStorage.getItem(HOME_ORDER_KEY)
    if (!raw) return []
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function saveHomeOrder(keys: string[]): void {
  localStorage.setItem(HOME_ORDER_KEY, JSON.stringify(keys))
}

export function loadCollapsedGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUP_COLLAPSED_KEY)
    if (!raw) return {}
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object') return {}
    const next: Record<string, boolean> = {}
    for (const [id, collapsed] of Object.entries(value as Record<string, unknown>)) {
      if (typeof collapsed === 'boolean') next[id] = collapsed
    }
    return next
  } catch {
    return {}
  }
}

export function saveCollapsedGroups(map: Record<string, boolean>): void {
  const collapsed: Record<string, true> = {}
  for (const [id, value] of Object.entries(map)) {
    if (value) collapsed[id] = true
  }
  localStorage.setItem(GROUP_COLLAPSED_KEY, JSON.stringify(collapsed))
}

export function ensureHomeOrder(
  stores: Store[],
  groups: StoreGroup[],
  saved: string[] = loadHomeOrder(),
): string[] {
  const topStoreIds = new Set(
    stores.filter((store) => !store.groupId).map((store) => store.id),
  )
  const groupIds = new Set(groups.map((group) => group.id))
  const next: string[] = []
  const seen = new Set<string>()

  for (const key of saved) {
    const entry = parseHomeKey(key)
    if (!entry) continue
    if (entry.type === 'group') {
      if (!groupIds.has(entry.id) || seen.has(key)) continue
      next.push(key)
      seen.add(key)
      continue
    }
    if (!topStoreIds.has(entry.id) || seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }

  for (const group of groups) {
    const key = groupHomeKey(group.id)
    if (seen.has(key)) continue
    next.push(key)
    seen.add(key)
  }
  for (const store of stores) {
    if (store.groupId) continue
    if (seen.has(store.id)) continue
    next.push(store.id)
    seen.add(store.id)
  }
  return next
}

export function buildHomeRows(
  stores: Store[],
  groups: StoreGroup[],
  homeOrder: string[],
  collapsed: Record<string, boolean>,
): HomeRow[] {
  const visibleStores = storesForHome(stores, groups)
  const storeById = new Map(visibleStores.map((store) => [store.id, store]))
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const nested = new Map<string, Store[]>()
  for (const store of visibleStores) {
    if (!store.groupId) continue
    const list = nested.get(store.groupId) ?? []
    list.push(store)
    nested.set(store.groupId, list)
  }

  const rows: HomeRow[] = []
  for (const key of ensureHomeOrder(visibleStores, groups, homeOrder)) {
    const entry = parseHomeKey(key)
    if (!entry) continue
    if (entry.type === 'group') {
      const group = groupById.get(entry.id)
      if (!group) continue
      rows.push({ key, kind: 'group', group })
      if (collapsed[group.id]) continue
      for (const store of nested.get(group.id) ?? []) {
        rows.push({ key: `s:${store.id}`, kind: 'store', store, depth: 1 })
      }
      continue
    }
    const store = storeById.get(entry.id)
    if (!store || store.groupId) continue
    rows.push({ key: store.id, kind: 'store', store, depth: 0 })
  }
  return rows
}

export function stripGroupMarker(
  names: Record<string, string>,
): { names: Record<string, string>; groupId?: string; groupName?: string } {
  const next: Record<string, string> = {}
  let groupId: string | undefined
  let groupName: string | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key === GROUP_NAME_KEY) {
      if (value.trim()) groupId = value.trim()
      continue
    }
    if (key === GROUP_TITLE_KEY) {
      if (value.trim()) groupName = value.trim()
      continue
    }
    next[key] = value
  }
  return {
    names: next,
    ...(groupId ? { groupId } : {}),
    ...(groupName ? { groupName } : {}),
  }
}

export function withGroupMarker(
  names: Record<string, string>,
  groupId: string | undefined,
  groupName?: string,
): Record<string, string> {
  const { names: clean } = stripGroupMarker(names)
  if (!groupId) return clean
  return {
    ...clean,
    [GROUP_NAME_KEY]: groupId,
    ...(groupName?.trim() ? { [GROUP_TITLE_KEY]: groupName.trim() } : {}),
  }
}

export function stripStoreIcon(names: Record<string, string>): {
  names: Record<string, string>
  icon?: string
} {
  const next: Record<string, string> = {}
  let icon: string | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key === STORE_ICON_KEY) {
      if (value.trim()) icon = value.trim()
      continue
    }
    next[key] = value
  }
  return { names: next, ...(icon ? { icon } : {}) }
}

export function withStoreIcon(names: Record<string, string>, icon: string | undefined): Record<string, string> {
  const { names: clean } = stripStoreIcon(names)
  if (!icon?.trim()) return clean
  return { ...clean, [STORE_ICON_KEY]: icon.trim() }
}

/** Собираем группы из метаданных списков — запасной канал, если catalog пуст. */
export function groupsFromStores(
  stores: Store[],
  groupNames: Map<string, string>,
): StoreGroup[] {
  const byId = new Map<string, StoreGroup>()
  for (const store of stores) {
    if (store.incomingFrom || !store.groupId) continue
    if (byId.has(store.groupId)) continue
    const name = groupNames.get(store.groupId)?.trim()
    byId.set(store.groupId, {
      id: store.groupId,
      name: name || 'Группа',
      updatedAt: store.updatedAt,
    })
  }
  return [...byId.values()]
}


function applyGroupTemplates(
  winner: StoreGroup,
  other: StoreGroup,
  userId: string | undefined,
): StoreGroup {
  // winner = более новая сторона; local=other, remote=winner — id из winner
  // важнее, но шаблоны только у other не выкидываем (см. mergeTemplates).
  const templates = mergeTemplates(other.templates, winner.templates, userId)
  if (templates.length === 0) {
    if (!winner.templates && !other.templates) return winner
    const next = { ...winner }
    delete next.templates
    return next
  }
  return { ...winner, templates }
}

function preservePrivateGroup(winner: StoreGroup, other: StoreGroup): StoreGroup {
  if (winner.visibility === 'private') {
    if (!winner.ownerId && other.ownerId) return { ...winner, ownerId: other.ownerId }
    if (!winner.storeIds && other.storeIds) return { ...winner, storeIds: other.storeIds }
    return winner
  }
  if (winner.visibility === 'home' || other.visibility !== 'private') return winner
  return {
    ...winner,
    visibility: 'private',
    ...(other.ownerId ? { ownerId: other.ownerId } : {}),
    ...(winner.storeIds ? { storeIds: winner.storeIds } : other.storeIds ? { storeIds: other.storeIds } : {}),
  }
}

function isPlaceholderGroupName(name: string): boolean {
  return name.trim() === '' || name.trim() === 'Группа'
}

export function mergeGroups(
  remote: StoreGroup[],
  local: StoreGroup[],
  deletedIds: Iterable<string> = [],
  userId?: string,
): StoreGroup[] {
  const deleted = new Set(deletedIds)
  const byId = new Map<string, StoreGroup>()
  for (const group of remote) {
    if (deleted.has(group.id)) continue
    byId.set(group.id, group)
  }
  for (const group of local) {
    if (deleted.has(group.id)) continue
    const current = byId.get(group.id)
    if (!current) {
      byId.set(group.id, group)
      continue
    }
    // Заглушка «Группа» из списков не должна перебивать имя из catalog.
    if (isPlaceholderGroupName(group.name) && !isPlaceholderGroupName(current.name)) {
      byId.set(group.id, preservePrivateGroup(applyGroupTemplates(current, group, userId), group))
      continue
    }
    if (isPlaceholderGroupName(current.name) && !isPlaceholderGroupName(group.name)) {
      byId.set(group.id, preservePrivateGroup(applyGroupTemplates(group, current, userId), current))
      continue
    }
    if ((group.updatedAt ?? '') >= (current.updatedAt ?? '')) {
      byId.set(group.id, preservePrivateGroup(applyGroupTemplates(group, current, userId), current))
    } else {
      byId.set(group.id, preservePrivateGroup(applyGroupTemplates(current, group, userId), group))
    }
  }
  return [...byId.values()]
}

/** Списки с groupId без самой группы показываем на первом уровне. */
export function storesForHome(stores: Store[], groups: StoreGroup[]): Store[] {
  const groupIds = new Set(groups.map((group) => group.id))
  return stores.map((store) =>
    store.groupId && !groupIds.has(store.groupId) ? { ...store, groupId: undefined } : store,
  )
}

export function parseGroupsCatalog(raw: string | undefined): StoreGroup[] | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return null
    const groups: StoreGroup[] = []
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      if (typeof row.id !== 'string' || typeof row.name !== 'string') continue
      const icon = typeof row.icon === 'string' ? row.icon.trim() : ''
      const loyaltyCard = parseLoyaltyCard(row.loyaltyCard)
      const templates = parseTemplateList(row.templates)
      groups.push({
        id: row.id,
        name: row.name,
        ...(icon ? { icon } : {}),
        ...(loyaltyCard ? { loyaltyCard } : {}),
        ...(templates ? { templates } : {}),
        ...groupVisibilityFields(row),
        ...(typeof row.updatedAt === 'string' ? { updatedAt: row.updatedAt } : {}),
      })
    }
    return groups
  } catch {
    return null
  }
}

/**
 * Каталог дома (в т.ч. пустой []) важнее legacy.
 * Раньше `[]` считался «пустым» и подмешивал старый legacy — удалённые группы возвращались.
 */
export function resolveRemoteGroups(
  homeGroups: StoreGroup[] | null,
  legacyGroups: StoreGroup[] | null,
): StoreGroup[] {
  if (homeGroups !== null) return homeGroups
  if (legacyGroups !== null) return legacyGroups
  return []
}
