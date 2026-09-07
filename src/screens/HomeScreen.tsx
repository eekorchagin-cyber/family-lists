import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { SettingsIcon } from '../components/SettingsIcon'
import { storeHasLocalCategories } from '../data/categories'
import { APP_VERSION } from '../data/version'
import type { Category, Store } from '../types'

type HomeScreenProps = {
  stores: Store[]
  categories: Category[]
  onOpenSettings: () => void
  onOpenStore: (storeId: string) => void
  onStartAddStore: () => void
  onRenameStore: (storeId: string, name: string) => void
  onDeleteStore: (storeId: string) => void
  onReorderStores: (orderedIds: string[]) => void
  syncEnabled?: boolean
  displayName?: string
  frozen?: boolean
  updatedStoreIds?: string[]
  onDismissStoreUpdate?: (storeId: string) => void
}

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 12
const DRAG_THRESHOLD_PX = 10

type DragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  armed: boolean
  dragging: boolean
}

export function HomeScreen({
  stores,
  categories,
  onOpenSettings,
  onOpenStore,
  onStartAddStore,
  onRenameStore,
  onDeleteStore,
  onReorderStores,
  syncEnabled = false,
  displayName,
  frozen = false,
  updatedStoreIds = [],
  onDismissStoreUpdate,
}: HomeScreenProps) {
  const [managing, setManaging] = useState<Store | null>(null)
  const [renaming, setRenaming] = useState<Store | null>(null)
  const [deleting, setDeleting] = useState<Store | null>(null)
  const [draftStores, setDraftStores] = useState<Store[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const drag = useRef<DragState | null>(null)
  const holdTimer = useRef(0)
  const skipClick = useRef(false)
  const draftRef = useRef<Store[] | null>(null)
  const storesRef = useRef(stores)
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
  const displayed = draftStores ?? stores
  storesRef.current = stores

  useEffect(() => () => {
    clearHoldTimer()
    unbindWindow()
  }, [])

  function clearHoldTimer() {
    window.clearTimeout(holdTimer.current)
  }

  function unbindWindow() {
    if (!boundRef.current) return
    boundRef.current = false
    window.removeEventListener('pointermove', stableWindow.current.move)
    window.removeEventListener('pointerup', stableWindow.current.up)
    window.removeEventListener('pointercancel', stableWindow.current.up)
    window.removeEventListener('touchmove', stableWindow.current.touch)
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
        clearHoldTimer()
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
    const rows = [...list.querySelectorAll<HTMLElement>('[data-store-id]')]
    let nextIndex = rows.length - 1
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const rect = row.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) {
        nextIndex = i
        break
      }
    }

    const listItems = draftRef.current ?? storesRef.current
    const from = listItems.findIndex((store) => store.id === state.id)
    if (from < 0 || from === nextIndex) return
    const next = [...listItems]
    const [row] = next.splice(from, 1)
    if (!row) return
    next.splice(nextIndex, 0, row)
    draftRef.current = next
    setDraftStores(next)
  }

  function onWindowPointerUp(event: PointerEvent) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    finishDrag()
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    storeId: string,
  ) {
    if (event.button !== 0) return
    skipClick.current = false
    clearHoldTimer()
    unbindWindow()
    const pointerId = event.pointerId
    const target = event.currentTarget
    drag.current = {
      id: storeId,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      armed: false,
      dragging: false,
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
      setDraggingId(state.id)
      draftRef.current = storesRef.current
      setDraftStores(storesRef.current)
      try {
        target.setPointerCapture(pointerId)
      } catch {
        /* iOS sometimes не даёт capture после паузы — слушаем window */
      }
      navigator.vibrate?.(15)
    }, LONG_PRESS_MS)
  }

  liveWindow.current.move = onWindowPointerMove
  liveWindow.current.up = onWindowPointerUp
  liveWindow.current.touch = onWindowTouchMove

  function finishDrag() {
    clearHoldTimer()
    unbindWindow()
    const state = drag.current
    if (!state) return
    if (state.armed) skipClick.current = true
    if (state.dragging) {
      const order = (draftRef.current ?? storesRef.current).map((store) => store.id)
      onReorderStores(order)
    }
    draftRef.current = null
    setDraftStores(null)
    setDraggingId(null)
    drag.current = null
  }

  function onStoreClick(storeId: string) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    onDismissStoreUpdate?.(storeId)
    onOpenStore(storeId)
  }

  return (
    <div className="screen">
      <Header
        title={displayName ? `Списки · ${displayName}` : 'Списки'}
        help={
          stores.length > 1
            ? 'Удерживайте список, затем потяните, чтобы изменить порядок. Заштрихованные списки содержат свои категории.'
            : categories.some((category) => category.storeId)
              ? 'Заштрихованные списки содержат свои категории.'
              : undefined
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
        right={<AddIconButton ariaLabel="Добавить список" onClick={onStartAddStore} />}
      />

      <main className="content">
        {frozen ? (
          <p className="hint">
            Синхронизация остановлена. Списки остались на этом телефоне. Откройте Настройки →
            Семья, чтобы вернуться в дом.
          </p>
        ) : null}
        {stores.length === 0 ? (
          <p className="empty">Нет магазинов. Нажмите «+» справа вверху.</p>
        ) : (
          <>
            <ul
              className={draggingId ? 'store-list store-list--reordering' : 'store-list'}
              ref={listRef}
            >
              {displayed.map((store) => (
                <li key={store.id} data-store-id={store.id} className="store-row-wrap">
                  <button
                    type="button"
                    className={[
                      draggingId === store.id ? 'store-row dragging' : 'store-row',
                      storeHasLocalCategories(categories, store.id) ? 'store-row--local' : '',
                      updatedStoreIds.includes(store.id) ? 'store-row--updated' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onPointerDown={(event) => onPointerDown(event, store.id)}
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
                  </button>
                  <button
                    type="button"
                    className="qty-button store-menu"
                    aria-label={`Изменить список ${store.name}`}
                    onClick={() => setManaging(store)}
                  >
                    ⋯
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="app-version">Версия {APP_VERSION}</p>
      </main>

      {managing && (
        <div className="overlay" role="presentation" onClick={() => setManaging(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{managing.name}</h2>
            <div className="choice-row">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setRenaming(managing)
                  setManaging(null)
                }}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={() => {
                  setDeleting(managing)
                  setManaging(null)
                }}
              >
                Удалить
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setManaging(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {renaming && (
        <NameDialog
          title="Название списка"
          label="Название"
          placeholder="Например, Пятёрочка"
          initial={renaming.name}
          confirmLabel="Сохранить"
          onClose={() => setRenaming(null)}
          onConfirm={(next) => {
            onRenameStore(renaming.id, next)
            setRenaming(null)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Удалить список?"
          text={`«${deleting.name}» и все его товары будут удалены.`}
          confirmLabel="Удалить"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onDeleteStore(deleting.id)
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}
