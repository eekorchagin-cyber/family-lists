import { useCallback, useEffect, useState } from 'react'
import {
  appendCategoryToStores,
  categoriesForStore,
  ensureCategoryOrder,
  iconIdFromName,
  withCategoriesEnabled,
  withCategoryEnabled,
} from '../data/categories'
import { applyCatalogImport, mergeCatalogFromItems, upsertCatalog } from '../data/catalog'
import { emptyStoreFields } from '../data/defaults'
import { applyAppearance, loadClearedStoreIds, loadData, loadStoreOrder, saveClearedStoreIds, saveData, saveStoreOrder } from '../data/storage'
import {
  ensureHomeOrder,
  groupHomeKey,
  loadHomeOrder,
  saveHomeOrder,
} from '../data/homeLayout'
import { queueDeleted } from '../data/sync/deletes'
import { markDirty } from '../data/sync/dirty'
import { applyStoreOrder, nowIso, withUpdatedAt } from '../data/sync/merge'
import { loadSession } from '../data/sync/session'
import type {
  AppData,
  CatalogEntry,
  CategorySort,
  FontSize,
  Item,
  Settings,
  Store,
  StoreGroup,
  StoreVisibility,
  Theme,
} from '../types'

function newId(): string {
  return crypto.randomUUID()
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

function patchStore(current: AppData, storeId: string, patch: Partial<Store>): AppData {
  return {
    ...current,
    stores: current.stores.map((store) =>
      store.id === storeId ? withUpdatedAt({ ...store, ...patch }) : store,
    ),
  }
}

export function useAppState() {
  const [data, setData] = useState<AppData>(() => {
    const loaded = loadData()
    const order = loadStoreOrder()
    const base = { ...loaded, groups: loaded.groups ?? [] }
    const next =
      order.length > 0 ? { ...base, stores: applyStoreOrder(base.stores, order) } : base
    saveHomeOrder(ensureHomeOrder(next.stores, next.groups))
    applyAppearance(next.settings)
    return next
  })

  const [clearedStoreIds, setClearedStoreIds] = useState<string[]>(() => loadClearedStoreIds())

  const rememberCleared = useCallback((storeId: string) => {
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

  const addStore = useCallback((name: string, categoryIds?: string[]) => {
    const trimmed = name.trim()
    if (!trimmed) return undefined
    const id = newId()
    setData((current) => {
      const known = new Set(
        current.categories.filter((category) => !category.storeId).map((category) => category.id),
      )
      const categoryOrder =
        categoryIds !== undefined
          ? categoryIds.filter((categoryId) => known.has(categoryId))
          : undefined
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
            updatedAt: nowIso(),
          },
        ],
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
      return persist(patchStore(current, storeId, { name: trimmed }))
    })
  }, [])

  const deleteStore = useCallback((storeId: string) => {
    setData((current) => {
      if (!current.stores.some((store) => store.id === storeId)) return current
      queueDeleted('stores', storeId)
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
            item.name.toLowerCase() === trimmedName.toLowerCase(),
        )

        const catalog = rememberCatalog(
          current.catalog ?? [],
          trimmedName,
          categoryId,
        )
        const stores = current.stores.map((store) =>
          store.id === storeId
            ? withCategoryEnabled(store, categoryId, current.categories)
            : store,
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
    (itemId: string, patch: Partial<Pick<Item, 'qty' | 'unit' | 'categoryId'>>) => {
      setData((current) => {
        const prev = current.items.find((item) => item.id === itemId)
        if (!prev) return current
        const items = current.items.map((item) =>
          item.id === itemId ? withUpdatedAt({ ...item, ...patch }) : item,
        )
        const categoryId = patch.categoryId
        const catalog =
          categoryId && current.categories.some((category) => category.id === categoryId)
            ? rememberCatalog(current.catalog ?? [], prev.name, categoryId)
            : current.catalog
        const stores = categoryId
          ? current.stores.map((store) =>
              store.id === prev.storeId
                ? withCategoryEnabled(store, categoryId, current.categories)
                : store,
            )
          : current.stores
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
    setData((current) => {
      const removing = current.items.filter(
        (item) => item.storeId === storeId && item.bought,
      )
      for (const item of removing) queueDeleted('clearedItems', item.id)
      rememberCleared(storeId)
      return persist({
        ...current,
        items: current.items.filter(
          (item) => !(item.storeId === storeId && item.bought),
        ),
      })
    })
  }, [rememberCleared])

  const saveTemplate = useCallback((storeId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const items = current.items
        .filter((item) => item.storeId === storeId)
        .map((item) => ({
          name: item.name,
          categoryId: item.categoryId,
          qty: item.qty,
          unit: item.unit,
        }))
      return persist(
        patchStore(current, storeId, {
          templates: [
            ...(store.templates ?? []),
            { id: newId(), name: trimmed, items },
          ],
        }),
      )
    })
  }, [])

  const applyTemplate = useCallback((storeId: string, templateId: string) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      const template = store?.templates?.find((item) => item.id === templateId)
      if (!template) return current
      forgetCleared(storeId)

      let items = [...current.items]
      for (const entry of template.items) {
        const existing = items.find(
          (item) =>
            item.storeId === storeId &&
            !item.bought &&
            item.categoryId === entry.categoryId &&
            item.name.toLowerCase() === entry.name.toLowerCase(),
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
      return persist({
        ...current,
        items,
        catalog: mergeCatalogFromItems(current.catalog ?? [], items),
        stores: current.stores.map((item) =>
          item.id === storeId
            ? withCategoriesEnabled(
                item,
                template.items.map((entry) => entry.categoryId),
                current.categories,
              )
            : item,
        ),
      })
    })
  }, [forgetCleared])

  const renameTemplate = useCallback((storeId: string, templateId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      return persist(
        patchStore(current, storeId, {
          templates: (store.templates ?? []).map((item) =>
            item.id === templateId ? { ...item, name: trimmed } : item,
          ),
        }),
      )
    })
  }, [])

  const deleteTemplate = useCallback((storeId: string, templateId: string) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      return persist(
        patchStore(current, storeId, {
          templates: (store.templates ?? []).filter((item) => item.id !== templateId),
        }),
      )
    })
  }, [])

  const saveCatalogEntry = useCallback((name: string, categoryId: string, entryId?: string) => {
    const trimmed = name.trim()
    if (!trimmed || !categoryId) return false
    let saved = false
    setData((current) => {
      const catalog = current.catalog ?? []
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category) return current
      const duplicate = catalog.find(
        (entry) =>
          entry.name.toLowerCase() === trimmed.toLowerCase() &&
          entry.id !== entryId,
      )
      if (duplicate) return current
      if (entryId) {
        const exists = catalog.some((entry) => entry.id === entryId)
        if (!exists) return current
        saved = true
        return persist({
          ...current,
          catalog: catalog.map((entry) =>
            entry.id === entryId
              ? withUpdatedAt({ ...entry, name: trimmed, categoryId })
              : entry,
          ),
        })
      }
      saved = true
      return persist({
        ...current,
        catalog: [...catalog, { id: newId(), name: trimmed, categoryId, updatedAt: nowIso() }],
      })
    })
    return saved
  }, [])

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
              item.name.toLowerCase() === entry.name.toLowerCase(),
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

        return persist({
          ...current,
          items,
          catalog: mergeCatalogFromItems(current.catalog ?? [], items),
          stores: current.stores.map((store) =>
            store.id === toStoreId
              ? withCategoriesEnabled(
                  store,
                  sourceActive.map((entry) => entry.categoryId),
                  current.categories,
                )
              : store,
          ),
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

  const addGroup = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return undefined
    const id = newId()
    setData((current) => {
      const group: StoreGroup = { id, name: trimmed, updatedAt: nowIso() }
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
      const groups = (current.groups ?? []).map((group) =>
        group.id === groupId ? withUpdatedAt({ ...group, name: trimmed }) : group,
      )
      if (groups.every((group, index) => group === (current.groups ?? [])[index])) return current
      return persist({ ...current, groups })
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
      if (!store) return current
      const nextGroupId = groupId && (current.groups ?? []).some((group) => group.id === groupId) ? groupId : undefined
      if ((store.groupId ?? undefined) === nextGroupId) return current
      const stores = current.stores.map((item) =>
        item.id === storeId
          ? withUpdatedAt(
              nextGroupId ? { ...item, groupId: nextGroupId } : { ...item, groupId: undefined },
            )
          : item,
      )
      const next = persist({ ...current, stores })
      const order = loadHomeOrder().filter((key) => key !== storeId)
      if (!nextGroupId) order.push(storeId)
      saveHomeOrder(ensureHomeOrder(next.stores, next.groups ?? [], order))
      return next
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

  const setStoreVisibility = useCallback((storeId: string, visibility: StoreVisibility) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store || store.visibility === visibility) return current
      return persist(patchStore(current, storeId, { visibility }))
    })
  }, [])

  const replaceData = useCallback((next: AppData, opts?: { takeCloudOrder?: boolean }) => {
    setData((current) => {
      if (opts?.takeCloudOrder) {
        saveStoreOrder(next.stores.map((store) => store.id))
        return persist({ ...next, settings: current.settings }, 'sync')
      }
      const saved = loadStoreOrder()
      const orderedIds = saved.length > 0 ? saved : current.stores.map((store) => store.id)
      const stores = applyStoreOrder(next.stores, orderedIds)
      return persist({ ...next, settings: current.settings, stores }, 'sync')
    })
  }, [])

  return {
    data,
    replaceData,
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
    applyTemplate,
    renameTemplate,
    deleteTemplate,
    transferItems,
    reorderStores,
    reorderHome,
    addGroup,
    renameGroup,
    deleteGroup,
    setStoreGroup,
    setTheme,
    setFontSize,
    setStoreVisibility,
  }
}
