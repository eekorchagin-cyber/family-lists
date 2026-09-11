import type { Store, StoreGroup } from '../types'

export const HOME_ORDER_KEY = 'pokupki-home-order'
export const GROUP_COLLAPSED_KEY = 'pokupki-group-collapsed'
export const GROUPS_CATALOG_ID = '__pokupki_groups__'
export const GROUP_NAME_KEY = '__g'

export type HomeEntry =
  | { type: 'store'; id: string }
  | { type: 'group'; id: string }

export type HomeRow =
  | { key: string; kind: 'group'; group: StoreGroup }
  | { key: string; kind: 'store'; store: Store; depth: 0 | 1 }

export function groupHomeKey(groupId: string): string {
  return `g:${groupId}`
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
  localStorage.setItem(GROUP_COLLAPSED_KEY, JSON.stringify(map))
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
): { names: Record<string, string>; groupId?: string } {
  const next: Record<string, string> = {}
  let groupId: string | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key === GROUP_NAME_KEY) {
      if (value.trim()) groupId = value.trim()
      continue
    }
    next[key] = value
  }
  return groupId ? { names: next, groupId } : { names: next }
}

export function withGroupMarker(
  names: Record<string, string>,
  groupId: string | undefined,
): Record<string, string> {
  const { names: clean } = stripGroupMarker(names)
  if (!groupId) return clean
  return { ...clean, [GROUP_NAME_KEY]: groupId }
}


export function mergeGroups(
  remote: StoreGroup[],
  local: StoreGroup[],
  deletedIds: Iterable<string> = [],
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
    if (!current || (group.updatedAt ?? '') >= (current.updatedAt ?? '')) {
      byId.set(group.id, group)
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
      groups.push({
        id: row.id,
        name: row.name,
        ...(typeof row.updatedAt === 'string' ? { updatedAt: row.updatedAt } : {}),
      })
    }
    return groups
  } catch {
    return null
  }
}
