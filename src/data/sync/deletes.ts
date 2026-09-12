const DELETES_KEY = 'pokupki-sync-deletes'

export type PendingDeletes = {
  items: string[]
  clearedItems: string[]
  stores: string[]
  groups: string[]
  categories: string[]
  catalog: string[]
}

function empty(): PendingDeletes {
  return { items: [], clearedItems: [], stores: [], groups: [], categories: [], catalog: [] }
}

function load(): PendingDeletes {
  try {
    const raw = localStorage.getItem(DELETES_KEY)
    if (!raw) return empty()
    const value = JSON.parse(raw) as Partial<PendingDeletes>
    return {
      items: value.items ?? [],
      clearedItems: value.clearedItems ?? [],
      stores: value.stores ?? [],
      groups: value.groups ?? [],
      categories: value.categories ?? [],
      catalog: value.catalog ?? [],
    }
  } catch {
    return empty()
  }
}

function save(next: PendingDeletes): void {
  localStorage.setItem(DELETES_KEY, JSON.stringify(next))
}

export function queueDeleted(kind: keyof PendingDeletes, id: string): void {
  const current = load()
  if (current[kind].includes(id)) return
  save({ ...current, [kind]: [...current[kind], id] })
}

export function peekDeletes(): PendingDeletes {
  return load()
}

export function deletedItemIds(pending: PendingDeletes): string[] {
  return [...new Set([...pending.items, ...pending.clearedItems])]
}

export function takeDeletes(): PendingDeletes {
  const current = load()
  save(empty())
  return current
}

export function restoreDeletes(pending: PendingDeletes): void {
  const current = load()
  save({
    items: [...new Set([...pending.items, ...current.items])],
    clearedItems: [...new Set([...pending.clearedItems, ...current.clearedItems])],
    stores: [...new Set([...pending.stores, ...current.stores])],
    groups: [...new Set([...pending.groups, ...current.groups])],
    categories: [...new Set([...pending.categories, ...current.categories])],
    catalog: [...new Set([...pending.catalog, ...current.catalog])],
  })
}
