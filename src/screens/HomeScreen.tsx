import { useRef, useState, type PointerEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { SettingsIcon } from '../components/SettingsIcon'
import type { Store } from '../types'

type HomeScreenProps = {
  stores: Store[]
  onOpenSettings: () => void
  onOpenStore: (storeId: string) => void
  onStartAddStore: () => void
  onRenameStore: (storeId: string, name: string) => void
  onDeleteStore: (storeId: string) => void
  onReorderStores: (orderedIds: string[]) => void
}

const DRAG_THRESHOLD_PX = 10

type DragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  dragging: boolean
}

export function HomeScreen({
  stores,
  onOpenSettings,
  onOpenStore,
  onStartAddStore,
  onRenameStore,
  onDeleteStore,
  onReorderStores,
}: HomeScreenProps) {
  const [managing, setManaging] = useState<Store | null>(null)
  const [renaming, setRenaming] = useState<Store | null>(null)
  const [deleting, setDeleting] = useState<Store | null>(null)
  const [draftStores, setDraftStores] = useState<Store[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const drag = useRef<DragState | null>(null)
  const skipClick = useRef(false)
  const draftRef = useRef<Store[] | null>(null)
  const displayed = draftStores ?? stores

  function onPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    storeId: string,
  ) {
    if (event.button !== 0) return
    skipClick.current = false
    drag.current = {
      id: storeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    }
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.dragging) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
      state.dragging = true
      setDraggingId(state.id)
      draftRef.current = stores
      setDraftStores(stores)
      event.currentTarget.setPointerCapture(event.pointerId)
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

    const listItems = draftRef.current ?? stores
    const from = listItems.findIndex((store) => store.id === state.id)
    if (from < 0 || from === nextIndex) return
    const next = [...listItems]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(nextIndex, 0, moved)
    draftRef.current = next
    setDraftStores(next)
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    if (state.dragging) {
      skipClick.current = true
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      const order = (draftRef.current ?? stores).map((store) => store.id)
      onReorderStores(order)
      draftRef.current = null
      setDraftStores(null)
      setDraggingId(null)
    }
    drag.current = null
  }

  function onStoreClick(storeId: string) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    onOpenStore(storeId)
  }

  return (
    <div className="screen">
      <Header
        title="Списки"
        right={
          <button
            type="button"
            className="icon-button"
            aria-label="Настройки"
            onClick={onOpenSettings}
          >
            <SettingsIcon />
          </button>
        }
      />

      <main className="content">
        {stores.length === 0 ? (
          <p className="empty">Нет магазинов. Нажмите «Добавить список».</p>
        ) : (
          <>
            <ul className="store-list" ref={listRef}>
              {displayed.map((store) => (
                <li key={store.id} data-store-id={store.id} className="store-row-wrap">
                  <button
                    type="button"
                    className={
                      draggingId === store.id ? 'store-row dragging' : 'store-row'
                    }
                    onPointerDown={(event) => onPointerDown(event, store.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onClick={() => onStoreClick(store.id)}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <span className="store-handle" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="store-name">{store.name}</span>
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
            {stores.length > 1 && (
              <p className="hint">Потяните список, чтобы изменить порядок.</p>
            )}
          </>
        )}
      </main>

      <button type="button" className="fab" onClick={onStartAddStore}>
        Добавить список
      </button>

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
