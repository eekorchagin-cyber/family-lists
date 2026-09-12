import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { SettingsIcon } from '../components/SettingsIcon'
import { storeHasLocalCategories } from '../data/categories'
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
import { APP_VERSION } from '../data/version'
import type { Category, Item, Store, StoreGroup } from '../types'

type HomeScreenProps = {
  stores: Store[]
  groups: StoreGroup[]
  categories: Category[]
  items: Item[]
  onOpenSettings: () => void
  onOpenStore: (storeId: string) => void
  onStartAddStore: () => void
  onAddGroup: (name: string) => void
  onRenameStore: (storeId: string, name: string) => void
  onDeleteStore: (storeId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteGroup: (groupId: string) => void
  onSetStoreGroup: (storeId: string, groupId: string | null) => void
  onReorderStores: (orderedIds: string[]) => void
  onReorderHome: (orderedKeys: string[]) => void
  syncEnabled?: boolean
  syncConfigured?: boolean
  displayName?: string
  frozen?: boolean
  syncError?: string | null
  syncBusy?: boolean
  updatedStoreIds?: string[]
  onDismissStoreUpdate?: (storeId: string) => void
  onRetrySync?: () => void
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
  onSetStoreGroup,
  onReorderStores,
  onReorderHome,
  syncEnabled = false,
  syncConfigured = true,
  displayName,
  frozen = false,
  syncError = null,
  syncBusy = false,
  updatedStoreIds = [],
  onDismissStoreUpdate,
  onRetrySync,
}: HomeScreenProps) {
  const [managing, setManaging] = useState<Managing | null>(null)
  const [movingStore, setMovingStore] = useState<Store | null>(null)
  const [renamingStore, setRenamingStore] = useState<Store | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<StoreGroup | null>(null)
  const [deletingStore, setDeletingStore] = useState<Store | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<StoreGroup | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
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

  useEffect(() => {
    setHomeOrder(ensureHomeOrder(stores, groups, loadHomeOrder()))
  }, [groups, stores])

  // Если внутри свёрнутой группы обновился список — раскроем группу,
  // чтобы была видна и подсветка списка, и подсветка самой группы.
  useEffect(() => {
    if (updatedStoreIds.length === 0) return
    setCollapsed((current) => {
      let changed = false
      const next = { ...current }
      for (const store of stores) {
        if (!store.groupId || !updatedStoreIds.includes(store.id)) continue
        if (!next[store.groupId]) continue
        next[store.groupId] = false
        changed = true
      }
      if (!changed) return current
      saveCollapsedGroups(next)
      return next
    })
  }, [stores, updatedStoreIds])

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
            ? 'Удерживайте список или группу и потяните, чтобы изменить порядок. Через «⋯» список можно положить в группу.'
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
            Синхронизация остановлена. Списки остались на этом телефоне. Откройте Настройки → Семья,
            чтобы вернуться в дом.
          </p>
        ) : null}
        {syncError ? (
          <div className="hint hint--error" style={{ display: 'grid', gap: 8 }}>
            <span>Синхронизация не работает: {syncError}</span>
            {onRetrySync ? (
              <button type="button" className="qty-button" disabled={syncBusy} onClick={onRetrySync}>
                {syncBusy ? 'Обновляем…' : 'Повторить синхронизацию'}
              </button>
            ) : null}
          </div>
        ) : null}
        {syncConfigured && syncEnabled && !frozen && !syncError ? (
          <p className="hint" style={{ opacity: 0.75 }}>
            Семья подключена{syncBusy ? ' · обновляем…' : ''}.
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
                        <span className="store-name-text">{row.group.name}</span>
                        <span className="store-local-mark">{nestedCount}</span>
                      </span>
                      {(unboughtByGroupId.get(row.group.id) ?? 0) > 0 ? (
                        <span className="store-unbought-count" aria-label="Некуплено">
                          {unboughtByGroupId.get(row.group.id)}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="qty-button store-menu"
                      aria-label={`Изменить группу ${row.group.name}`}
                      onClick={() => setManaging({ kind: 'group', group: row.group })}
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
                      <span className="store-name-text">{store.name}</span>
                      {storeHasLocalCategories(categories, store.id) ? (
                        <span className="store-local-mark">свои</span>
                      ) : null}
                      {syncEnabled && store.visibility !== 'home' ? (
                        <span className="store-local-mark">личное</span>
                      ) : null}
                    </span>
                    {(unboughtByStoreId.get(store.id) ?? 0) > 0 ? (
                      <span className="store-unbought-count" aria-label="Некуплено">
                        {unboughtByStoreId.get(store.id)}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="qty-button store-menu"
                    aria-label={`Изменить список ${store.name}`}
                    onClick={() => setManaging({ kind: 'store', store })}
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
        <div className="overlay" role="presentation" onClick={() => setAddingMenu(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Добавить</h2>
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
                  setCreatingGroup(true)
                }}
              >
                Новая группа
              </button>
              <button type="button" className="button-secondary" onClick={() => setAddingMenu(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {managing?.kind === 'store' ? (
        <div className="overlay" role="presentation" onClick={() => setManaging(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{managing.store.name}</h2>
            <div className="choice-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setRenamingStore(managing.store)
                  setManaging(null)
                }}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setMovingStore(managing.store)
                  setManaging(null)
                }}
              >
                В группу…
              </button>
              {managing.store.groupId ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    onSetStoreGroup(managing.store.id, null)
                    setManaging(null)
                  }}
                >
                  На первый уровень
                </button>
              ) : null}
              <button
                type="button"
                className="button-danger"
                onClick={() => {
                  setDeletingStore(managing.store)
                  setManaging(null)
                }}
              >
                Удалить
              </button>
              <button type="button" className="button-secondary" onClick={() => setManaging(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {managing?.kind === 'group' ? (
        <div className="overlay" role="presentation" onClick={() => setManaging(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{managing.group.name}</h2>
            <div className="choice-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setRenamingGroup(managing.group)
                  setManaging(null)
                }}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={() => {
                  setDeletingGroup(managing.group)
                  setManaging(null)
                }}
              >
                Удалить группу
              </button>
              <button type="button" className="button-secondary" onClick={() => setManaging(null)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {movingStore ? (
        <div className="overlay" role="presentation" onClick={() => setMovingStore(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>Куда перенести</h2>
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
              <button type="button" className="button-secondary" onClick={() => setMovingStore(null)}>
                Отмена
              </button>
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
          onClose={() => setCreatingGroup(false)}
          onConfirm={(next) => {
            onAddGroup(next)
            setCreatingGroup(false)
          }}
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
          onClose={() => setRenamingGroup(null)}
          onConfirm={(next) => {
            onRenameGroup(renamingGroup.id, next)
            setRenamingGroup(null)
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
