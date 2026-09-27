import type { AppData, Category, Item, Store } from '../types'
import { withBadgeStore } from './appBadge'

export const INCOMING_KEY = '__in'

export type ForwardCategory = {
  id: string
  name: string
  color: string
  icon?: string
}

export type ForwardItem = {
  id: string
  name: string
  categoryId: string
  qty: number
  unit: string
  bought: boolean
}

export type ForwardPayload = {
  name: string
  categories: ForwardCategory[]
  items: ForwardItem[]
}

export type InboxDelivery = {
  id: string
  fromName: string
  listName: string
  payload: unknown
}

const SEEN_KEY = 'pokupki-inbox-seen'
const ITEM_LIMIT = 300

export function incomingStoreName(listName: string, fromName: string): string {
  const list = listName.trim() || 'Список'
  const from = fromName.trim() || 'человек'
  const suffix = ` · от ${from}`
  const base = list.endsWith(suffix) ? list : `${list}${suffix}`
  return base.length > 80 ? `${base.slice(0, 79)}…` : base
}

export function stripIncomingMarker(names: Record<string, string>): {
  names: Record<string, string>
  from?: string
  deliveryId?: string
} {
  const next: Record<string, string> = {}
  let from: string | undefined
  let deliveryId: string | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key !== INCOMING_KEY) {
      next[key] = value
      continue
    }
    const parsed = parseIncomingMarker(value)
    from = parsed.from
    deliveryId = parsed.deliveryId
  }
  return { names: next, ...(from ? { from } : {}), ...(deliveryId ? { deliveryId } : {}) }
}

export function withIncomingMarker(
  names: Record<string, string>,
  incoming: { from: string; deliveryId: string } | undefined,
): Record<string, string> {
  const { names: clean } = stripIncomingMarker(names)
  if (!incoming?.from.trim() || !incoming.deliveryId.trim()) return clean
  return {
    ...clean,
    [INCOMING_KEY]: `in:${JSON.stringify({
      from: incoming.from.trim(),
      id: incoming.deliveryId.trim(),
    })}`,
  }
}

export function sealIncomingStore(store: Store): Store {
  if (!store.incomingFrom) return store
  const next: Store = {
    ...store,
    visibility: 'private',
    incomingId: store.incomingId || store.id,
  }
  delete next.groupId
  return next
}

export function buildForwardPayload(store: Store, items: Item[], categories: Category[]): ForwardPayload {
  const used = items.filter((item) => item.storeId === store.id)
  if (used.length > ITEM_LIMIT) {
    throw new Error('В списке больше 300 товаров. Переслать можно список короче.')
  }
  const needed = new Set(used.map((item) => item.categoryId))
  const idMap = new Map<string, string>()
  const nextCategories: ForwardCategory[] = []
  for (const category of categories) {
    if (!needed.has(category.id) || idMap.has(category.id)) continue
    const id = crypto.randomUUID()
    idMap.set(category.id, id)
    nextCategories.push({
      id,
      name: category.name.trim() || 'Другое',
      color: category.color || '#6b7280',
      ...(category.icon ? { icon: category.icon } : {}),
    })
  }
  if (nextCategories.length === 0) {
    const id = crypto.randomUUID()
    nextCategories.push({ id, name: 'Другое', color: '#6b7280' })
    for (const categoryId of needed) idMap.set(categoryId, id)
  }
  const fallback = nextCategories[0]?.id ?? crypto.randomUUID()
  return {
    name: store.name.trim() || 'Список',
    categories: nextCategories,
    items: used.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name.trim() || 'Товар',
      categoryId: idMap.get(item.categoryId) ?? fallback,
      qty: Number.isFinite(item.qty) ? item.qty : 1,
      unit: item.unit.trim() || 'шт',
      bought: item.bought,
    })),
  }
}

export function applyForwardedLists(
  data: AppData,
  deliveries: InboxDelivery[],
  userId: string,
): { next: AppData; addedIds: string[] } {
  const seen = loadSeen()
  const storeIds = new Set(data.stores.map((store) => store.id))
  const categoryIds = new Set(data.categories.map((category) => category.id))
  const itemIds = new Set(data.items.map((item) => item.id))
  let next = data
  const addedIds: string[] = []
  let seenChanged = false
  for (const delivery of deliveries) {
    if (!delivery.id) continue
    if (seen.has(delivery.id) || storeIds.has(delivery.id)) {
      if (!seen.has(delivery.id)) {
        seen.add(delivery.id)
        seenChanged = true
      }
      continue
    }
    const payload = parseForwardPayload(delivery.payload)
    if (!payload) continue
    const at = new Date().toISOString()
    const idMap = new Map<string, string>()
    const categories: Category[] = []
    const sourceCategories = payload.categories.length > 0
      ? payload.categories
      : [{ id: crypto.randomUUID(), name: 'Другое', color: '#6b7280' }]
    for (const category of sourceCategories) {
      let id = category.id
      if (categoryIds.has(id)) id = crypto.randomUUID()
      categoryIds.add(id)
      idMap.set(category.id, id)
      categories.push({
        id,
        name: category.name,
        color: category.color,
        ...(category.icon ? { icon: category.icon } : {}),
        storeId: delivery.id,
        updatedAt: at,
      })
    }
    const fallbackId = categories[0]?.id
    const items: Item[] = []
    for (const item of payload.items) {
      const categoryId = idMap.get(item.categoryId) ?? fallbackId
      if (!categoryId) continue
      let id = item.id
      if (itemIds.has(id)) id = crypto.randomUUID()
      itemIds.add(id)
      items.push({
        id,
        storeId: delivery.id,
        name: item.name,
        categoryId,
        qty: item.qty,
        unit: item.unit,
        bought: item.bought,
        addedBy: userId,
        updatedAt: at,
      })
    }
    const store: Store = sealIncomingStore({
      id: delivery.id,
      name: incomingStoreName(payload.name || delivery.listName, delivery.fromName),
      categorySort: 'custom',
      categoryOrder: categories.map((category) => category.id),
      categoryNames: {},
      templates: [],
      visibility: 'private',
      ownerId: userId,
      incomingFrom: delivery.fromName.trim() || 'человек',
      incomingId: delivery.id,
      updatedAt: at,
    })
    storeIds.add(store.id)
    seen.add(delivery.id)
    seenChanged = true
    addedIds.push(store.id)
    next = {
      ...next,
      stores: [...next.stores, store],
      categories: [...next.categories, ...categories],
      items: [...next.items, ...items],
      settings: withBadgeStore(next.settings, store.id, false),
    }
  }
  if (seenChanged) saveSeen(seen)
  return { next, addedIds }
}

export function rememberIncomingDismissed(deliveryId: string): void {
  if (!deliveryId) return
  const seen = loadSeen()
  seen.add(deliveryId)
  saveSeen(seen)
}

function parseIncomingMarker(raw: string): { from?: string; deliveryId?: string } {
  const text = raw.trim().startsWith('in:') ? raw.trim().slice(3) : raw.trim()
  try {
    const value = JSON.parse(text) as { from?: unknown; id?: unknown }
    const from = typeof value.from === 'string' ? value.from.trim() : ''
    const deliveryId = typeof value.id === 'string' ? value.id.trim() : ''
    return {
      ...(from ? { from } : {}),
      ...(deliveryId ? { deliveryId } : {}),
    }
  } catch {
    return {}
  }
}

function parseForwardPayload(value: unknown): ForwardPayload | null {
  if (!value || typeof value !== 'object') return null
  const row = value as { name?: unknown; categories?: unknown; items?: unknown }
  const categories = Array.isArray(row.categories)
    ? row.categories.flatMap((category) => {
        if (!category || typeof category !== 'object') return []
        const item = category as { id?: unknown; name?: unknown; color?: unknown; icon?: unknown }
        const id = typeof item.id === 'string' ? item.id.trim() : ''
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        if (!id || !name) return []
        const icon = typeof item.icon === 'string' ? item.icon.trim() : ''
        return [{
          id,
          name: name.slice(0, 80),
          color: typeof item.color === 'string' && item.color.trim() ? item.color : '#6b7280',
          ...(icon ? { icon } : {}),
        }]
      })
    : []
  const items = Array.isArray(row.items)
    ? row.items.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const item = entry as {
          id?: unknown
          name?: unknown
          categoryId?: unknown
          qty?: unknown
          unit?: unknown
          bought?: unknown
        }
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        const categoryId = typeof item.categoryId === 'string' ? item.categoryId : ''
        if (!name || !categoryId) return []
        const qty = typeof item.qty === 'number' && Number.isFinite(item.qty) ? item.qty : 1
        return [{
          id: typeof item.id === 'string' && item.id.trim() ? item.id : crypto.randomUUID(),
          name: name.slice(0, 120),
          categoryId,
          qty,
          unit: typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'шт',
          bought: item.bought === true,
        }]
      }).slice(0, ITEM_LIMIT)
    : []
  const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
  if (!name && items.length === 0) return null
  return { name: name || 'Список', categories, items }
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const value = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveSeen(ids: Set<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)))
}
