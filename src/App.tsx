import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AccessScreen } from './components/AccessScreen'
import { MergeDialog } from './components/MergeDialog'
import { UpdateBanner } from './components/UpdateBanner'
import { categoriesForStore, CONTOUR_OFFER_KEY, hasContourReplacements, knownCategoriesForStore, sortCategories, unusedGlobalCategories } from './data/categories'
import { publishIconStyle } from './data/iconStyle'
import { ContourIconsDialog } from './components/ContourIconsDialog'
import { clearStoredEnterCode, consumeEnterCode, isLocalHost, mustUseHomeScreenShortcut } from './data/sync/codes'
import { isStoreInBadge } from './data/appBadge'
import { useAppBadge } from './hooks/useAppBadge'
import { useAppState } from './hooks/useAppState'
import { useAppUpdate } from './hooks/useAppUpdate'
import { useSync } from './hooks/useSync'
import { loadSession } from './data/sync/session'
import { HomeScreen } from './screens/HomeScreen'
import { NewStoreScreen } from './screens/NewStoreScreen'
import { StoreScreen } from './screens/StoreScreen'
import { AddItemScreen } from './screens/AddItemScreen'
import { ListSettingsScreen } from './screens/ListSettingsScreen'
import { clearCrashSeen } from './components/ErrorBoundary'
import { captureSharedAppFromLocation } from './data/loyaltyApps'
import type { Screen } from './types'

const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
)

function App() {
  const {
    data,
    replaceData,
    mergeRemote,
    clearedStoreIds,
    addStore,
    renameStore,
    deleteStore,
    addItem,
    addGlobalCategory,
    renameGlobalCategory,
    setCategoryStyle,
    applyContourIcons,
    deleteGlobalCategory,
    saveCatalogEntry,
    deleteCatalogEntry,
    importCatalogRows,
    addCategory,
    enableCategoriesInStore,
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
    createStoreFromItems,
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
  } = useAppState()
  const sync = useSync(data, replaceData, mergeRemote)
  const appUpdate = useAppUpdate()
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [contourDone, setContourDone] = useState(() => {
    try {
      return localStorage.getItem(CONTOUR_OFFER_KEY) === '1'
    } catch {
      return true
    }
  })
  function finishContourOffer(apply: boolean) {
    try {
      localStorage.setItem(CONTOUR_OFFER_KEY, '1')
    } catch {
      /* ignore */
    }
    setContourDone(true)
    if (apply) applyContourIcons()
  }
  const [enterCode, setEnterCode] = useState<string | null>(null)
  const hadSession = useRef(Boolean(loadSession()))

  useEffect(() => {
    captureSharedAppFromLocation()
    clearCrashSeen()
  }, [])

  useEffect(() => {
    publishIconStyle(data.settings.iconStyle)
  }, [data.settings.iconStyle])

  useEffect(() => {
    if (mustUseHomeScreenShortcut()) return
    const code = consumeEnterCode()
    if (!code) return
    setEnterCode(code)
    if (hadSession.current) setScreen({ name: 'settings' })
  }, [])

  const allNames = useMemo(() => {
    const names = new Set<string>()
    for (const item of data.items) names.add(item.name)
    for (const entry of data.catalog ?? []) names.add(entry.name)
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [data.catalog, data.items])

  const syncEnabled = Boolean(sync.configured && sync.session && !sync.session.frozen)
  const needsAccess =
    sync.configured &&
    !sync.session &&
    typeof window !== 'undefined' &&
    !isLocalHost(window.location.hostname)
  const badge = useAppBadge(data.items, data.stores, data.settings, !needsAccess)
  const homeProps = {
    stores: data.stores,
    groups: data.groups ?? [],
    categories: data.categories,
    items: data.items,
    syncEnabled,
    syncConfigured: sync.configured,
    frozen: Boolean(sync.session?.frozen),
    localCopyHint:
      !sync.session &&
      typeof window !== 'undefined' &&
      isLocalHost(window.location.hostname),
    displayName: sync.session?.displayName,
    syncError: sync.error,
    syncBusy: sync.busy,
    familyConnected: sync.members.length > 1,
    updatedStoreIds: sync.updatedStoreIds,
    onDismissStoreUpdate: sync.dismissStoreUpdate,
    onRetrySync: () => {
      sync.clearError()
      void sync.retry()
    },
    badgePrompt: badge.prompt,
    onAllowBadge: () => void badge.allow(),
    onSkipBadge: badge.skip,
    settings: data.settings,
    onOpenSettings: () => setScreen({ name: 'settings' as const }),
    people: sync.people,
    onForwardList: (storeId: string, code: string) => sync.forwardStore(storeId, code),
    onOpenStore: (storeId: string) => setScreen({ name: 'store' as const, storeId }),
    onStartAddStore: () => setScreen({ name: 'newStore' as const }),
    onAddGroup: (name, visibility) => addGroup(name, visibility),
    onRenameStore: renameStore,
    onRenameGroup: renameGroup,
    onSetGroupIcon: setGroupIcon,
    onSetStoreIcon: setStoreIcon,
    onSetGroupLoyalty: setGroupLoyalty,
    onSetStoreLoyalty: setStoreLoyalty,
    onDeleteGroup: deleteGroup,
    onSetStoreGroup: setStoreGroup,
    onSetGroupVisibility: setGroupVisibility,
    onSetStoreVisibility: setStoreVisibility,
    onOpenListTemplates: (storeId: string) =>
      setScreen({ name: 'storeSettings', storeId, section: 'templates' }),
    onOpenListCategories: (storeId: string) =>
      setScreen({ name: 'storeSettings', storeId, section: 'categories' }),
    onSetStoreInBadge: setStoreInBadge,
    onSaveGroupTemplate: saveGroupTemplate,
    onSaveStoreTemplate: saveStoreTemplate,
    onDeleteGroupTemplate: (_groupId, templateId) => deleteTemplate(templateId),
    myId: sync.session?.userId,
    onReorderStores: reorderStores,
    onReorderHome: reorderHome,
  }

  const overlay = (
    <>
      {sync.mergePending ? (
        <MergeDialog busy={sync.busy} onChoose={(mode) => void sync.resolveMerge(mode)} />
      ) : null}
      {!needsAccess &&
      !contourDone &&
      hasContourReplacements({
        categories: data.categories,
        stores: data.stores,
        groups: data.groups,
      }) ? (
        <ContourIconsDialog
          onKeep={() => finishContourOffer(false)}
          onUpdate={() => finishContourOffer(true)}
        />
      ) : null}
      {appUpdate.remote ? (
        <UpdateBanner
          remote={appUpdate.remote}
          stuck={appUpdate.stuck}
          alreadyCurrent={appUpdate.alreadyCurrent}
          standalone={appUpdate.standalone}
          onReload={appUpdate.reload}
          onDismiss={appUpdate.dismiss}
        />
      ) : null}
    </>
  )

  if (needsAccess) {
    return (
      <>
        <AccessScreen
          busy={sync.busy}
          error={sync.error}
          initialCode={enterCode}
          onConnect={(code, name) => sync.connectWithCode(code, name)}
          onClearError={sync.clearError}
        />
        {overlay}
      </>
    )
  }

  if (screen.name === 'settings') {
    return (
      <>
        <Suspense
          fallback={
            <div className="screen">
              <p className="hint">Открываю настройки…</p>
            </div>
          }
        >
        <SettingsScreen
          settings={data.settings}
          categories={data.categories}
          stores={data.stores}
          groups={data.groups ?? []}
          catalog={data.catalog ?? []}
          templateFolders={data.templateFolders ?? []}
          myId={sync.session?.userId}
          onAddTemplateFolder={addTemplateFolder}
          onRenameTemplateFolder={renameTemplateFolder}
          onDeleteTemplateFolder={deleteTemplateFolder}
          onSaveFolderTemplate={saveFolderTemplate}
          onDeleteFolderTemplate={deleteFolderTemplate}
          onBack={() => {
            clearStoredEnterCode()
            setEnterCode(null)
            setScreen({ name: 'home' })
          }}
          onTheme={setTheme}
          onFontSize={setFontSize}
          onIconStyle={setIconStyle}
          onStoreInBadge={setStoreInBadge}
          onBadgeIncludeNew={setBadgeIncludeNew}
          onAllowBadge={() => badge.allow()}
          onAddCategory={addGlobalCategory}
          onRenameCategory={renameGlobalCategory}
          onStyleCategory={setCategoryStyle}
          onDeleteCategory={deleteGlobalCategory}
          onSaveCatalog={saveCatalogEntry}
          onDeleteCatalog={deleteCatalogEntry}
          onImportCatalog={importCatalogRows}
          sync={{
            configured: sync.configured,
            session: sync.session,
            members: sync.members,
            inviteCode: sync.inviteCode,
            pairingCode: sync.pairingCode,
            accessInfo: sync.accessInfo,
            busy: sync.busy,
            error: sync.error,
            initialCode: enterCode,
            onConnect: (code, name) => sync.connectWithCode(code, name),
            onCreateInvite: () => void sync.createInvite(),
            onCreateAccess: () => sync.createAccess(),
            onCreatePairing: () => void sync.createPairing(),
            onExclude: (userId) => void sync.exclude(userId),
            onReclaim: () => void sync.reclaim(),
            onLeave: () => void sync.leave(),
            onTakeOver: () => void sync.takeOver(),
            onRetry: () => void sync.retry(),
            onClearCode: () => {
              clearStoredEnterCode()
              setEnterCode(null)
            },
            onClearError: sync.clearError,
            onDeleteAccount: () => void sync.deleteAccount(),
          }}
          people={{
            configured: sync.configured,
            signedIn: Boolean(sync.session && !sync.session.frozen),
            myCode: sync.myContactCode,
            people: sync.people,
            busy: sync.busy,
            error: sync.forwardError,
            onAdd: (code) => sync.addPerson(code),
            onRemove: (userId) => sync.removePerson(userId),
            onRefresh: () => sync.refreshPeople(),
            onClearError: sync.clearForwardError,
          }}
        />
        </Suspense>
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
            syncEnabled={syncEnabled}
            onVisibility={(visibility) => setStoreVisibility(store.id, visibility)}
            inBadge={isStoreInBadge(store.id, data.settings)}
            onBadge={(included) => setStoreInBadge(store.id, included)}
            onBack={() => setScreen({ name: 'store', storeId: store.id })}
            initialSection={screen.section}
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
            onEnableCategory={(categoryIds) => enableCategoriesInStore(store.id, categoryIds)}
            onRemoveCategory={(categoryId) => removeCategoryFromStore(store.id, categoryId)}
            onSaveTemplate={(name, visibility, target) =>
              saveTemplate(store.id, name, undefined, visibility, target)
            }
            onUpdatePlaceTemplate={(draft, groupId) =>
              groupId ? saveGroupTemplate(groupId, draft) : saveStoreTemplate(store.id, draft)
            }
            onDeleteListTemplate={(templateId) => deleteTemplate(templateId)}
            myId={sync.session?.userId}
            groups={data.groups ?? []}
            templateFolders={data.templateFolders ?? []}
            onSetLoyalty={(card) => setStoreLoyalty(store.id, card)}
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
            knownCategories={knownCategoriesForStore(data.categories, store.id)}
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
          knownCategories={knownCategoriesForStore(data.categories, store.id)}
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
          onSaveTemplate={(name, snapshot, visibility, target) =>
            saveTemplate(store.id, name, snapshot, visibility, target)
          }
          syncEnabled={syncEnabled}
          otherStores={data.stores.filter((item) => item.id !== store.id)}
          groups={data.groups ?? []}
          templateFolders={data.templateFolders ?? []}
          onApplyTemplate={(templateId, mode) => applyTemplate(store.id, templateId, mode)}
          onTransferToStore={(storeId, mode, onlyItemIds) =>
            transferItems(store.id, storeId, mode, onlyItemIds)
          }
          onCreateStoreFromItems={(name, items, removeFromSource) => {
            createStoreFromItems(name, items, removeFromSource)
          }}
        />
        {overlay}
      </>
    )
  }

  if (screen.name === 'newStore') {
    return (
      <>
        <NewStoreScreen
          categories={data.categories}
          includeInBadgeDefault={data.settings.badgeIncludeNew !== false}
          onBack={() => setScreen({ name: 'home' })}
          onAdd={(name, categoryIds, countInBadge) => {
            const id = addStore(name, categoryIds, countInBadge)
            if (id) setScreen({ name: 'store', storeId: id })
            else setScreen({ name: 'home' })
          }}
          onAddCategory={(name, color, icon) => addGlobalCategory(name, color, icon)}
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
