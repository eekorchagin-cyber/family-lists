import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  appendCategoryToStores,
  categoriesForStore,
  ensureCategoryOrder,
  ensureFileCategories,
  contourReplacement,
  iconIdFromName,
  withCategoriesEnabled,
  withCategoryEnabled,
} from '../data/categories'
import {
  applyCatalogImport,
  mergeCatalogFromItems,
  rememberStoreCategory,
  upsertCatalog,
} from '../data/catalog'
import { sameRuText } from '../data/text'
import { emptyStoreFields } from '../data/defaults'
import { applyAppearance, loadClearedStoreIds, loadData, loadStoreOrder, saveClearedAt, saveClearedStoreIds, saveData, saveStoreOrder } from '../data/storage'
import {
  badgeIncludeNewStores,
  withBadgeStore,
} from '../data/appBadge'
import {
  ensureHomeOrder,
  groupHomeKey,
  loadHomeOrder,
  saveHomeOrder,
} from '../data/homeLayout'
import { withLoyaltyMarker } from '../data/loyalty'
import { rememberIncomingDismissed } from '../data/forward'
import { clearStoreCategoryDisable, queueDeleted, storeCategoryKey } from '../data/sync/deletes'
import { queueInboxDismiss } from '../data/sync/forwardApi'
import { markDirty } from '../data/sync/dirty'
import { applyStoreOrder, mergePulledData, nowIso, visibleStoreUpdates, withUpdatedAt } from '../data/sync/merge'
import { loadSession } from '../data/sync/session'
import {
  classifyTemplateItems,
  findSharedTemplate,
  type SharedTemplate,
  type TemplateSaveTarget,
} from '../data/templates'
import type {
  AppData,
  CatalogEntry,
  CategorySort,
  FontSize,
  IconStyle,
  Item,
  NamedTemplate,
  Settings,
  Store,
  StoreGroup,
  StoreVisibility,
  TemplateItem,
  Theme,
} from '../types'

function newId(): string {
  return crypto.randomUUID()
}

function mergeBadgeExclusions(current: AppData['settings'], incoming: AppData['settings']): AppData['settings'] {
  const extra = incoming.badgeExcludedStoreIds ?? []
  if (extra.length === 0) return current
  return extra.reduce((settings, storeId) => withBadgeStore(settings, storeId, false), current)
}

function actorId(): string | undefined {
  const session = loadSession()
  if (!session || session.frozen) return undefined
  return session.userId
}

function persist(next: AppData, mode: 'user' | 'sync' | 'local' = 'user'): AppData {
  const withGroups = { ...next, groups: next.groups ?? [] }
  saveData(withGroups)
  applyAppearance(withGroups.settings)
  if (mode !== 'sync') {
    saveStoreOrder(withGroups.stores.map((store) => store.id))
    saveHomeOrder(ensureHomeOrder(withGroups.stores, withGroups.groups, loadHomeOrder()))
  } else {
    saveHomeOrder(ensureHomeOrder(withGroups.stores, withGroups.groups, loadHomeOrder()))
  }
  if (mode === 'user') markDirty()
  return withGroups
}

function rememberCatalog(
  catalog: CatalogEntry[],
  name: string,
  categoryId: string,
): CatalogEntry[] {
  const next = upsertCatalog(catalog, name, categoryId)
  if (next === catalog) return catalog
  const needle = name.trim().toLowerCase()
  return next.map((entry) =>
    entry.name.toLowerCase() === needle ? withUpdatedAt(entry) : entry,
  )
}

function rememberCategoryInStore(
  stores: Store[],
  storeId: string,
  name: string,
  categoryId: string,
): Store[] {
  return stores.map((store) => {
    if (store.id !== storeId) return store
    const next = rememberStoreCategory(store, name, categoryId)
    return next === store ? store : withUpdatedAt(next)
  })
}

function patchStore(current: AppData, storeId: string, patch: Partial<Store>): AppData {
  return {
    ...current,
    stores: current.stores.map((store) =>
      store.id === storeId ? withUpdatedAt({ ...store, ...patch }) : store,
    ),
  }
}

function writeTemplates(current: AppData, found: SharedTemplate, templates: NamedTemplate[]): AppData {
  if (found.groupId) {
    return {
      ...current,
      groups: (current.groups ?? []).map((group) =>
        group.id === found.groupId ? withUpdatedAt({ ...group, templates }) : group,
      ),
    }
  }
  return patchStore(current, found.storeId, { templates })
}

export function useAppState() {
  const [data, setData] = useState<AppData>(() => {
    try {
      const loaded = loadData()
      const order = loadStoreOrder()
      const base = { ...loaded, groups: loaded.groups ?? [] }
      const next =
        order.length > 0 ? { ...base, stores: applyStoreOrder(base.stores, order) } : base
      try {
        saveHomeOrder(ensureHomeOrder(next.stores, next.groups))
      } catch {
        /* private mode / quota */
      }
      applyAppearance(next.settings)
      return next
    } catch (error) {
      console.error('boot state failed', error)
      const fallback = { ...loadData(), groups: [] as AppData['groups'] }
      applyAppearance(fallback.settings)
      return fallback
    }
  })

  const [clearedStoreIds, setClearedStoreIds] = useState<string[]>(() => loadClearedStoreIds())

  const rememberCleared = useCallback((storeId: string) => {
    saveClearedAt(storeId, nowIso())
    setClearedStoreIds((current) => {
      if (current.includes(storeId)) return current
      const next = [...current, storeId]
      saveClearedStoreIds(next)
      return next
    })
  }, [])

  const forgetCleared = useCallback((storeId: string) => {
    setClearedStoreIds((current) => {
      if (!current.includes(storeId)) return current
      const next = current.filter((id) => id !== storeId)
      saveClearedStoreIds(next)
      return next
    })
  }, [])

  useEffect(() => {
    applyAppearance(data.settings)
  }, [data.settings])

  const addStore = useCallback((name: string, categoryIds?: string[], countInBadge?: boolean) => {
    const trimmed = name.trim()
    if (!trimmed) return undefined
    const id = newId()
    const updatedAt = nowIso()
    flushSync(() => {
      setData((current) => {
        const known = new Set(
          current.categories.filter((category) => !category.storeId).map((category) => category.id),
        )
        const categoryOrder =
          categoryIds !== undefined
            ? categoryIds.filter((categoryId) => known.has(categoryId))
            : undefined
        const included = countInBadge ?? badgeIncludeNewStores(current.settings)
        return persist({
          ...current,
          stores: [
            ...current.stores,
            {
              id,
              name: trimmed,
              ...emptyStoreFields(categoryOrder),
              ownerId: actorId(),
              visibility: actorId() ? 'home' : 'private',
              updatedAt,
              ...(iconIdFromName(trimmed) !== 'other' ? { icon: iconIdFromName(trimmed) } : {}),
            },
          ],
          settings: included ? current.settings : withBadgeStore(current.settings, id, false),
        })
      })
    })
    return id
  }, [])

  const renameStore = useCallback((storeId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store || store.name === trimmed) return current
      const oldInferred = iconIdFromName(store.name)
      const nextInferred = iconIdFromName(trimmed)
      const keepCustom = store.icon && store.icon !== oldInferred
      const icon = keepCustom ? store.icon : nextInferred === 'other' ? undefined : nextInferred
      return persist(patchStore(current, storeId, { name: trimmed, icon }))
    })
  }, [])

  const deleteStore = useCallback((storeId: string) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      queueDeleted('stores', storeId)
      if (store.incomingFrom) {
        const deliveryId = store.incomingId || store.id
        rememberIncomingDismissed(deliveryId)
        queueInboxDismiss(deliveryId)
      }
      for (const item of current.items) {
        if (item.storeId === storeId) queueDeleted('items', item.id)
      }
      for (const category of current.categories) {
        if (category.storeId === storeId) queueDeleted('categories', category.id)
      }
      forgetCleared(storeId)
      return persist({
        ...current,
        stores: current.stores.filter((store) => store.id !== storeId),
        items: current.items.filter((item) => item.storeId !== storeId),
        categories: current.categories.filter((category) => category.storeId !== storeId),
        settings: withBadgeStore(current.settings, storeId, true),
      })
    })
  }, [forgetCleared])

  const addCategory = useCallback((
    storeId: string,
    name: string,
    color: string,
    icon?: string,
  ) => {
    const trimmed = name.trim()
    if (!trimmed) return ''
    let id = ''
    setData((current) => {
      const existing = current.categories.find(
        (category) =>
          !category.storeId &&
          category.name.trim().toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) {
        id = existing.id
        const store = current.stores.find((item) => item.id === storeId)
        if (!store) return current
        const next = withCategoryEnabled(store, existing.id, current.categories)
        if (next === store) return current
        return persist(patchStore(current, storeId, { categoryOrder: next.categoryOrder }))
      }
      id = newId()
      const categories = [
        ...current.categories,
        { id, name: trimmed, color, icon: icon || iconIdFromName(trimmed), storeId, updatedAt: nowIso() },
      ]
      return persist({
        ...current,
        categories,
        stores: appendCategoryToStores(current.stores, categories),
      })
    })
    return id
  }, [])

  const addGlobalCategory = useCallback((
    name: string,
    color: string,
    icon?: string,
    storeId?: string,
  ) => {
    const trimmed = name.trim()
    if (!trimmed) return ''
    const id = newId()
    setData((current) => {
      const categories = [
        ...current.categories,
        { id, name: trimmed, color, icon: icon || iconIdFromName(trimmed), updatedAt: nowIso() },
      ]
      const stores = storeId
        ? current.stores.map((store) =>
            store.id === storeId
              ? withCategoryEnabled(store, id, categories)
              : store,
          )
        : appendCategoryToStores(current.stores, categories)
      return persist({
        ...current,
        categories,
        stores,
      })
    })
    return id
  }, [])

  const applyContourIcons = useCallback(() => {
    setData((current) => {
      let changed = false
      const categories = current.categories.map((category) => {
        const icon = contourReplacement(category.name, category.icon)
        if (!icon) return category
        changed = true
        return withUpdatedAt({ ...category, icon })
      })
      const stores = current.stores.map((store) => {
        const icon = contourReplacement(store.name, store.icon)
        if (!icon) return store
        changed = true
        return withUpdatedAt({ ...store, icon })
      })
      const groups = (current.groups ?? []).map((group) => {
        const icon = contourReplacement(group.name, group.icon)
        if (!icon) return group
        changed = true
        return withUpdatedAt({ ...group, icon })
      })
      if (!changed) return current
      return persist({ ...current, categories, stores, groups })
    })
  }, [])

  const setCategoryStyle = useCallback((
    categoryId: string,
    color: string,
    icon: string,
  ) => {
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category) return current
      return persist({
        ...current,
        categories: current.categories.map((item) =>
          item.id === categoryId ? withUpdatedAt({ ...item, color, icon }) : item,
        ),
      })
    })
  }, [])

  const renameGlobalCategory = useCallback((categoryId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category || category.storeId) return current
      return persist({
        ...current,
        categories: current.categories.map((item) =>
          item.id === categoryId ? withUpdatedAt({ ...item, name: trimmed }) : item,
        ),
      })
    })
  }, [])

  const deleteGlobalCategory = useCallback((categoryId: string) => {
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category || category.storeId) return current
      queueDeleted('categories', categoryId)
      return persist({
        ...current,
        categories: current.categories.filter((item) => item.id !== categoryId),
        catalog: (current.catalog ?? []).filter((entry) => entry.categoryId !== categoryId),
        stores: current.stores.map((store) => ({
          ...store,
          categoryOrder: (store.categoryOrder ?? []).filter((id) => id !== categoryId),
        })),
      })
    })
  }, [])

  const renameCategory = useCallback((storeId: string, categoryId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category) return current
      if (category.storeId === storeId) {
        return persist({
          ...current,
          categories: current.categories.map((item) =>
            item.id === categoryId ? withUpdatedAt({ ...item, name: trimmed }) : item,
          ),
        })
      }
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      return persist(
        patchStore(current, storeId, {
          categoryNames: { ...store.categoryNames, [categoryId]: trimmed },
        }),
      )
    })
  }, [])

  const setCategoryScope = useCallback((
    storeId: string,
    categoryId: string,
    name: string,
    global: boolean,
  ) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category) return current
      if (!global && category.storeId && category.storeId !== storeId) return current

      const categories = current.categories.map((item) => {
        if (item.id !== categoryId) return item
        if (global) {
          return withUpdatedAt({
            id: item.id,
            name: trimmed,
            color: item.color,
            ...(item.icon ? { icon: item.icon } : {}),
          })
        }
        return withUpdatedAt({ ...item, name: trimmed, storeId })
      })

      const stores = current.stores.map((store) => {
        const categoryNames = { ...store.categoryNames }
        delete categoryNames[categoryId]
        if (global) {
          const next = {
            ...store,
            categoryNames,
            categoryOrder:
              store.id === storeId && !(store.categoryOrder ?? []).includes(categoryId)
                ? [...(store.categoryOrder ?? []), categoryId]
                : store.categoryOrder,
          }
          return {
            ...next,
            categoryOrder: ensureCategoryOrder(
              next,
              categoriesForStore(categories, next),
            ),
          }
        }
        return {
          ...store,
          categoryNames,
          categoryOrder:
            store.id === storeId
              ? ensureCategoryOrder(store, categoriesForStore(categories, store))
              : (store.categoryOrder ?? []).filter((id) => id !== categoryId),
        }
      })

      return persist({
        ...current,
        categories,
        stores,
      })
    })
  }, [])

  const setCategorySort = useCallback((storeId: string, categorySort: CategorySort) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const cats = categoriesForStore(current.categories, store)
      return persist(
        patchStore(current, storeId, {
          categorySort,
          categoryOrder: ensureCategoryOrder(store, cats),
        }),
      )
    })
  }, [])

  const moveCategory = useCallback((storeId: string, categoryId: string, direction: -1 | 1) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const cats = categoriesForStore(current.categories, store)
      const order = ensureCategoryOrder(store, cats)
      const index = order.indexOf(categoryId)
      const next = index + direction
      if (index < 0 || next < 0 || next >= order.length) return current
      const swapped = [...order]
      const currentId = swapped[index]
      const swapId = swapped[next]
      if (!currentId || !swapId) return current
      swapped[index] = swapId
      swapped[next] = currentId
      return persist(
        patchStore(current, storeId, { categorySort: 'custom', categoryOrder: swapped }),
      )
    })
  }, [])

  const enableCategoriesInStore = useCallback((storeId: string, categoryIds: string[]) => {
    if (categoryIds.length === 0) return
    for (const categoryId of categoryIds) clearStoreCategoryDisable(storeId, categoryId)
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const next = withCategoriesEnabled(store, categoryIds, current.categories)
      if (next === store) return current
      return persist(patchStore(current, storeId, { categoryOrder: next.categoryOrder }))
    })
  }, [])

  const enableCategoryInStore = useCallback((storeId: string, categoryId: string) => {
    enableCategoriesInStore(storeId, [categoryId])
  }, [enableCategoriesInStore])

  const removeCategoryFromStore = useCallback((storeId: string, categoryId: string) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      const category = current.categories.find((item) => item.id === categoryId)
      if (!store || !category) return current
      if (category.storeId && category.storeId !== storeId) return current

      if (category.storeId === storeId) {
        queueDeleted('categories', categoryId)
        return persist({
          ...current,
          categories: current.categories.filter((item) => item.id !== categoryId),
          catalog: (current.catalog ?? []).filter((entry) => entry.categoryId !== categoryId),
          stores: current.stores.map((item) => {
            const categoryNames = { ...item.categoryNames }
            delete categoryNames[categoryId]
            return {
              ...item,
              categoryNames,
              categoryOrder: (item.categoryOrder ?? []).filter((id) => id !== categoryId),
            }
          }),
        })
      }

      const categoryNames = { ...store.categoryNames }
      delete categoryNames[categoryId]
      queueDeleted('storeCategories', storeCategoryKey(storeId, categoryId))
      return persist(
        patchStore(current, storeId, {
          categoryNames,
          categoryOrder: (store.categoryOrder ?? []).filter((id) => id !== categoryId),
        }),
      )
    })
  }, [])

  const unmarkBought = useCallback((itemId: string) => {
    setData((current) =>
      persist({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId
            ? withUpdatedAt({ ...item, bought: false, boughtBy: undefined })
            : item,
        ),
      }),
    )
  }, [])

  const addItem = useCallback(
    (storeId: string, name: string, categoryId: string, qty: number, unit: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) return
      forgetCleared(storeId)

      setData((current) => {
        const existing = current.items.find(
          (item) =>
            item.storeId === storeId &&
            !item.bought &&
            item.categoryId === categoryId &&
            sameRuText(item.name, trimmedName),
        )

        const catalog = rememberCatalog(
          current.catalog ?? [],
          trimmedName,
          categoryId,
        )
        const stores = rememberCategoryInStore(
          current.stores.map((store) => {
            if (store.id !== storeId) return store
            const next = withCategoryEnabled(store, categoryId, current.categories)
            return next === store ? store : withUpdatedAt(next)
          }),
          storeId,
          trimmedName,
          categoryId,
        )

        if (existing) {
          return persist({
            ...current,
            items: current.items.map((item) =>
              item.id === existing.id
                ? withUpdatedAt({
                    ...item,
                    qty: item.qty + qty,
                    unit: unit.trim() || item.unit,
                  })
                : item,
            ),
            catalog,
            stores,
          })
        }

        const item: Item = {
          id: newId(),
          storeId,
          name: trimmedName,
          categoryId,
          qty,
          unit: unit.trim() || 'шт',
          bought: false,
          addedBy: actorId(),
          updatedAt: nowIso(),
        }

        return persist({
          ...current,
          items: [...current.items, item],
          catalog,
          stores,
        })
      })
    },
    [forgetCleared],
  )

  const updateItem = useCallback(
    (itemId: string, patch: Partial<Pick<Item, 'name' | 'qty' | 'unit' | 'categoryId'>>) => {
      setData((current) => {
        const prev = current.items.find((item) => item.id === itemId)
        if (!prev) return current
        const nextName = patch.name !== undefined ? patch.name.trim() : prev.name
        if (patch.name !== undefined && !nextName) return current
        const items = current.items.map((item) =>
          item.id === itemId
            ? withUpdatedAt({
                ...item,
                ...patch,
                ...(patch.name !== undefined ? { name: nextName } : {}),
              })
            : item,
        )
        const categoryId = patch.categoryId ?? prev.categoryId
        const catalogName = nextName || prev.name
        const catalog =
          categoryId && current.categories.some((category) => category.id === categoryId)
            ? rememberCatalog(current.catalog ?? [], catalogName, categoryId)
            : current.catalog
        let stores = patch.categoryId
          ? current.stores.map((store) =>
              store.id === prev.storeId
                ? withCategoryEnabled(store, patch.categoryId!, current.categories)
                : store,
            )
          : current.stores
        if (categoryId && current.categories.some((category) => category.id === categoryId)) {
          stores = rememberCategoryInStore(stores, prev.storeId, catalogName, categoryId)
        }
        return persist({ ...current, items, catalog, stores })
      })
    },
    [],
  )

  const markBought = useCallback((itemId: string) => {
    setData((current) =>
      persist({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId
            ? withUpdatedAt({ ...item, bought: true, boughtBy: actorId() })
            : item,
        ),
      }),
    )
  }, [])

  const clearBought = useCallback((storeId: string) => {
    // Сразу в localStorage, до React: иначе параллельный pull может вернуть купленное.
    saveClearedAt(storeId, nowIso())
    setClearedStoreIds((current) => {
      if (current.includes(storeId)) return current
      const next = [...current, storeId]
      saveClearedStoreIds(next)
      return next
    })
    flushSync(() => {
      setData((current) => {
        const removing = current.items.filter(
          (item) => item.storeId === storeId && item.bought,
        )
        for (const item of removing) queueDeleted('clearedItems', item.id)
        return persist({
          ...current,
          items: current.items.filter(
            (item) => !(item.storeId === storeId && item.bought),
          ),
        })
      })
    })
  }, [])

  const saveTemplate = useCallback(
    (
      storeId: string,
      name: string,
      snapshot?: Item[],
      visibility: StoreVisibility = 'home',
      target: TemplateSaveTarget = { kind: 'store' },
    ) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const source =
        snapshot ?? current.items.filter((item) => item.storeId === storeId)
      const items = source.map((item) => ({
        name: item.name,
        categoryId: item.categoryId,
        qty: item.qty,
        unit: item.unit,
      }))
      if (items.length === 0) return current
      const owner = actorId()
      const personal = target.kind === 'folder' || visibility === 'private'
      const template: NamedTemplate = {
        id: newId(),
        name: trimmed,
        items,
        ...(personal
          ? { visibility: 'private' as const, ...(owner ? { ownerId: owner } : {}) }
          : {}),
      }
      if (target.kind === 'folder') {
        const folders = current.templateFolders ?? []
        if (folders.some((folder) => folder.id === target.folderId)) {
          return persist({
            ...current,
            templateFolders: folders.map((folder) =>
              folder.id === target.folderId
                ? { ...folder, updatedAt: nowIso(), templates: [...folder.templates, template] }
                : folder,
            ),
          })
        }
      }
      if (target.kind === 'group') {
        const groups = current.groups ?? []
        if (groups.some((group) => group.id === target.groupId)) {
          return persist({
            ...current,
            groups: groups.map((group) =>
              group.id === target.groupId
                ? withUpdatedAt({ ...group, templates: [...(group.templates ?? []), template] })
                : group,
            ),
          })
        }
      }
      return persist(
        patchStore(current, storeId, {
          templates: [...(store.templates ?? []), template],
        }),
      )
    })
  }, [])

  const applyTemplate = useCallback((
    storeId: string,
    templateId: string,
    mode: 'all' | 'matching' = 'all',
  ) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      const found = findSharedTemplate(current.stores, templateId, current.groups ?? [])
      const folderTemplate = (current.templateFolders ?? [])
        .flatMap((folder) => folder.templates)
        .find((template) => template.id === templateId)
      const source = found?.template ?? folderTemplate
      if (!store || !source) return current
      const fit = classifyTemplateItems(store, current.categories, source.items)
      const templateItems = mode === 'matching' ? fit.ready : [...fit.ready, ...fit.missing]
      if (templateItems.length === 0) return current
      forgetCleared(storeId)

      let items = [...current.items]
      for (const entry of templateItems) {
        const existing = items.find(
          (item) =>
            item.storeId === storeId &&
            !item.bought &&
            item.categoryId === entry.categoryId &&
            sameRuText(item.name, entry.name),
        )
        if (existing) continue
        items = [
          ...items,
          {
            id: newId(),
            storeId,
            name: entry.name,
            categoryId: entry.categoryId,
            qty: entry.qty,
            unit: entry.unit,
            bought: false,
            addedBy: actorId(),
            updatedAt: nowIso(),
          },
        ]
      }
      let stores =
        mode === 'matching'
          ? current.stores
          : current.stores.map((item) => {
              if (item.id !== storeId) return item
              const enabled = withCategoriesEnabled(
                item,
                templateItems.map((entry) => entry.categoryId),
                current.categories,
              )
              return enabled === item ? item : withUpdatedAt(enabled)
            })
      for (const entry of templateItems) {
        stores = rememberCategoryInStore(stores, storeId, entry.name, entry.categoryId)
      }
      return persist({
        ...current,
        items,
        catalog: mergeCatalogFromItems(current.catalog ?? [], items),
        stores,
      })
    })
  }, [forgetCleared])

  const renameTemplate = useCallback((templateId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const found = findSharedTemplate(current.stores, templateId, current.groups ?? [])
      if (!found) return current
      const source = found.groupId
        ? (current.groups ?? []).find((group) => group.id === found.groupId)?.templates
        : current.stores.find((item) => item.id === found.storeId)?.templates
      if (!source) return current
      return persist(
        writeTemplates(
          current,
          found,
          source.map((item) => (item.id === templateId ? { ...item, name: trimmed } : item)),
        ),
      )
    })
  }, [])

  const setTemplateVisibility = useCallback((templateId: string, visibility: StoreVisibility) => {
    setData((current) => {
      const found = findSharedTemplate(current.stores, templateId, current.groups ?? [])
      if (!found) return current
      const source = found.groupId
        ? (current.groups ?? []).find((group) => group.id === found.groupId)?.templates
        : current.stores.find((item) => item.id === found.storeId)?.templates
      if (!source) return current
      const owner = actorId()
      return persist(
        writeTemplates(
          current,
          found,
          source.map((item) => {
            if (item.id !== templateId) return item
            if (visibility === 'private') {
              return { ...item, visibility: 'private' as const, ...(owner ? { ownerId: owner } : {}) }
            }
            const next = { ...item, visibility: 'home' as const }
            delete next.ownerId
            return next
          }),
        ),
      )
    })
  }, [])

  const addTemplateFolder = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const owner = actorId()
    setData((current) =>
      persist({
        ...current,
        templateFolders: [
          ...(current.templateFolders ?? []),
          {
            id: newId(),
            name: trimmed,
            templates: [],
            ...(owner ? { ownerId: owner } : {}),
            updatedAt: nowIso(),
          },
        ],
      }),
    )
  }, [])

  const renameTemplateFolder = useCallback((folderId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) =>
      persist({
        ...current,
        templateFolders: (current.templateFolders ?? []).map((folder) =>
          folder.id === folderId ? { ...folder, name: trimmed, updatedAt: nowIso() } : folder,
        ),
      }),
    )
  }, [])

  const deleteTemplateFolder = useCallback((folderId: string) => {
    queueDeleted('templateFolders', folderId)
    setData((current) =>
      persist({
        ...current,
        templateFolders: (current.templateFolders ?? []).filter((folder) => folder.id !== folderId),
      }),
    )
  }, [])

  const saveFolderTemplate = useCallback(
    (folderId: string, draft: { id?: string; name: string; items: TemplateItem[] }) => {
      const trimmed = draft.name.trim()
      const items = draft.items
        .map((item) => ({
          name: item.name.trim(),
          categoryId: item.categoryId,
          qty: item.qty,
          unit: item.unit.trim() || 'шт',
        }))
        .filter((item) => item.name && item.qty > 0)
      if (!trimmed || (items.length === 0 && !draft.id)) return
      const owner = actorId()
      const template: NamedTemplate = {
        id: draft.id || newId(),
        name: trimmed,
        items,
        visibility: 'private',
        ...(owner ? { ownerId: owner } : {}),
      }
      setData((current) =>
        persist({
          ...current,
          templateFolders: (current.templateFolders ?? []).map((folder) => {
            if (folder.id !== folderId) return folder
            const templates = folder.templates ?? []
            const exists = templates.some((item) => item.id === template.id)
            return {
              ...folder,
              updatedAt: nowIso(),
              templates: exists
                ? templates.map((item) => (item.id === template.id ? template : item))
                : [...templates, template],
            }
          }),
        }),
      )
    },
    [],
  )

  const deleteFolderTemplate = useCallback((folderId: string, templateId: string) => {
    setData((current) =>
      persist({
        ...current,
        templateFolders: (current.templateFolders ?? []).map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                updatedAt: nowIso(),
                templates: folder.templates.filter((item) => item.id !== templateId),
              }
            : folder,
        ),
      }),
    )
  }, [])

  const deleteTemplate = useCallback((templateId: string) => {
    setData((current) => {
      const found = findSharedTemplate(current.stores, templateId, current.groups ?? [])
      if (!found) return current
      const source = found.groupId
        ? (current.groups ?? []).find((group) => group.id === found.groupId)?.templates
        : current.stores.find((item) => item.id === found.storeId)?.templates
      if (!source) return current
      return persist(
        writeTemplates(
          current,
          found,
          source.filter((item) => item.id !== templateId),
        ),
      )
    })
  }, [])

  const saveGroupTemplate = useCallback(
    (
      groupId: string,
      draft: { id?: string; name: string; items: TemplateItem[]; visibility: StoreVisibility },
    ) => {
      const trimmed = draft.name.trim()
      const items = draft.items
        .map((item) => ({
          name: item.name.trim(),
          categoryId: item.categoryId,
          qty: item.qty,
          unit: item.unit.trim() || 'шт',
        }))
        .filter((item) => item.name && item.qty > 0)
      if (!trimmed || items.length === 0) return
      const owner = actorId()
      const template: NamedTemplate = {
        id: draft.id || newId(),
        name: trimmed,
        items,
        ...(draft.visibility === 'private'
          ? { visibility: 'private' as const, ...(owner ? { ownerId: owner } : {}) }
          : {}),
      }
      setData((current) => {
        const groups = (current.groups ?? []).map((group) => {
          if (group.id !== groupId) return group
          const templates = group.templates ?? []
          const exists = templates.some((item) => item.id === template.id)
          return withUpdatedAt({
            ...group,
            templates: exists
              ? templates.map((item) => (item.id === template.id ? template : item))
              : [...templates, template],
          })
        })
        return persist({ ...current, groups })
      })
    },
    [],
  )

  const saveStoreTemplate = useCallback(
    (
      storeId: string,
      draft: { id?: string; name: string; items: TemplateItem[]; visibility: StoreVisibility },
    ) => {
      const trimmed = draft.name.trim()
      const items = draft.items
        .map((item) => ({
          name: item.name.trim(),
          categoryId: item.categoryId,
          qty: item.qty,
          unit: item.unit.trim() || 'шт',
        }))
        .filter((item) => item.name && item.qty > 0)
      if (!trimmed || items.length === 0) return
      const owner = actorId()
      const template: NamedTemplate = {
        id: draft.id || newId(),
        name: trimmed,
        items,
        ...(draft.visibility === 'private'
          ? { visibility: 'private' as const, ...(owner ? { ownerId: owner } : {}) }
          : {}),
      }
      setData((current) => {
        const store = current.stores.find((item) => item.id === storeId)
        if (!store) return current
        const templates = store.templates ?? []
        const exists = templates.some((item) => item.id === template.id)
        return persist(
          patchStore(current, storeId, {
            templates: exists
              ? templates.map((item) => (item.id === template.id ? template : item))
              : [...templates, template],
          }),
        )
      })
    },
    [],
  )

  const deleteGroupTemplate = useCallback((groupId: string, templateId: string) => {
    setData((current) => {
      const groups = (current.groups ?? []).map((group) => {
        if (group.id !== groupId) return group
        return withUpdatedAt({
          ...group,
          templates: (group.templates ?? []).filter((item) => item.id !== templateId),
        })
      })
      return persist({ ...current, groups })
    })
  }, [])

  const saveCatalogEntry = useCallback((name: string, categoryId: string, entryId?: string) => {
    const trimmed = name.trim()
    if (!trimmed || !categoryId) return false
    const catalog = data.catalog ?? []
    const category = data.categories.find((item) => item.id === categoryId)
    if (!category) return false
    const duplicate = catalog.find(
      (entry) =>
        entry.name.toLowerCase() === trimmed.toLowerCase() &&
        entry.id !== entryId,
    )
    if (duplicate) return false
    if (entryId && !catalog.some((entry) => entry.id === entryId)) return false
    setData((current) => {
      const live = current.catalog ?? []
      const liveCategory = current.categories.find((item) => item.id === categoryId)
      if (!liveCategory) return current
      const liveDuplicate = live.find(
        (entry) =>
          entry.name.toLowerCase() === trimmed.toLowerCase() &&
          entry.id !== entryId,
      )
      if (liveDuplicate) return current
      if (entryId) {
        if (!live.some((entry) => entry.id === entryId)) return current
        return persist({
          ...current,
          catalog: live.map((entry) =>
            entry.id === entryId
              ? withUpdatedAt({ ...entry, name: trimmed, categoryId })
              : entry,
          ),
        })
      }
      return persist({
        ...current,
        catalog: [...live, { id: newId(), name: trimmed, categoryId, updatedAt: nowIso() }],
      })
    })
    return true
  }, [data])

  const deleteCatalogEntry = useCallback((entryId: string) => {
    setData((current) => {
      queueDeleted('catalog', entryId)
      return persist({
        ...current,
        catalog: (current.catalog ?? []).filter((entry) => entry.id !== entryId),
      })
    })
  }, [])

  const importCatalogRows = useCallback((
    rows: { name: string; category: string }[],
  ) => {
    let summary = { addedItems: 0, skippedItems: 0, addedCategories: 0 }
    setData((current) => {
      const imported = applyCatalogImport(
        current.catalog ?? [],
        current.categories,
        rows,
        nowIso(),
      )
      summary = {
        addedItems: imported.addedItems,
        skippedItems: imported.skippedItems,
        addedCategories: imported.addedCategories,
      }
      if (imported.addedItems === 0 && imported.addedCategories === 0) return current
      return persist({
        ...current,
        catalog: imported.catalog,
        categories: imported.categories,
      })
    })
    return summary
  }, [])

  const transferItems = useCallback(
    (fromStoreId: string, toStoreId: string, mode: 'copy' | 'move') => {
      if (fromStoreId === toStoreId) return
      setData((current) => {
        const fromStore = current.stores.find((store) => store.id === fromStoreId)
        const toStore = current.stores.find((store) => store.id === toStoreId)
        if (!fromStore || !toStore) return current

        const sourceActive = current.items.filter(
          (item) => item.storeId === fromStoreId && !item.bought,
        )
        if (sourceActive.length > 0) forgetCleared(toStoreId)
        let items = [...current.items]
        for (const entry of sourceActive) {
          const existing = items.find(
            (item) =>
              item.storeId === toStoreId &&
              !item.bought &&
              item.categoryId === entry.categoryId &&
              sameRuText(item.name, entry.name),
          )
          if (existing) continue
          items = [
            ...items,
            {
              id: newId(),
              storeId: toStoreId,
              name: entry.name,
              categoryId: entry.categoryId,
              qty: entry.qty,
              unit: entry.unit,
              bought: false,
              addedBy: actorId(),
              updatedAt: nowIso(),
            },
          ]
        }

        if (mode === 'move') {
          const sourceIds = new Set(sourceActive.map((item) => item.id))
          for (const id of sourceIds) queueDeleted('items', id)
          items = items.filter((item) => !sourceIds.has(item.id))
        }

        let stores = current.stores.map((store) =>
          store.id === toStoreId
            ? withCategoriesEnabled(
                store,
                sourceActive.map((entry) => entry.categoryId),
                current.categories,
              )
            : store,
        )
        for (const entry of sourceActive) {
          stores = rememberCategoryInStore(stores, toStoreId, entry.name, entry.categoryId)
        }
        return persist({
          ...current,
          items,
          catalog: mergeCatalogFromItems(current.catalog ?? [], items),
          stores,
        })
      })
    },
    [forgetCleared],
  )

  const reorderStores = useCallback((orderedIds: string[]) => {
    setData((current) => {
      if (orderedIds.length !== current.stores.length) return current
      const byId = new Map(current.stores.map((store) => [store.id, store]))
      const stores: Store[] = []
      for (const id of orderedIds) {
        const store = byId.get(id)
        if (!store) return current
        stores.push(store)
      }
      const unchanged = stores.every((store, index) => store.id === current.stores[index]?.id)
      if (unchanged) return current
      return persist({ ...current, stores }, 'local')
    })
  }, [])


  const reorderHome = useCallback((orderedKeys: string[]) => {
    setData((current) => {
      saveHomeOrder(ensureHomeOrder(current.stores, current.groups ?? [], orderedKeys))
      return persist(current, 'local')
    })
  }, [])

  const addGroup = useCallback((name: string, visibility: StoreVisibility = 'home') => {
    const trimmed = name.trim()
    if (!trimmed) return undefined
    const id = newId()
    setData((current) => {
      const inferred = iconIdFromName(trimmed)
      const owner = actorId()
      const group: StoreGroup = {
        id,
        name: trimmed,
        updatedAt: nowIso(),
        ...(inferred !== 'other' ? { icon: inferred } : {}),
        ...(visibility === 'private'
          ? { visibility: 'private' as const, ...(owner ? { ownerId: owner } : {}) }
          : {}),
      }
      const next = persist({ ...current, groups: [...(current.groups ?? []), group] })
      saveHomeOrder(ensureHomeOrder(next.stores, next.groups, [...loadHomeOrder(), groupHomeKey(id)]))
      return next
    })
    return id
  }, [])

  const renameGroup = useCallback((groupId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const groups = (current.groups ?? []).map((group) => {
        if (group.id !== groupId) return group
        const oldInferred = iconIdFromName(group.name)
        const nextInferred = iconIdFromName(trimmed)
        const keepCustom = group.icon && group.icon !== oldInferred
        const icon = keepCustom ? group.icon : nextInferred === 'other' ? undefined : nextInferred
        const next = withUpdatedAt({ ...group, name: trimmed, icon })
        if (!icon) delete next.icon
        return next
      })
      if (groups.every((group, index) => group === (current.groups ?? [])[index])) return current
      return persist({ ...current, groups })
    })
  }, [])

  const setGroupIcon = useCallback((groupId: string, icon: string | undefined) => {
    setData((current) => {
      const groups = (current.groups ?? []).map((group) => {
        if (group.id !== groupId) return group
        const next = withUpdatedAt({ ...group, icon })
        if (!icon) delete next.icon
        return next
      })
      if (groups.every((group, index) => group === (current.groups ?? [])[index])) return current
      return persist({ ...current, groups })
    })
  }, [])

  const setStoreIcon = useCallback((storeId: string, icon: string | undefined) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      if ((store.icon ?? '') === (icon ?? '')) return current
      return persist(patchStore(current, storeId, { icon }))
    })
  }, [])

  const setGroupLoyalty = useCallback((groupId: string, card: Store['loyaltyCard']) => {
    setData((current) => {
      const groups = (current.groups ?? []).map((group) => {
        if (group.id !== groupId) return group
        const next = withUpdatedAt({ ...group, loyaltyCard: card })
        if (!card) delete next.loyaltyCard
        return next
      })
      if (groups.every((group, index) => group === (current.groups ?? [])[index])) return current
      return persist({ ...current, groups })
    })
  }, [])

  const setStoreLoyalty = useCallback((storeId: string, card: Store['loyaltyCard']) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      if (!card && !store.loyaltyCard) return current
      const stores = current.stores.map((item) => {
        if (item.id !== storeId) return item
        const next = withUpdatedAt({
          ...item,
          loyaltyCard: card,
          categoryNames: withLoyaltyMarker(item.categoryNames, card),
        })
        if (!card) delete next.loyaltyCard
        return next
      })
      return persist({ ...current, stores })
    })
  }, [])

  const deleteGroup = useCallback((groupId: string) => {
    setData((current) => {
      if (!(current.groups ?? []).some((group) => group.id === groupId)) return current
      queueDeleted('groups', groupId)
      const stores = current.stores.map((store) =>
        store.groupId === groupId ? withUpdatedAt({ ...store, groupId: undefined }) : store,
      )
      const next = persist({
        ...current,
        groups: (current.groups ?? []).filter((group) => group.id !== groupId),
        stores,
      })
      saveHomeOrder(
        ensureHomeOrder(
          next.stores,
          next.groups,
          loadHomeOrder().filter((key) => key !== groupHomeKey(groupId)),
        ),
      )
      return next
    })
  }, [])

  const setStoreGroup = useCallback((storeId: string, groupId: string | null) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store || store.incomingFrom) return current
      const nextGroupId = groupId && (current.groups ?? []).some((group) => group.id === groupId) ? groupId : undefined
      if ((store.groupId ?? undefined) === nextGroupId) return current
      const stores = current.stores.map((item) =>
        item.id === storeId
          ? withUpdatedAt(
              nextGroupId ? { ...item, groupId: nextGroupId } : { ...item, groupId: undefined },
            )
          : item,
      )
      const groups = (current.groups ?? []).map((group) => {
        if (group.visibility !== 'private') return group
        const storeIds = stores.filter((item) => item.groupId === group.id).map((item) => item.id)
        if (JSON.stringify(storeIds) === JSON.stringify(group.storeIds ?? [])) return group
        return withUpdatedAt({ ...group, storeIds })
      })
      const next = persist({ ...current, stores, groups })
      const order = loadHomeOrder().filter((key) => key !== storeId)
      if (!nextGroupId) order.push(storeId)
      saveHomeOrder(ensureHomeOrder(next.stores, next.groups ?? [], order))
      return next
    })
  }, [])

  const setGroupVisibility = useCallback((groupId: string, visibility: StoreVisibility) => {
    setData((current) => {
      const group = (current.groups ?? []).find((item) => item.id === groupId)
      if (!group) return current
      const currentVisibility = group.visibility === 'private' ? 'private' : 'home'
      if (currentVisibility === visibility) return current
      const owner = actorId()
      const groups = (current.groups ?? []).map((item) => {
        if (item.id !== groupId) return item
        if (visibility === 'private') {
          const storeIds = current.stores.filter((store) => store.groupId === groupId).map((store) => store.id)
          return withUpdatedAt({
            ...item,
            visibility: 'private' as const,
            ...(owner ? { ownerId: owner } : {}),
            storeIds,
          })
        }
        const next = withUpdatedAt({ ...item, visibility: 'home' as const })
        delete next.ownerId
        delete next.storeIds
        return next
      })
      return persist({ ...current, groups })
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((current) =>
      persist(
        {
          ...current,
          settings: { ...current.settings, ...patch },
        },
        'local',
      ),
    )
  }, [])

  const setTheme = useCallback(
    (theme: Theme) => updateSettings({ theme }),
    [updateSettings],
  )

  const setFontSize = useCallback(
    (fontSize: FontSize) => updateSettings({ fontSize }),
    [updateSettings],
  )

  const setIconStyle = useCallback(
    (iconStyle: IconStyle) => updateSettings({ iconStyle }),
    [updateSettings],
  )

  const setStoreInBadge = useCallback((storeId: string, included: boolean) => {
    setData((current) => {
      const next = withBadgeStore(current.settings, storeId, included)
      if (next === current.settings) return current
      return persist({ ...current, settings: next }, 'local')
    })
  }, [])

  const setBadgeIncludeNew = useCallback(
    (include: boolean) => updateSettings({ badgeIncludeNew: include }),
    [updateSettings],
  )

  const setStoreVisibility = useCallback((storeId: string, visibility: StoreVisibility) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store || store.incomingFrom || store.visibility === visibility) return current
      return persist(patchStore(current, storeId, { visibility }))
    })
  }, [])

  const mergeRemote = useCallback((
    remote: AppData,
    options: {
      lastPulledAt: string | null
      userId: string
      deletedItemIds?: string[]
      deletedStoreIds?: string[]
      deletedGroupIds?: string[]
    },
  ) => {
    let changed = false
    let visible: string[] = []
    flushSync(() => {
      setData((current) => {
        const merged = mergePulledData(current, remote, options)
        changed = merged.changed
        if (!merged.changed) return current
        visible = visibleStoreUpdates(current, merged.next)
        const settings = mergeBadgeExclusions(current.settings, merged.next.settings)
        const saved = loadStoreOrder()
        const orderedIds = saved.length > 0 ? saved : current.stores.map((store) => store.id)
        const stores = applyStoreOrder(merged.next.stores, orderedIds)
        const base = { ...merged.next, settings, stores }
        const ensured = ensureFileCategories(base)
        if (ensured !== base) {
          changed = true
          return persist(ensured, 'user')
        }
        return persist(ensured, 'sync')
      })
    })
    return { changed, visible }
  }, [])

  const replaceData = useCallback((next: AppData, opts?: { takeCloudOrder?: boolean }) => {
    setData((current) => {
      const settings = mergeBadgeExclusions(current.settings, next.settings)
      if (opts?.takeCloudOrder) {
        saveStoreOrder(next.stores.map((store) => store.id))
        const base = { ...next, settings }
        const ensured = ensureFileCategories(base)
        return persist(ensured, ensured === base ? 'sync' : 'user')
      }
      const saved = loadStoreOrder()
      const orderedIds = saved.length > 0 ? saved : current.stores.map((store) => store.id)
      const stores = applyStoreOrder(next.stores, orderedIds)
      const base = { ...next, settings, stores }
      const ensured = ensureFileCategories(base)
      return persist(ensured, ensured === base ? 'sync' : 'user')
    })
  }, [])

  return {
    data,
    replaceData,
    mergeRemote,
    clearedStoreIds,
    addStore,
    renameStore,
    deleteStore,
    addItem,
    addCategory,
    addGlobalCategory,
    enableCategoryInStore,
    enableCategoriesInStore,
    removeCategoryFromStore,
    renameGlobalCategory,
    setCategoryStyle,
    applyContourIcons,
    deleteGlobalCategory,
    saveCatalogEntry,
    deleteCatalogEntry,
    importCatalogRows,
    renameCategory,
    setCategoryScope,
    setCategorySort,
    moveCategory,
    updateItem,
    markBought,
    unmarkBought,
    clearBought,
    saveTemplate,
    setTemplateVisibility,
    applyTemplate,
    renameTemplate,
    deleteTemplate,
    saveGroupTemplate,
    addTemplateFolder,
    renameTemplateFolder,
    deleteTemplateFolder,
    saveFolderTemplate,
    deleteFolderTemplate,
    saveStoreTemplate,
    deleteGroupTemplate,
    transferItems,
    reorderStores,
    reorderHome,
    addGroup,
    renameGroup,
    setGroupIcon,
    setStoreIcon,
    setGroupLoyalty,
    setStoreLoyalty,
    deleteGroup,
    setStoreGroup,
    setGroupVisibility,
    setTheme,
    setFontSize,
    setIconStyle,
    setStoreInBadge,
    setBadgeIncludeNew,
    setStoreVisibility,
  }
}
