import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { CategoryMark } from '../components/CategoryMark'
import { CommandButton } from '../components/CommandButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DialogHeading } from '../components/DialogHeading'
import { CategoryMarkPicker } from '../components/CategoryMarkPicker'
import { GroupTemplatesDialog } from '../components/GroupTemplatesDialog'
import { Header } from '../components/Header'
import { LoyaltyCardEditor } from '../components/LoyaltyCardEditor'
import { NameDialog } from '../components/NameDialog'
import { SettingsIcon } from '../components/SettingsIcon'
import { isGroupInBadge, isStoreInBadge } from '../data/appBadge'
import { resolvedGroupIcon, storeHasLocalCategories } from '../data/categories'
import {
  buildHomeRows,
  ensureHomeOrder,
  groupHomeKey,
  loadCollapsedGroups,
  loadHomeOrder,
  saveCollapsedGroups,
  saveHomeOrder,
  type HomeRow,
} from '../data/homeLayout'
import { resolveLoyaltyCard } from '../data/loyalty'
import { playConfirmSound } from '../data/sounds'
import { APP_VERSION } from '../data/version'
import type { Person } from '../data/sync/forwardApi'
import type { Category, Item, LoyaltyCard, Settings, Store, StoreGroup, StoreVisibility, TemplateItem } from '../types'

type HomeScreenProps = {
  stores: Store[]
  groups: StoreGroup[]
  categories: Category[]
  items: Item[]
  onOpenSettings: () => void
  onOpenStore: (storeId: string) => void
  onStartAddStore: () => void
  onAddGroup: (name: string, visibility?: StoreVisibility) => void
  onRenameStore: (storeId: string, name: string) => void
  onDeleteStore: (storeId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteGroup: (groupId: string) => void
  onSetGroupIcon: (groupId: string, icon: string | undefined) => void
  onSetStoreIcon: (storeId: string, icon: string | undefined) => void
  onSetGroupLoyalty: (groupId: string, card: LoyaltyCard | undefined) => void
  onSetStoreLoyalty: (storeId: string, card: LoyaltyCard | undefined) => void
  onSetStoreGroup: (storeId: string, groupId: string | null) => void
  onSetGroupVisibility: (groupId: string, visibility: StoreVisibility) => void
  onSetStoreVisibility: (storeId: string, visibility: StoreVisibility) => void
  onOpenListTemplates: (storeId: string) => void
  onSaveGroupTemplate: (
    groupId: string,
    draft: { id?: string; name: string; items: TemplateItem[]; visibility: StoreVisibility },
  ) => void
  onSaveStoreTemplate: (
    storeId: string,
    draft: { id?: string; name: string; items: TemplateItem[]; visibility: StoreVisibility },
  ) => void
  onDeleteGroupTemplate: (groupId: string, templateId: string) => void
  onReorderStores: (orderedIds: string[]) => void
  onReorderHome: (orderedKeys: string[]) => void
  syncEnabled?: boolean
  myId?: string
  syncConfigured?: boolean
  displayName?: string
  frozen?: boolean
  localCopyHint?: boolean
  syncError?: string | null
  syncBusy?: boolean
  familyConnected?: boolean
  updatedStoreIds?: string[]
  onDismissStoreUpdate?: (storeId: string) => void
  onRetrySync?: () => void
  badgePrompt?: boolean
  onAllowBadge?: () => void
  onSkipBadge?: () => void
  settings: Settings
  people?: Person[]
  onForwardList?: (storeId: string, code: string) => Promise<void>
}

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 12
const DRAG_THRESHOLD_PX = 10

type DragState = {
  key: string
  pointerId: number
  startX: number
  startY: number
  armed: boolean
  dragging: boolean
  scope: 'home' | 'group'
  groupId?: string
}

type Managing =
  | { kind: 'store'; store: Store }
  | { kind: 'group'; group: StoreGroup }

function inheritedGroupCard(store: Store, groups: StoreGroup[]) {
  if (store.loyaltyCard) return undefined
  const resolved = resolveLoyaltyCard(store, groups)
  return resolved?.source === 'group' ? resolved.card : undefined
}

export function HomeScreen({
  stores,
  groups,
  categories,
  items,
  onOpenSettings,
  onOpenStore,
  onStartAddStore,
  onAddGroup,
  onRenameStore,
  onDeleteStore,
  onRenameGroup,
  onDeleteGroup,
  onSetGroupIcon,
  onSetStoreIcon,
  onSetGroupLoyalty,
  onSetStoreLoyalty,
  onSetStoreGroup,
  onSetGroupVisibility,
  onSetStoreVisibility,
  onOpenListTemplates,
  onSaveGroupTemplate,
  onSaveStoreTemplate,
  onDeleteGroupTemplate,
  onReorderStores,
  onReorderHome,
  syncEnabled = false,
  myId,
  syncConfigured = true,
  displayName,
  frozen = false,
  localCopyHint = false,
  syncError = null,
  syncBusy = false,
  familyConnected = false,
  updatedStoreIds = [],
  onDismissStoreUpdate,
  onRetrySync,
  badgePrompt = false,
  onAllowBadge,
  onSkipBadge,
  settings,
  people = [],
  onForwardList,
}: HomeScreenProps) {
  const [managing, setManaging] = useState<Managing | null>(null)
  const [movingStore, setMovingStore] = useState<Store | null>(null)
  const [renamingStore, setRenamingStore] = useState<Store | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<StoreGroup | null>(null)
  const [deletingStore, setDeletingStore] = useState<Store | null>(null)
  const [forwardingStore, setForwardingStore] = useState<Store | null>(null)
  const [forwardNote, setForwardNote] = useState<string | null>(null)
  const [forwardBusy, setForwardBusy] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<StoreGroup | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupVisibility, setNewGroupVisibility] = useState<StoreVisibility>('home')
  const [editingGroupVisibility, setEditingGroupVisibility] = useState<StoreVisibility>('home')
  const [editingStoreVisibility, setEditingStoreVisibility] = useState<StoreVisibility>('home')
  const [pickingGroupIcon, setPickingGroupIcon] = useState<StoreGroup | null>(null)
  const [pickingStoreIcon, setPickingStoreIcon] = useState<Store | null>(null)
  const [editingGroupCard, setEditingGroupCard] = useState<StoreGroup | null>(null)
  const [templateGroupId, setTemplateGroupId] = useState<string | null>(null)
  const [editingStoreCard, setEditingStoreCard] = useState<Store | null>(null)
  const [addingMenu, setAddingMenu] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => loadCollapsedGroups())
  const [homeOrder, setHomeOrder] = useState(() => ensureHomeOrder(stores, groups, loadHomeOrder()))
  const [draftStores, setDraftStores] = useState<Store[] | null>(null)
  const [draftHomeOrder, setDraftHomeOrder] = useState<string[] | null>(null)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  const listRef = useRef<HTMLUListElement>(null)
  const drag = useRef<DragState | null>(null)
  const holdTimer = useRef(0)
  const skipClick = useRef(false)
  const draftStoresRef = useRef<Store[] | null>(null)
  const draftHomeRef = useRef<string[] | null>(null)
  const storesRef = useRef(stores)
  const homeOrderRef = useRef(homeOrder)
  const boundRef = useRef(false)
  const liveWindow = useRef({
    move: (_event: PointerEvent) => {},
    up: (_event: PointerEvent) => {},
    touch: (_event: TouchEvent) => {},
  })
  const stableWindow = useRef({
    move: (event: PointerEvent) => liveWindow.current.move(event),
    up: (event: PointerEvent) => liveWindow.current.up(event),
    touch: (event: TouchEvent) => liveWindow.current.touch(event),
  })

  storesRef.current = stores
  homeOrderRef.current = homeOrder

  const collapsedRef = useRef(collapsed)
  collapsedRef.current = collapsed

  useEffect(() => {
    setHomeOrder(ensureHomeOrder(stores, groups, loadHomeOrder()))
  }, [groups, stores])

  useEffect(() => {
    const persist = () => saveCollapsedGroups(collapsedRef.current)
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', persist)
    }
  }, [])

  const updatedGroupIds = useMemo(() => {
    const ids = new Set<string>()
    for (const store of stores) {
      if (!store.groupId || !updatedStoreIds.includes(store.id)) continue
      ids.add(store.groupId)
    }
    return ids
  }, [stores, updatedStoreIds])

  const unboughtByStoreId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      if (item.bought) continue
      counts.set(item.storeId, (counts.get(item.storeId) ?? 0) + 1)
    }
    return counts
  }, [items])

  const unboughtByGroupId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const store of stores) {
      if (!store.groupId) continue
      const n = unboughtByStoreId.get(store.id) ?? 0
      if (n === 0) continue
      counts.set(store.groupId, (counts.get(store.groupId) ?? 0) + n)
    }
    return counts
  }, [stores, unboughtByStoreId])

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current)
      unbindWindow()
    },
    [],
  )

  const displayedStores = draftStores ?? stores
  const displayedHomeOrder = draftHomeOrder ?? homeOrder
  const rows = useMemo(
    () => buildHomeRows(displayedStores, groups, displayedHomeOrder, collapsed),
    [collapsed, displayedHomeOrder, displayedStores, groups],
  )

  function unbindWindow() {
    if (!boundRef.current) return
    boundRef.current = false
    window.removeEventListener('pointermove', stableWindow.current.move)
    window.removeEventListener('pointerup', stableWindow.current.up)
    window.removeEventListener('pointercancel', stableWindow.current.up)
    window.removeEventListener('touchmove', stableWindow.current.touch)
  }

  function toggleCollapsed(groupId: string) {
    setCollapsed((current) => {
      const next = { ...current, [groupId]: !current[groupId] }
      saveCollapsedGroups(next)
      return next
    })
  }

  function reorderKeys(keys: string[], fromKey: string, toKey: string): string[] {
    const from = keys.indexOf(fromKey)
    const to = keys.indexOf(toKey)
    if (from < 0 || to < 0 || from === to) return keys
    const next = [...keys]
    const [row] = next.splice(from, 1)
    if (!row) return keys
    next.splice(to, 0, row)
    return next
  }

  function reorderNested(list: Store[], groupId: string, fromId: string, toId: string): Store[] {
    const nested = list.filter((store) => store.groupId === groupId)
    const from = nested.findIndex((store) => store.id === fromId)
    const to = nested.findIndex((store) => store.id === toId)
    if (from < 0 || to < 0 || from === to) return list
    const nextNested = [...nested]
    const [row] = nextNested.splice(from, 1)
    if (!row) return list
    nextNested.splice(to, 0, row)
    let cursor = 0
    return list.map((store) => {
      if (store.groupId !== groupId) return store
      const replacement = nextNested[cursor]
      cursor += 1
      return replacement ?? store
    })
  }

  function onWindowTouchMove(event: TouchEvent) {
    if (drag.current?.armed) event.preventDefault()
  }

  function onWindowPointerMove(event: PointerEvent) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const moved = dx * dx + dy * dy
    if (!state.armed) {
      if (moved > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        window.clearTimeout(holdTimer.current)
        skipClick.current = true
        unbindWindow()
        drag.current = null
      }
      return
    }
    if (!state.dragging) {
      if (moved < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
      state.dragging = true
    }
    event.preventDefault()

    const list = listRef.current
    if (!list) return

    if (state.scope === 'home') {
      const nodes = [...list.querySelectorAll<HTMLElement>('[data-home-key]')]
      let targetKey: string | null = null
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        if (event.clientY < rect.top + rect.height / 2) {
          targetKey = node.dataset.homeKey ?? null
          break
        }
      }
      if (!targetKey) targetKey = nodes[nodes.length - 1]?.dataset.homeKey ?? null
      if (!targetKey) return
      const current = draftHomeRef.current ?? homeOrderRef.current
      const next = reorderKeys(current, state.key, targetKey)
      if (next === current) return
      draftHomeRef.current = next
      setDraftHomeOrder(next)
      return
    }

    const nodes = [
      ...list.querySelectorAll<HTMLElement>(`[data-group-id="${state.groupId}"][data-store-id]`),
    ]
    let targetId: string | null = null
    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) {
        targetId = node.dataset.storeId ?? null
        break
      }
    }
    if (!targetId) targetId = nodes[nodes.length - 1]?.dataset.storeId ?? null
    if (!targetId || !state.groupId) return
    const storeId = state.key.startsWith('s:') ? state.key.slice(2) : state.key
    const current = draftStoresRef.current ?? storesRef.current
    const next = reorderNested(current, state.groupId, storeId, targetId)
    if (next === current) return
    draftStoresRef.current = next
    setDraftStores(next)
  }

  function finishDrag() {
    window.clearTimeout(holdTimer.current)
    unbindWindow()
    const state = drag.current
    if (!state) return
    if (state.armed) skipClick.current = true
    if (state.dragging) {
      if (state.scope === 'home') {
        const order = draftHomeRef.current ?? homeOrderRef.current
        setHomeOrder(order)
        saveHomeOrder(order)
        onReorderHome(order)
      } else {
        const nextStores = draftStoresRef.current ?? storesRef.current
        onReorderStores(nextStores.map((store) => store.id))
      }
    }
    draftHomeRef.current = null
    draftStoresRef.current = null
    setDraftHomeOrder(null)
    setDraftStores(null)
    setDraggingKey(null)
    drag.current = null
  }

  function onWindowPointerUp(event: PointerEvent) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    finishDrag()
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, row: HomeRow) {
    if (event.button !== 0) return
    skipClick.current = false
    window.clearTimeout(holdTimer.current)
    unbindWindow()
    const pointerId = event.pointerId
    const target = event.currentTarget
    const nested = row.kind === 'store' && row.depth === 1
    const key = row.kind === 'group' ? groupHomeKey(row.group.id) : nested ? row.key : row.store.id
    drag.current = {
      key,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      armed: false,
      dragging: false,
      scope: nested ? 'group' : 'home',
      groupId: nested ? row.store.groupId : undefined,
    }
    boundRef.current = true
    window.addEventListener('pointermove', stableWindow.current.move)
    window.addEventListener('pointerup', stableWindow.current.up)
    window.addEventListener('pointercancel', stableWindow.current.up)
    window.addEventListener('touchmove', stableWindow.current.touch, { passive: false })
    holdTimer.current = window.setTimeout(() => {
      const state = drag.current
      if (!state || state.pointerId !== pointerId) return
      state.armed = true
      skipClick.current = true
      setDraggingKey(state.key)
      draftHomeRef.current = homeOrderRef.current
      draftStoresRef.current = storesRef.current
      setDraftHomeOrder(homeOrderRef.current)
      setDraftStores(storesRef.current)
      try {
        target.setPointerCapture(pointerId)
      } catch {
        /* iOS */
      }
      navigator.vibrate?.(15)
    }, LONG_PRESS_MS)
  }

  liveWindow.current.move = onWindowPointerMove
  liveWindow.current.up = onWindowPointerUp
  liveWindow.current.touch = onWindowTouchMove

  function onStoreClick(storeId: string) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    onDismissStoreUpdate?.(storeId)
    onOpenStore(storeId)
  }

  function onGroupClick(groupId: string) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    toggleCollapsed(groupId)
  }

  const empty = stores.length === 0 && groups.length === 0

  return (
    <div className="screen">
      <Header
        title={displayName ? `Списки · ${displayName}` : 'Списки'}
        help={
          stores.length + groups.length > 1
            ? [
                'Удерживайте список или группу и потяните, чтобы изменить порядок.',
                'Через «⋯» список можно положить в группу.',
              ].join('\n')
            : 'Через «+» можно создать список или группу.'
        }
        left={
          <button
            type="button"
            className="icon-button"
            aria-label="Настройки"
            onClick={onOpenSettings}
          >
            <SettingsIcon />
          </button>
        }
        right={<AddIconButton ariaLabel="Добавить" onClick={() => setAddingMenu(true)} />}
      />

      <main className="content">
        {!syncConfigured ? (
          <div className="hint hint--error" style={{ display: 'grid', gap: 8 }}>
            <span>
              Телефоны не синхронизируются: на сайте нет ключей Supabase. Откройте Настройки → Семья
              и вставьте Project URL и anon key на обоих телефонах.
            </span>
            <button type="button" className="qty-button" onClick={onOpenSettings}>
              Открыть Семью
            </button>
          </div>
        ) : null}
        {frozen ? (
          <p className="hint">
            {syncBusy
              ? 'Снова подключаемся к семье…'
              : 'Синхронизация остановлена. Списки остались на этом телефоне. Откройте Настройки → Семья, чтобы вернуться в дом.'}
          </p>
        ) : null}
        {localCopyHint ? (
          <p className="hint">
            Это копия на этом устройстве. Списки с ярлыка сюда сами не переезжают. Настройки →
            Семья → «У меня есть код»: возьмите код T там, где в шапке ваше имя и списки верные.
          </p>
        ) : null}
        {badgePrompt ? (
          <div className="hint" style={{ display: 'grid', gap: 8 }}>
            <span>
              На ярлыке можно показать, сколько ещё купить. iPhone спросит про уведомления — сами
              уведомления присылать не будем.
            </span>
            <button type="button" className="button-primary add-category" onClick={onAllowBadge}>
              Показать на ярлыке
            </button>
            <button type="button" className="text-button" onClick={onSkipBadge}>
              Не сейчас
            </button>
          </div>
        ) : null}
        {syncError ? (
          <div className="hint hint--error" style={{ display: 'grid', gap: 8 }}>
            <span>{syncError}</span>
            {onRetrySync ? (
              <button
                type="button"
                className="button-secondary add-category"
                disabled={syncBusy}
                onClick={onRetrySync}
              >
                {syncBusy ? 'Обновляем…' : 'Обновить'}
              </button>
            ) : null}
          </div>
        ) : null}
        {syncConfigured && syncEnabled && !frozen && !syncError ? (
          <p className="hint" style={{ opacity: 0.75 }}>
            {familyConnected
              ? `Семья подключена${syncBusy ? ' · обновляем…' : ''}.`
              : `Списки сохраняются в облаке${syncBusy ? ' · обновляем…' : ''}.`}
          </p>
        ) : null}
        {empty ? (
          <p className="empty">Нет списков. Нажмите «+», чтобы добавить список или группу.</p>
        ) : (
          <ul
            className={draggingKey ? 'store-list store-list--reordering' : 'store-list'}
            ref={listRef}
          >
            {rows.map((row) => {
              if (row.kind === 'group') {
                const nestedCount = stores.filter((store) => store.groupId === row.group.id).length
                const isCollapsed = Boolean(collapsed[row.group.id])
                const homeKey = groupHomeKey(row.group.id)
                const groupUpdated = updatedGroupIds.has(row.group.id)
                return (
                  <li
                    key={row.key}
                    data-home-key={homeKey}
                    className={[
                      'store-row-wrap',
                      draggingKey === homeKey ? 'store-row-wrap--dragging' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className={[
                        draggingKey === homeKey ? 'store-row dragging' : 'store-row',
                        'store-row--group',
                        groupUpdated ? 'store-row--updated' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onPointerDown={(event) => onPointerDown(event, row)}
                      onClick={() => onGroupClick(row.group.id)}
                      onContextMenu={(event) => event.preventDefault()}
                      aria-expanded={!isCollapsed}
                      aria-label={
                        groupUpdated
                          ? `${row.group.name}, в группе есть обновления`
                          : undefined
                      }
                    >
                      <span className="store-handle" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="store-name">
                        <span className="store-group-chevron" aria-hidden="true">
                          {isCollapsed ? '▸' : '▾'}
                        </span>
                        {resolvedGroupIcon(row.group) ? (
                          <CategoryMark
                            className="category-mark-sm"
                            category={{
                              name: row.group.name,
                              color: 'none',
                              icon: resolvedGroupIcon(row.group),
                            }}
                          />
                        ) : null}
                        <span className="store-name-text">{row.group.name}</span>
                        {syncEnabled && row.group.visibility === 'private' ? (
                          <span className="store-local-mark store-local-mark--icon" title="личное">
                            <span aria-hidden="true">🔒</span>
                            <span className="visually-hidden">личное</span>
                          </span>
                        ) : null}
                        <span className="store-local-mark">{nestedCount}</span>
                      </span>
                      {(unboughtByGroupId.get(row.group.id) ?? 0) > 0 ? (
                        <span
                          className={
                            isGroupInBadge(row.group.id, stores, settings)
                              ? 'store-unbought-count'
                              : 'store-unbought-count store-unbought-count--outline'
                          }
                          aria-label="Некуплено"
                        >
                          {unboughtByGroupId.get(row.group.id)}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="qty-button store-menu"
                      aria-label={`Изменить группу ${row.group.name}`}
                      onClick={() => {
                        setEditingGroupVisibility(row.group.visibility === 'private' ? 'private' : 'home')
                        setManaging({ kind: 'group', group: row.group })
                      }}
                    >
                      ⋯
                    </button>
                  </li>
                )
              }

              const store = row.store
              const dragKey = row.depth === 0 ? store.id : row.key
              return (
                <li
                  key={row.key}
                  data-home-key={row.depth === 0 ? store.id : undefined}
                  data-store-id={store.id}
                  data-group-id={store.groupId}
                  className={[
                    'store-row-wrap',
                    row.depth === 1 ? 'store-row-wrap--nested' : '',
                    draggingKey === dragKey ? 'store-row-wrap--dragging' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className={[
                      draggingKey === dragKey ? 'store-row dragging' : 'store-row',
                      row.depth === 1 ? 'store-row--nested' : '',
                      storeHasLocalCategories(categories, store.id) ? 'store-row--local' : '',
                      updatedStoreIds.includes(store.id) ? 'store-row--updated' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onPointerDown={(event) => onPointerDown(event, row)}
                    aria-label={
                      updatedStoreIds.includes(store.id)
                        ? `${store.name}, список обновился`
                        : undefined
                    }
                    onClick={() => onStoreClick(store.id)}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <span className="store-handle" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="store-name">
                      {resolvedGroupIcon(store) ? (
                        <CategoryMark
                          className="category-mark-sm"
                          category={{
                            name: store.name,
                            color: 'none',
                            icon: resolvedGroupIcon(store),
                          }}
                        />
                      ) : null}
                      <span className="store-name-text">{store.name}</span>
                      {storeHasLocalCategories(categories, store.id) ? (
                        <span className="store-local-mark store-local-mark--icon" title="свои">
                          <span aria-hidden="true">✦</span>
                          <span className="visually-hidden">свои</span>
                        </span>
                      ) : null}
                      {syncEnabled && store.visibility !== 'home' ? (
                        <span className="store-local-mark store-local-mark--icon" title="личное">
                          <span aria-hidden="true">🔒</span>
                          <span className="visually-hidden">личное</span>
                        </span>
                      ) : null}
                      {store.incomingFrom ? (
                        <span className="store-local-mark store-local-mark--icon" title="присланный">
                          <span aria-hidden="true">📩</span>
                          <span className="visually-hidden">присланный</span>
                        </span>
                      ) : null}
                    </span>
                    {(unboughtByStoreId.get(store.id) ?? 0) > 0 ? (
                      <span
                        className={
                          isStoreInBadge(store.id, settings) && !store.incomingFrom
                            ? 'store-unbought-count'
                            : 'store-unbought-count store-unbought-count--outline'
                        }
                        aria-label="Некуплено"
                      >
                        {unboughtByStoreId.get(store.id)}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="qty-button store-menu"
                    aria-label={`Изменить список ${store.name}`}
                    onClick={() => {
                      setEditingStoreVisibility(store.visibility === 'home' ? 'home' : 'private')
                      setManaging({ kind: 'store', store })
                    }}
                  >
                    ⋯
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="app-version">Версия {APP_VERSION}</p>
      </main>

      {addingMenu ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setAddingMenu(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title="Добавить" onClose={() => setAddingMenu(false)} />
            <div className="choice-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setAddingMenu(false)
                  onStartAddStore()
                }}
              >
                Новый список
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setAddingMenu(false)
                  setNewGroupVisibility('home')
                  setCreatingGroup(true)
                }}
              >
                Новая группа
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {managing?.kind === 'store' ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setManaging(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title={managing.store.name} onClose={() => setManaging(null)} />
            {syncEnabled && !managing.store.incomingFrom ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={editingStoreVisibility === 'private' ? 'choice active' : 'choice'}
                    onClick={() => {
                      setEditingStoreVisibility('private')
                      onSetStoreVisibility(managing.store.id, 'private')
                    }}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={editingStoreVisibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => {
                      setEditingStoreVisibility('home')
                      onSetStoreVisibility(managing.store.id, 'home')
                    }}
                  >
                    Весь дом
                  </button>
                </div>
              </>
            ) : null}
            <div className="command-row">
              <CommandButton
                label="Имя"
                ariaLabel="Переименовать"
                onClick={() => {
                  setRenamingStore(managing.store)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Значок"
                onClick={() => {
                  setPickingStoreIcon(managing.store)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Карта"
                ariaLabel="Бонусная карта"
                onClick={() => {
                  setEditingStoreCard(managing.store)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Шаблоны"
                onClick={() => {
                  onOpenListTemplates(managing.store.id)
                  setManaging(null)
                }}
              />
              {!managing.store.incomingFrom ? (
                <CommandButton
                  label="В группу"
                  onClick={() => {
                    setMovingStore(managing.store)
                    setManaging(null)
                  }}
                />
              ) : null}
              {managing.store.groupId && !managing.store.incomingFrom ? (
                <CommandButton
                  label="Наверх"
                  ariaLabel="На первый уровень"
                  onClick={() => {
                    onSetStoreGroup(managing.store.id, null)
                    setManaging(null)
                  }}
                />
              ) : null}
              {syncEnabled && onForwardList ? (
                <CommandButton
                  label="Отправить"
                  ariaLabel="Переслать"
                  onClick={() => {
                    setForwardNote(null)
                    setForwardingStore(managing.store)
                    setManaging(null)
                  }}
                />
              ) : null}
              <CommandButton
                label="Удалить"
                danger
                onClick={() => {
                  setDeletingStore(managing.store)
                  setManaging(null)
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {managing?.kind === 'group' ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setManaging(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title={managing.group.name} onClose={() => setManaging(null)} />
            {syncEnabled ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={editingGroupVisibility === 'private' ? 'choice active' : 'choice'}
                    onClick={() => {
                      setEditingGroupVisibility('private')
                      onSetGroupVisibility(managing.group.id, 'private')
                    }}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={editingGroupVisibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => {
                      setEditingGroupVisibility('home')
                      onSetGroupVisibility(managing.group.id, 'home')
                    }}
                  >
                    Весь дом
                  </button>
                </div>
              </>
            ) : null}
            <div className="command-row">
              <CommandButton
                label="Имя"
                ariaLabel="Переименовать"
                onClick={() => {
                  setRenamingGroup(managing.group)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Значок"
                onClick={() => {
                  setPickingGroupIcon(managing.group)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Карта"
                ariaLabel="Бонусная карта"
                onClick={() => {
                  setEditingGroupCard(managing.group)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Шаблоны"
                onClick={() => {
                  setTemplateGroupId(managing.group.id)
                  setManaging(null)
                }}
              />
              <CommandButton
                label="Удалить"
                ariaLabel="Удалить группу"
                danger
                onClick={() => {
                  setDeletingGroup(managing.group)
                  setManaging(null)
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {forwardingStore ? (
        <div
          className="overlay overlay--capture"
          role="presentation"
          onClick={() => {
            if (forwardBusy) return
            setForwardingStore(null)
            setForwardNote(null)
          }}
        >
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading
              title="Переслать"
              onClose={() => {
                if (forwardBusy) return
                setForwardingStore(null)
                setForwardNote(null)
              }}
            />
            <p className="hint">
              «{forwardingStore.name}» уйдёт копией. У человека появится отдельный новый список, не
              список его семьи.
            </p>
            {people.length === 0 ? (
              <p className="hint">Сначала добавьте человека: Настройки → Люди → код из сообщения.</p>
            ) : (
              <ul className="choice-row sheet-list">
                {people.map((person) => (
                  <li key={person.userId}>
                    <button
                      type="button"
                      className="choice"
                      disabled={forwardBusy || !onForwardList}
                      onClick={() => {
                        if (!onForwardList) return
                        setForwardBusy(true)
                        setForwardNote(null)
                        void onForwardList(forwardingStore.id, person.code)
                          .then(() => {
                            setForwardNote(`Список отправлен: ${person.name}`)
                          })
                          .catch((caught: unknown) => {
                            const message = caught instanceof Error ? caught.message : 'Не удалось отправить'
                            setForwardNote(message)
                          })
                          .finally(() => setForwardBusy(false))
                      }}
                    >
                      {person.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {forwardNote ? <p className="hint">{forwardNote}</p> : null}
          </div>
        </div>
      ) : null}

      {movingStore ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setMovingStore(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title="Куда перенести" onClose={() => setMovingStore(null)} />
            <div className="choice-row">
              {groups.length === 0 ? (
                <p className="hint">Сначала создайте группу через «+».</p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="button-secondary"
                    disabled={movingStore.groupId === group.id}
                    onClick={() => {
                      onSetStoreGroup(movingStore.id, group.id)
                      setMovingStore(null)
                    }}
                  >
                    {group.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {creatingGroup ? (
        <NameDialog
          title="Новая группа"
          label="Название"
          placeholder="Например, На дачу"
          confirmLabel="Создать"
          extra={
            syncEnabled ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={newGroupVisibility === 'private' ? 'choice active' : 'choice'}
                    onClick={() => setNewGroupVisibility('private')}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={newGroupVisibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => setNewGroupVisibility('home')}
                  >
                    Весь дом
                  </button>
                </div>
              </>
            ) : null
          }
          onClose={() => setCreatingGroup(false)}
          onConfirm={(next) => {
            onAddGroup(next, newGroupVisibility)
            setCreatingGroup(false)
          }}
        />
      ) : null}

      {templateGroupId ? (
        <GroupTemplatesDialog
          group={groups.find((group) => group.id === templateGroupId) ?? {
            id: templateGroupId,
            name: 'Группа',
          }}
          stores={stores.filter((store) => store.groupId === templateGroupId)}
          categories={categories}
          syncEnabled={syncEnabled}
          myId={myId}
          onClose={() => setTemplateGroupId(null)}
          onSave={(draft) => onSaveGroupTemplate(templateGroupId, draft)}
          onSaveStore={(storeId, draft) => onSaveStoreTemplate(storeId, draft)}
          onDelete={(templateId) => onDeleteGroupTemplate(templateGroupId, templateId)}
        />
      ) : null}

      {renamingStore ? (
        <NameDialog
          title="Название списка"
          label="Название"
          placeholder="Например, Пятёрочка"
          initial={renamingStore.name}
          confirmLabel="Сохранить"
          onClose={() => setRenamingStore(null)}
          onConfirm={(next) => {
            onRenameStore(renamingStore.id, next)
            setRenamingStore(null)
          }}
        />
      ) : null}

      {renamingGroup ? (
        <NameDialog
          title="Название группы"
          label="Название"
          placeholder="Например, На дачу"
          initial={renamingGroup.name}
          confirmLabel="Сохранить"
          inputId="group-rename"
          onClose={() => setRenamingGroup(null)}
          onConfirm={(next) => {
            onRenameGroup(renamingGroup.id, next)
            setRenamingGroup(null)
          }}
        />
      ) : null}

      {pickingGroupIcon ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setPickingGroupIcon(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title="Значок группы" onClose={() => setPickingGroupIcon(null)} />
            <CategoryMarkPicker
              iconsOnly
              color="none"
              icon={resolvedGroupIcon(pickingGroupIcon) ?? ''}
              onColor={() => {}}
              onIcon={(icon) => {
                onSetGroupIcon(pickingGroupIcon.id, icon)
                setPickingGroupIcon(null)
              }}
            />
            {resolvedGroupIcon(pickingGroupIcon) ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  onSetGroupIcon(pickingGroupIcon.id, undefined)
                  setPickingGroupIcon(null)
                }}
              >
                Без значка
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pickingStoreIcon ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setPickingStoreIcon(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title="Значок списка" onClose={() => setPickingStoreIcon(null)} />
            <CategoryMarkPicker
              iconsOnly
              color="none"
              icon={resolvedGroupIcon(pickingStoreIcon) ?? ''}
              onColor={() => {}}
              onIcon={(icon) => {
                onSetStoreIcon(pickingStoreIcon.id, icon)
                setPickingStoreIcon(null)
              }}
            />
            {resolvedGroupIcon(pickingStoreIcon) ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  onSetStoreIcon(pickingStoreIcon.id, undefined)
                  setPickingStoreIcon(null)
                }}
              >
                Без значка
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {editingGroupCard ? (
        <LoyaltyCardEditor
          title={`Карта: ${editingGroupCard.name}`}
          initial={editingGroupCard.loyaltyCard}
          onClose={() => setEditingGroupCard(null)}
          onSave={(card) => {
            onSetGroupLoyalty(editingGroupCard.id, card)
            setEditingGroupCard(null)
          }}
        />
      ) : null}

      {editingStoreCard ? (
        <LoyaltyCardEditor
          title={`Карта: ${editingStoreCard.name}`}
          initial={editingStoreCard.loyaltyCard}
          inherited={inheritedGroupCard(editingStoreCard, groups)}
          inheritedLabel="группы"
          onClose={() => setEditingStoreCard(null)}
          onSave={(card) => {
            onSetStoreLoyalty(editingStoreCard.id, card)
            setEditingStoreCard(null)
          }}
        />
      ) : null}

      {deletingStore ? (
        <ConfirmDialog
          title="Удалить список?"
          text={`«${deletingStore.name}» и все его товары будут удалены.`}
          confirmLabel="Удалить"
          onClose={() => setDeletingStore(null)}
          onConfirm={() => {
            playConfirmSound('delete')
            onDeleteStore(deletingStore.id)
            setDeletingStore(null)
          }}
        />
      ) : null}

      {deletingGroup ? (
        <ConfirmDialog
          title="Удалить группу?"
          text={`«${deletingGroup.name}» будет удалена. Списки из неё останутся на первом уровне.`}
          confirmLabel="Удалить"
          onClose={() => setDeletingGroup(null)}
          onConfirm={() => {
            onDeleteGroup(deletingGroup.id)
            setDeletingGroup(null)
          }}
        />
      ) : null}
    </div>
  )
}
