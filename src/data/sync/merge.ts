import type { AppData, Item, Store, StoreVisibility } from '../../types'

function stamp(): string {
  return new Date().toISOString()
}

export function nowIso(): string {
  return stamp()
}

export function withUpdatedAt<T>(row: T, at = stamp()): T & { updatedAt: string } {
  return { ...row, updatedAt: at }
}

export function stampAllData(data: AppData): AppData {
  const at = stamp()
  return {
    ...data,
    stores: data.stores.map((store) => ({ ...store, updatedAt: at })),
    groups: (data.groups ?? []).map((group) => ({ ...group, updatedAt: at })),
    categories: data.categories.map((category) => ({ ...category, updatedAt: at })),
    items: data.items.map((item) => ({ ...item, updatedAt: at })),
    catalog: (data.catalog ?? []).map((entry) => ({ ...entry, updatedAt: at })),
  }
}

export function mergeItems(local: Item, remote: Item): Item {
  const localAt = local.updatedAt ?? ''
  const remoteAt = remote.updatedAt ?? ''
  const newer = localAt >= remoteAt ? local : remote
  const older = newer === local ? remote : local
  return {
    ...newer,
    name: newer.name,
    categoryId: newer.categoryId,
    bought: newer.bought,
    boughtBy: newer.bought ? newer.boughtBy : undefined,
    addedBy: newer.addedBy ?? older.addedBy,
    updatedAt: localAt >= remoteAt ? localAt : remoteAt,
  }
}

function mergeStore(local: Store, remote: Store, userId?: string): Store {
  const ownerId = remote.ownerId ?? local.ownerId
  // Чужой список: облако — источник правды (группа, имя, категории).
  // Иначе локальные правки на втором телефоне «перебивают» вложенность.
  if (userId && ownerId && ownerId !== userId) return remote
  const localAt = local.updatedAt ?? ''
  const remoteAt = remote.updatedAt ?? ''
  if (remoteAt > localAt) return remote
  if (localAt > remoteAt) {
    if (remote.groupId && !local.groupId) return { ...local, groupId: remote.groupId }
    return local
  }
  if (remote.groupId && !local.groupId) return { ...local, groupId: remote.groupId }
  return local
}

function sameStoreMeta(a: Store, b: Store): boolean {
  return (
    a.name === b.name &&
    a.groupId === b.groupId &&
    a.visibility === b.visibility &&
    a.categorySort === b.categorySort &&
    a.ownerId === b.ownerId &&
    (a.updatedAt ?? '') === (b.updatedAt ?? '') &&
    JSON.stringify(a.categoryOrder) === JSON.stringify(b.categoryOrder) &&
    JSON.stringify(a.categoryNames) === JSON.stringify(b.categoryNames) &&
    JSON.stringify(a.templates ?? []) === JSON.stringify(b.templates ?? [])
  )
}

function locallyNewer(updatedAt: string | undefined, lastPulledAt: string | null): boolean {
  if (!lastPulledAt) return true
  if (!updatedAt) return true
  return updatedAt > lastPulledAt
}

export function applyStoreOrder(stores: Store[], orderedIds: string[]): Store[] {
  if (stores.length === 0 || orderedIds.length === 0) return stores
  const byId = new Map(stores.map((store) => [store.id, store]))
  const next: Store[] = []
  const seen = new Set<string>()
  for (const id of orderedIds) {
    const store = byId.get(id)
    if (!store || seen.has(id)) continue
    next.push(store)
    seen.add(id)
  }
  for (const store of stores) {
    if (seen.has(store.id)) continue
    next.push(store)
  }
  return next
}

function itemFingerprint(item: Item): string {
  return [item.id, item.storeId, item.name, String(item.qty), item.unit, item.bought ? '1' : '0', item.categoryId].join(
    '\0',
  )
}

export function visibleStoreUpdates(before: AppData, after: AppData): string[] {
  const ids = new Set<string>()
  const beforeStores = new Map(before.stores.map((store) => [store.id, store]))
  const afterStores = new Map(after.stores.map((store) => [store.id, store]))

  for (const store of after.stores) {
    const prev = beforeStores.get(store.id)
    if (!prev || prev.name !== store.name || prev.groupId !== store.groupId) {
      ids.add(store.id)
    }
  }

  const group = (items: Item[]) => {
    const map = new Map<string, string[]>()
    for (const item of items) {
      const list = map.get(item.storeId) ?? []
      list.push(itemFingerprint(item))
      map.set(item.storeId, list)
    }
    for (const list of map.values()) list.sort()
    return map
  }
  const beforeItems = group(before.items)
  const afterItems = group(after.items)
  for (const store of after.stores) {
    const prev = (beforeItems.get(store.id) ?? []).join('\n')
    const next = (afterItems.get(store.id) ?? []).join('\n')
    if (prev !== next) ids.add(store.id)
  }
  return [...ids].filter((id) => afterStores.has(id))
}

export function mergePulledData(
  local: AppData,
  remote: AppData,
  options: {
    lastPulledAt: string | null
    userId: string
    deletedItemIds?: string[]
    deletedStoreIds?: string[]
    deletedGroupIds?: string[]
  },
): { next: AppData; changed: boolean; changedStoreIds: string[] } {
  const deletedItems = new Set(options.deletedItemIds ?? [])
  const deletedStores = new Set(options.deletedStoreIds ?? [])
  const deletedGroups = new Set(options.deletedGroupIds ?? [])
  const stores = new Map(local.stores.map((store) => [store.id, store]))
  const changedStoreIds = new Set<string>()
  const markStore = (id: string | undefined) => {
    if (id) changedStoreIds.add(id)
  }
  let changed = false
  for (const store of remote.stores) {
    if (deletedStores.has(store.id)) continue
    const current = stores.get(store.id)
    if (!current) {
      stores.set(store.id, store)
      markStore(store.id)
      changed = true
      continue
    }
    const merged = mergeStore(current, store, options.userId)
    if (!sameStoreMeta(merged, current)) {
      stores.set(store.id, merged)
      markStore(store.id)
      changed = true
    }
  }

  const remoteStoreIds = new Set(remote.stores.map((store) => store.id))
  for (const [id, store] of [...stores.entries()]) {
    if (remoteStoreIds.has(id)) continue
    const mine = !store.ownerId || store.ownerId === options.userId
    if (mine && locallyNewer(store.updatedAt, options.lastPulledAt)) continue
    stores.delete(id)
    changed = true
  }

  const categories = new Map(local.categories.map((category) => [category.id, category]))
  for (const category of remote.categories) {
    const current = categories.get(category.id)
    if (!current) {
      categories.set(category.id, category)
      markStore(category.storeId)
      changed = true
    } else if ((category.updatedAt ?? '') > (current.updatedAt ?? '')) {
      categories.set(category.id, category)
      markStore(category.storeId)
      changed = true
    }
  }

  const remoteCategoryIds = new Set(remote.categories.map((category) => category.id))
  for (const [id, category] of [...categories.entries()]) {
    if (remoteCategoryIds.has(id)) continue
    if (locallyNewer(category.updatedAt, options.lastPulledAt)) continue
    if (category.storeId && !stores.has(category.storeId)) {
      categories.delete(id)
      changed = true
    } else if (options.lastPulledAt) {
      markStore(category.storeId)
      categories.delete(id)
      changed = true
    }
  }

  const catalog = new Map((local.catalog ?? []).map((entry) => [entry.id, entry]))
  for (const entry of remote.catalog ?? []) {
    const current = catalog.get(entry.id)
    if (!current) {
      catalog.set(entry.id, entry)
      changed = true
    } else if ((entry.updatedAt ?? '') > (current.updatedAt ?? '')) {
      catalog.set(entry.id, entry)
      changed = true
    }
  }

  const remoteCatalogIds = new Set((remote.catalog ?? []).map((entry) => entry.id))
  for (const [id, entry] of [...catalog.entries()]) {
    if (remoteCatalogIds.has(id)) continue
    if (locallyNewer(entry.updatedAt, options.lastPulledAt)) continue
    if (options.lastPulledAt) {
      catalog.delete(id)
      changed = true
    }
  }

  const items = new Map(local.items.map((item) => [item.id, item]))
  const remoteIds = new Set(remote.items.map((item) => item.id))
  for (const item of remote.items) {
    if (deletedItems.has(item.id)) continue
    const current = items.get(item.id)
    if (!current) {
      items.set(item.id, item)
      markStore(item.storeId)
      changed = true
      continue
    }
    const merged = mergeItems(current, item)
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      items.set(item.id, merged)
      markStore(item.storeId)
      markStore(current.storeId)
      changed = true
    }
  }

  for (const [id, item] of [...items.entries()]) {
    if (remoteIds.has(id)) continue
    if (item.bought) continue
    const store = stores.get(item.storeId)
    if (!store) {
      items.delete(id)
      changed = true
      continue
    }
    if (locallyNewer(item.updatedAt, options.lastPulledAt)) continue
    if (options.lastPulledAt) {
      markStore(item.storeId)
      items.delete(id)
      changed = true
    }
  }

  const groups = new Map((local.groups ?? []).map((group) => [group.id, group]))
  for (const group of remote.groups ?? []) {
    if (deletedGroups.has(group.id)) continue
    const current = groups.get(group.id)
    if (!current) {
      groups.set(group.id, group)
      changed = true
      // Новая группа с другого телефона — подсветим списки внутри неё.
      for (const store of stores.values()) {
        if (store.groupId === group.id) markStore(store.id)
      }
    } else if ((group.updatedAt ?? '') > (current.updatedAt ?? '')) {
      groups.set(group.id, group)
      changed = true
    }
  }
  // Группы не удаляем только потому, что их нет в облаке: иначе телефон
  // с пустым каталогом групп затирает семейные названия навсегда.
  for (const id of deletedGroups) {
    if (!groups.has(id)) continue
    groups.delete(id)
    changed = true
  }

  const nextStores = applyStoreOrder(
    [...stores.values()],
    local.stores.map((store) => store.id),
  )
  const nextStoreIds = new Set(nextStores.map((store) => store.id))
  // Не снимаем groupId, если карточки группы ещё нет: иначе список
  // пропадает с главного экрана, а чужой push затирает привязку в облаке.
  return {
    changed,
    changedStoreIds: [...changedStoreIds].filter((id) => nextStoreIds.has(id)),
    next: {
      ...local,
      stores: nextStores,
      groups: [...groups.values()],
      categories: [...categories.values()],
      catalog: [...catalog.values()],
      items: [...items.values()],
    },
  }
}

export function mergeByStoreName(device: AppData, cloud: AppData): AppData {
  const stores: Store[] = [...cloud.stores]
  const items: Item[] = [...cloud.items]
  const usedRemote = new Set<string>()
  const storeIdMap = new Map<string, string>()

  for (const localStore of device.stores) {
    const remote = stores.find(
      (store) =>
        !usedRemote.has(store.id) &&
        store.name.trim().toLowerCase() === localStore.name.trim().toLowerCase(),
    )
    if (!remote) {
      stores.push(localStore)
      items.push(...device.items.filter((item) => item.storeId === localStore.id))
      storeIdMap.set(localStore.id, localStore.id)
      continue
    }
    usedRemote.add(remote.id)
    storeIdMap.set(localStore.id, remote.id)
    const index = stores.findIndex((store) => store.id === remote.id)
    if (index >= 0) {
      stores[index] = { ...remote, ...mergeStore(localStore, remote), id: remote.id }
    }
    const remoteItems = items.filter((item) => item.storeId === remote.id)
    const localItems = device.items.filter((item) => item.storeId === localStore.id)
    for (const localItem of localItems) {
      const match = remoteItems.find(
        (item) => item.name.trim().toLowerCase() === localItem.name.trim().toLowerCase(),
      )
      if (match) {
        const merged = mergeItems({ ...localItem, storeId: remote.id, id: match.id }, match)
        const at = items.findIndex((item) => item.id === match.id)
        if (at >= 0) items[at] = merged
      } else {
        items.push({ ...localItem, storeId: remote.id })
      }
    }
  }

  const categories = new Map(cloud.categories.map((category) => [category.id, category]))
  for (const category of device.categories) {
    const mappedStoreId = category.storeId ? storeIdMap.get(category.storeId) : undefined
    const next = category.storeId
      ? { ...category, storeId: mappedStoreId ?? category.storeId }
      : category
    if (!categories.has(next.id)) categories.set(next.id, next)
  }
  const catalogByName = new Map(
    (cloud.catalog ?? []).map((entry) => [entry.name.trim().toLowerCase(), entry]),
  )
  const catalog = [...(cloud.catalog ?? [])]
  for (const entry of device.catalog ?? []) {
    if (!catalogByName.has(entry.name.trim().toLowerCase())) catalog.push(entry)
  }

  const groupsById = new Map((cloud.groups ?? []).map((group) => [group.id, group]))
  for (const group of device.groups ?? []) {
    if (!groupsById.has(group.id)) groupsById.set(group.id, group)
  }

  return {
    ...device,
    stores,
    groups: [...groupsById.values()],
    items,
    categories: [...categories.values()],
    catalog,
  }
}

export function adoptLocalStores(
  data: AppData,
  userId: string,
  visibility: StoreVisibility,
): AppData {
  const at = nowIso()
  return {
    ...data,
    stores: data.stores.map((store) => ({
      ...store,
      ownerId: store.ownerId ?? userId,
      visibility: store.ownerId ? (store.visibility ?? 'private') : visibility,
      updatedAt: store.updatedAt ?? at,
    })),
    items: data.items.map((item) => ({
      ...item,
      addedBy: item.addedBy ?? userId,
      updatedAt: item.updatedAt ?? at,
    })),
    categories: data.categories.map((category) => ({
      ...category,
      updatedAt: category.updatedAt ?? at,
    })),
    catalog: (data.catalog ?? []).map((entry) => ({
      ...entry,
      updatedAt: entry.updatedAt ?? at,
    })),
  }
}
