import { useCallback, useEffect, useState } from 'react'
import {
  appendCategoryToStores,
  categoriesForStore,
  ensureCategoryOrder,
  iconIdFromName,
} from '../data/categories'
import { mergeCatalogFromItems, upsertCatalog } from '../data/catalog'
import { emptyStoreFields } from '../data/defaults'
import { applyAppearance, loadData, saveData } from '../data/storage'
import type {
  AppData,
  CatalogEntry,
  CategorySort,
  FontSize,
  Item,
  Settings,
  Store,
  Theme,
} from '../types'

function newId(): string {
  return crypto.randomUUID()
}

function persist(next: AppData): AppData {
  saveData(next)
  applyAppearance(next.settings)
  return next
}

function rememberCatalog(
  catalog: CatalogEntry[],
  name: string,
  categoryId: string,
): CatalogEntry[] {
  return upsertCatalog(catalog, name, categoryId)
}

function patchStore(current: AppData, storeId: string, patch: Partial<Store>): AppData {
  return {
    ...current,
    stores: current.stores.map((store) =>
      store.id === storeId ? { ...store, ...patch } : store,
    ),
  }
}

export function useAppState() {
  const [data, setData] = useState<AppData>(() => {
    const loaded = loadData()
    applyAppearance(loaded.settings)
    return loaded
  })

  useEffect(() => {
    applyAppearance(data.settings)
  }, [data.settings])

  const addStore = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((current) =>
      persist({
        ...current,
        stores: [
          ...current.stores,
          { id: newId(), name: trimmed, ...emptyStoreFields() },
        ],
      }),
    )
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
      return persist({
        ...current,
        stores: current.stores.filter((store) => store.id !== storeId),
        items: current.items.filter((item) => item.storeId !== storeId),
        categories: current.categories.filter((category) => category.storeId !== storeId),
      })
    })
  }, [])

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
        const cats = categoriesForStore(current.categories, storeId)
        const order = ensureCategoryOrder(store, cats)
        if (order.includes(existing.id)) return current
        return persist(
          patchStore(current, storeId, { categoryOrder: [...order, existing.id] }),
        )
      }
      id = newId()
      const categories = [
        ...current.categories,
        { id, name: trimmed, color, icon: icon || iconIdFromName(trimmed), storeId },
      ]
      return persist({
        ...current,
        categories,
        stores: appendCategoryToStores(current.stores, categories),
      })
    })
    return id
  }, [])

  const addGlobalCategory = useCallback((name: string, color: string, icon?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return ''
    const id = newId()
    setData((current) => {
      const categories = [
        ...current.categories,
        { id, name: trimmed, color, icon: icon || iconIdFromName(trimmed) },
      ]
      return persist({
        ...current,
        categories,
        stores: appendCategoryToStores(current.stores, categories),
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
          item.id === categoryId ? { ...item, color, icon } : item,
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
          item.id === categoryId ? { ...item, name: trimmed } : item,
        ),
      })
    })
  }, [])

  const deleteGlobalCategory = useCallback((categoryId: string) => {
    setData((current) => {
      const category = current.categories.find((item) => item.id === categoryId)
      if (!category || category.storeId) return current
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
            item.id === categoryId ? { ...item, name: trimmed } : item,
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

  const setCategorySort = useCallback((storeId: string, categorySort: CategorySort) => {
    setData((current) => {
      const store = current.stores.find((item) => item.id === storeId)
      if (!store) return current
      const cats = categoriesForStore(current.categories, storeId)
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
      const cats = categoriesForStore(current.categories, storeId)
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

  const unmarkBought = useCallback((itemId: string) => {
    setData((current) =>
      persist({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, bought: false } : item,
        ),
      }),
    )
  }, [])

  const addItem = useCallback(
    (storeId: string, name: string, categoryId: string, qty: number, unit: string) => {
      const trimmedName = name.trim()
      if (!trimmedName) return

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

        if (existing) {
          return persist({
            ...current,
            items: current.items.map((item) =>
              item.id === existing.id
                ? { ...item, qty: item.qty + qty, unit: unit.trim() || item.unit }
                : item,
            ),
            catalog,
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
        }

        return persist({
          ...current,
          items: [...current.items, item],
          catalog,
        })
      })
    },
    [],
  )

  const updateItem = useCallback(
    (itemId: string, patch: Partial<Pick<Item, 'qty' | 'unit' | 'categoryId'>>) => {
      setData((current) => {
        const prev = current.items.find((item) => item.id === itemId)
        if (!prev) return current
        const items = current.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        )
        const categoryId = patch.categoryId
        const catalog =
          categoryId && current.categories.some((category) => category.id === categoryId)
            ? rememberCatalog(current.catalog ?? [], prev.name, categoryId)
            : current.catalog
        return persist({ ...current, items, catalog })
      })
    },
    [],
  )

  const markBought = useCallback((itemId: string) => {
    setData((current) =>
      persist({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, bought: true } : item,
        ),
      }),
    )
  }, [])

  const clearBought = useCallback((storeId: string) => {
    setData((current) =>
      persist({
        ...current,
        items: current.items.filter(
          (item) => !(item.storeId === storeId && item.bought),
        ),
      }),
    )
  }, [])

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
          },
        ]
      }
      return persist({
        ...current,
        items,
        catalog: mergeCatalogFromItems(current.catalog ?? [], items),
      })
    })
  }, [])

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
              ? { ...entry, name: trimmed, categoryId }
              : entry,
          ),
        })
      }
      saved = true
      return persist({
        ...current,
        catalog: [...catalog, { id: newId(), name: trimmed, categoryId }],
      })
    })
    return saved
  }, [])

  const deleteCatalogEntry = useCallback((entryId: string) => {
    setData((current) =>
      persist({
        ...current,
        catalog: (current.catalog ?? []).filter((entry) => entry.id !== entryId),
      }),
    )
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
            },
          ]
        }

        if (mode === 'move') {
          const sourceIds = new Set(sourceActive.map((item) => item.id))
          items = items.filter((item) => !sourceIds.has(item.id))
        }

        return persist({
          ...current,
          items,
          catalog: mergeCatalogFromItems(current.catalog ?? [], items),
        })
      })
    },
    [],
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
      return persist({ ...current, stores })
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((current) =>
      persist({
        ...current,
        settings: { ...current.settings, ...patch },
      }),
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

  return {
    data,
    addStore,
    renameStore,
    deleteStore,
    addItem,
    addCategory,
    addGlobalCategory,
    renameGlobalCategory,
    setCategoryStyle,
    deleteGlobalCategory,
    saveCatalogEntry,
    deleteCatalogEntry,
    renameCategory,
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
    setTheme,
    setFontSize,
  }
}
