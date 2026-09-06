import { useEffect, useMemo, useState } from 'react'
import { MergeDialog } from './components/MergeDialog'
import { categoriesForStore, sortCategories, unusedGlobalCategories } from './data/categories'
import { clearStoredEnterCode, consumeEnterCode } from './data/sync/codes'
import { useAppState } from './hooks/useAppState'
import { useSync } from './hooks/useSync'
import { HomeScreen } from './screens/HomeScreen'
import { NewStoreScreen } from './screens/NewStoreScreen'
import { StoreScreen } from './screens/StoreScreen'
import { AddItemScreen } from './screens/AddItemScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ListSettingsScreen } from './screens/ListSettingsScreen'
import type { Screen } from './types'

function App() {
  const {
    data,
    replaceData,
    clearedStoreIds,
    addStore,
    renameStore,
    deleteStore,
    addItem,
    addGlobalCategory,
    renameGlobalCategory,
    setCategoryStyle,
    deleteGlobalCategory,
    saveCatalogEntry,
    deleteCatalogEntry,
    addCategory,
    enableCategoryInStore,
    removeCategoryFromStore,
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
    setTheme,
    setFontSize,
    setStoreVisibility,
  } = useAppState()
  const sync = useSync(data, replaceData)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [enterCode, setEnterCode] = useState<string | null>(null)

  useEffect(() => {
    const code = consumeEnterCode()
    if (code) {
      setEnterCode(code)
      setScreen({ name: 'settings' })
    }
  }, [])

  const allNames = useMemo(() => {
    const names = new Set<string>()
    for (const item of data.items) names.add(item.name)
    for (const entry of data.catalog ?? []) names.add(entry.name)
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [data.catalog, data.items])

  const syncEnabled = Boolean(sync.session && !sync.session.frozen)
  const homeProps = {
    stores: data.stores,
    categories: data.categories,
    syncEnabled,
    frozen: Boolean(sync.session?.frozen),
    displayName: sync.session?.displayName,
    updatedStoreIds: sync.updatedStoreIds,
    onDismissStoreUpdate: sync.dismissStoreUpdate,
    onOpenSettings: () => setScreen({ name: 'settings' as const }),
    onOpenStore: (storeId: string) => setScreen({ name: 'store' as const, storeId }),
    onStartAddStore: () => setScreen({ name: 'newStore' as const }),
    onRenameStore: renameStore,
    onReorderStores: reorderStores,
  }

  const overlay = (
    <>
      {sync.mergePending ? (
        <MergeDialog busy={sync.busy} onChoose={(mode) => void sync.resolveMerge(mode)} />
      ) : null}
    </>
  )

  if (screen.name === 'settings') {
    return (
      <>
        <SettingsScreen
          settings={data.settings}
          categories={data.categories}
          stores={data.stores}
          catalog={data.catalog ?? []}
          onBack={() => {
            clearStoredEnterCode()
            setEnterCode(null)
            setScreen({ name: 'home' })
          }}
          onTheme={setTheme}
          onFontSize={setFontSize}
          onAddCategory={addGlobalCategory}
          onRenameCategory={renameGlobalCategory}
          onStyleCategory={setCategoryStyle}
          onDeleteCategory={deleteGlobalCategory}
          onSaveCatalog={saveCatalogEntry}
          onDeleteCatalog={deleteCatalogEntry}
          sync={{
            configured: sync.configured,
            session: sync.session,
            members: sync.members,
            inviteCode: sync.inviteCode,
            pairingCode: sync.pairingCode,
            busy: sync.busy,
            error: sync.error,
            initialCode: enterCode,
            onEnable: (name) => void sync.enableHome(name),
            onConnect: (code, name) => sync.connectWithCode(code, name),
            onCreateInvite: () => void sync.createInvite(),
            onCreatePairing: () => void sync.createPairing(),
            onExclude: (userId) => void sync.exclude(userId),
            onReclaim: () => void sync.reclaim(),
            onRetry: () => void sync.retry(),
            onClearCode: () => {
              clearStoredEnterCode()
              setEnterCode(null)
            },
            onClearError: sync.clearError,
          }}
        />
        {overlay}
      </>
    )
  }

  if (
    screen.name === 'store' ||
    screen.name === 'add' ||
    screen.name === 'storeSettings'
  ) {
    const store = data.stores.find((item) => item.id === screen.storeId)
    if (!store) {
      return (
        <>
          <HomeScreen
            {...homeProps}
            onDeleteStore={(storeId) => {
              deleteStore(storeId)
              setScreen({ name: 'home' })
            }}
          />
          {overlay}
        </>
      )
    }

    const storeCategories = sortCategories(
      categoriesForStore(data.categories, store),
      store,
    )
    const storeItems = data.items.filter((item) => item.storeId === store.id)

    if (screen.name === 'storeSettings') {
      return (
        <>
          <ListSettingsScreen
            store={store}
            categories={storeCategories}
            unusedCategories={unusedGlobalCategories(data.categories, store)}
            items={storeItems}
            otherStores={data.stores.filter((item) => item.id !== store.id)}
            activeCount={storeItems.filter((item) => !item.bought).length}
            syncEnabled={syncEnabled}
            onVisibility={(visibility) => setStoreVisibility(store.id, visibility)}
            onBack={() => setScreen({ name: 'store', storeId: store.id })}
            onRenameStore={(name) => renameStore(store.id, name)}
            onDeleteStore={() => {
              deleteStore(store.id)
              setScreen({ name: 'home' })
            }}
            onSort={(sort) => setCategorySort(store.id, sort)}
            onSetScope={(categoryId, name, global) =>
              setCategoryScope(store.id, categoryId, name, global)
            }
            onMove={(categoryId, direction) => moveCategory(store.id, categoryId, direction)}
            onAddCategory={(name, color, icon, global) =>
              global
                ? addGlobalCategory(name, color, icon, store.id)
                : addCategory(store.id, name, color, icon)
            }
            onEnableCategory={(categoryId) => enableCategoryInStore(store.id, categoryId)}
            onRemoveCategory={(categoryId) => removeCategoryFromStore(store.id, categoryId)}
            onApplyTemplate={(templateId) => {
              applyTemplate(store.id, templateId)
              setScreen({ name: 'store', storeId: store.id })
            }}
            onRenameTemplate={(templateId, name) => renameTemplate(store.id, templateId, name)}
            onDeleteTemplate={(templateId) => deleteTemplate(store.id, templateId)}
            onSaveTemplate={(name) => saveTemplate(store.id, name)}
            onCopyToStore={(storeId) => transferItems(store.id, storeId, 'copy')}
            onMoveToStore={(storeId) => transferItems(store.id, storeId, 'move')}
          />
          {overlay}
        </>
      )
    }

    if (screen.name === 'add') {
      return (
        <>
          <AddItemScreen
            store={store}
            draft={screen.draft}
            categories={storeCategories}
            catalog={data.catalog ?? []}
            items={storeItems}
            onBack={() => setScreen({ name: 'store', storeId: store.id })}
            onAdd={(name, categoryId, qty, unit) => {
              addItem(store.id, name, categoryId, qty, unit)
              setScreen({ name: 'store', storeId: store.id })
            }}
            onAddCategory={(name, color, icon) => addCategory(store.id, name, color, icon)}
          />
          {overlay}
        </>
      )
    }

    return (
      <>
        <StoreScreen
          store={store}
          items={storeItems}
          categories={storeCategories}
          allNames={allNames}
          members={sync.members}
          myId={sync.session?.userId}
          thisListUpdated={sync.updatedStoreIds.includes(store.id)}
          onDismissStoreUpdate={() => sync.dismissStoreUpdate(store.id)}
          onBack={() => setScreen({ name: 'home' })}
          onOpenSettings={() => setScreen({ name: 'storeSettings', storeId: store.id })}
          onRenameStore={(name) => renameStore(store.id, name)}
          onMarkBought={markBought}
          onUnmarkBought={unmarkBought}
          onChangeCategory={(itemId, categoryId) => updateItem(itemId, { categoryId })}
          onAddCategory={(name, color, icon) => addCategory(store.id, name, color, icon)}
          onStartAdd={(draft) =>
            setScreen({ name: 'add', storeId: store.id, draft })
          }
          onUpdateItem={updateItem}
          onClearBought={() => clearBought(store.id)}
          completedEmpty={clearedStoreIds.includes(store.id)}
          onSaveTemplate={(name) => saveTemplate(store.id, name)}
        />
        {overlay}
      </>
    )
  }

  if (screen.name === 'newStore') {
    return (
      <>
        <NewStoreScreen
          onBack={() => setScreen({ name: 'home' })}
          onAdd={(name) => {
            addStore(name)
            setScreen({ name: 'home' })
          }}
        />
        {overlay}
      </>
    )
  }

  return (
    <>
      <HomeScreen {...homeProps} onDeleteStore={deleteStore} />
      {overlay}
    </>
  )
}

export default App
