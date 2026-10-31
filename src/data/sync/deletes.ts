const DELETES_KEY = 'pokupki-sync-deletes'

export type PendingDeletes = {
  items: string[]
  clearedItems: string[]
  stores: string[]
  groups: string[]
  categories: string[]
  /** Снятые из списка общие категории: `${storeId}\t${categoryId}` */
  storeCategories: string[]
  catalog: string[]
  templateFolders: string[]
  /** Удалённые шаблоны (список / группа / «Мои шаблоны») — id шаблона */
  templates: string[]
}

function empty(): PendingDeletes {
  return {
    items: [],
    clearedItems: [],
    stores: [],
    groups: [],
    categories: [],
    storeCategories: [],
    catalog: [],
    templateFolders: [],
    templates: [],
  }
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
      storeCategories: value.storeCategories ?? [],
      catalog: value.catalog ?? [],
      templateFolders: value.templateFolders ?? [],
      templates: value.templates ?? [],
    }
  } catch {
    return empty()
  }
}

export function storeCategoryKey(storeId: string, categoryId: string): string {
  return `${storeId}\t${categoryId}`
}

function save(next: PendingDeletes): void {
  localStorage.setItem(DELETES_KEY, JSON.stringify(next))
}

const RECENT_KEY = 'pokupki-sync-recent-deletes'
/** Пока облако не подтвердило удаление, запись не должна возвращаться при pull. */
const RECENT_MS = 10 * 60 * 1000

function loadRecent(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const value = raw ? (JSON.parse(raw) as unknown) : null
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const now = Date.now()
    const next: Record<string, number> = {}
    for (const [key, at] of Object.entries(value as Record<string, unknown>)) {
      if (typeof at === 'number' && now - at < RECENT_MS) next[key] = at
    }
    return next
  } catch {
    return {}
  }
}

function rememberRecent(kind: keyof PendingDeletes, id: string): void {
  try {
    const next = loadRecent()
    next[`${kind}\t${id}`] = Date.now()
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // приватный режим
  }
}

export function recentlyDeletedIds(kind: keyof PendingDeletes): string[] {
  const prefix = `${kind}\t`
  return Object.keys(loadRecent())
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

export function queueDeleted(kind: keyof PendingDeletes, id: string): void {
  rememberRecent(kind, id)
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
    storeCategories: [
      ...new Set([...(pending.storeCategories ?? []), ...(current.storeCategories ?? [])]),
    ],
    catalog: [...new Set([...pending.catalog, ...current.catalog])],
    templateFolders: [...new Set([...(pending.templateFolders ?? []), ...(current.templateFolders ?? [])])],
    templates: [...new Set([...(pending.templates ?? []), ...(current.templates ?? [])])],
  })
}

export function clearStoreCategoryDisable(storeId: string, categoryId: string): void {
  const key = storeCategoryKey(storeId, categoryId)
  const current = load()
  if (!current.storeCategories.includes(key)) return
  save({
    ...current,
    storeCategories: current.storeCategories.filter((item) => item !== key),
  })
}
