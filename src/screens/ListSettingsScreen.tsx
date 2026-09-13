import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { AddListCategoryDialog } from '../components/AddListCategoryDialog'
import { CategoryMark } from '../components/CategoryMark'
import { CategoryScopeDialog } from '../components/CategoryScopeDialog'
import { CategoryStyleDialog } from '../components/CategoryStyleDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CopyCategoriesDialog } from '../components/CopyCategoriesDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { BackIcon } from '../components/NavIcons'
import { TransferDialog } from '../components/TransferDialog'
import { categoryName, isLocalToStore } from '../data/categories'
import type { Category, CategorySort, Item, Store, StoreVisibility } from '../types'

type ListSettingsSection = 'list' | 'categories' | 'templates' | 'transfer'

const SECTIONS: { id: ListSettingsSection; title: string; hint: string }[] = [
  { id: 'list', title: 'Список', hint: 'Название, кто видит и удаление' },
  { id: 'categories', title: 'Категории', hint: 'Отделы этого списка' },
  { id: 'templates', title: 'Шаблоны', hint: 'Заполнить список' },
  { id: 'transfer', title: 'В другой список', hint: 'Копирование и перенос' },
]

const SECTION_TITLES: Record<ListSettingsSection, string> = {
  list: 'Список',
  categories: 'Категории',
  templates: 'Шаблоны',
  transfer: 'В другой список',
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
}

function leftoverItemsHint(count: number): string {
  if (count === 0) return ''
  if (count === 1) return ' Товар останется в списке без категории.'
  return ` ${count} товаров останутся в списке без категории.`
}

function removeCategoryText(category: Category, store: Store, items: Item[]): string {
  const leftover = leftoverItemsHint(
    items.filter((item) => item.categoryId === category.id).length,
  )
  if (category.storeId === store.id) {
    return `Категория будет удалена.${leftover}`
  }
  return `Категория исчезнет из этого списка. В других списках она сохранится.${leftover}`
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

type ListSettingsScreenProps = {
  store: Store
  categories: Category[]
  unusedCategories: Category[]
  items: Item[]
  otherStores: Store[]
  activeCount: number
  onBack: () => void
  onRenameStore: (name: string) => void
  onDeleteStore: () => void
  onSort: (sort: CategorySort) => void
  onSetScope: (categoryId: string, name: string, global: boolean) => void
  onMove: (categoryId: string, direction: -1 | 1) => void
  onReorder: (orderedIds: string[]) => void
  onStyleCategory: (categoryId: string, color: string, icon: string) => void
  onAddCategory: (name: string, color: string, icon?: string, global?: boolean) => string
  onEnableCategory: (categoryIds: string[]) => void
  onRemoveCategory: (categoryId: string) => void
  onCopyCategoriesFrom: (fromStoreId: string) => void
  onCopyCategoriesTo: (toStoreId: string) => void
  onApplyTemplate: (templateId: string) => void
  onRenameTemplate: (templateId: string, name: string) => void
  onDeleteTemplate: (templateId: string) => void
  onSaveTemplate: (name: string) => void
  onCopyToStore: (storeId: string) => void
  onMoveToStore: (storeId: string) => void
  syncEnabled?: boolean
  onVisibility?: (visibility: StoreVisibility) => void
}

export function ListSettingsScreen({
  store,
  categories,
  unusedCategories,
  items,
  otherStores,
  activeCount,
  onBack,
  onRenameStore,
  onDeleteStore,
  onSort,
  onSetScope,
  onMove: _onMove,
  onReorder,
  onStyleCategory,
  onAddCategory,
  onEnableCategory,
  onRemoveCategory,
  onCopyCategoriesFrom,
  onCopyCategoriesTo,
  onApplyTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onCopyToStore,
  onMoveToStore,
  syncEnabled = false,
  onVisibility,
}: ListSettingsScreenProps) {
  const [section, setSection] = useState<ListSettingsSection | null>(null)
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingScope, setEditingScope] = useState<Category | null>(null)
  const [styling, setStyling] = useState<Category | null>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [copyMode, setCopyMode] = useState<'from' | 'to' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [storeName, setStoreName] = useState(store.name)
  const [names, setNames] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const category of categories) {
      next[category.id] = categoryName(category, store)
    }
    return next
  })
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  const listRef = useRef<HTMLUListElement>(null)
  const drag = useRef<DragState | null>(null)
  const holdTimer = useRef(0)
  const skipClick = useRef(false)
  const draftOrderRef = useRef<string[] | null>(null)
  const orderRef = useRef(categories.map((category) => category.id))
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

  const custom = store.categorySort === 'custom'
  void _onMove
  orderRef.current = categories.map((category) => category.id)

  useEffect(() => {
    setStoreName(store.name)
  }, [store.name])

  useEffect(() => {
    setNames((current) => {
      let changed = false
      const next = { ...current }
      for (const category of categories) {
        if (next[category.id] === undefined) {
          next[category.id] = categoryName(category, store)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [categories, store])

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current)
      if (boundRef.current) {
        boundRef.current = false
        window.removeEventListener('pointermove', stableWindow.current.move)
        window.removeEventListener('pointerup', stableWindow.current.up)
        window.removeEventListener('pointercancel', stableWindow.current.up)
        window.removeEventListener('touchmove', stableWindow.current.touch)
      }
    },
    [],
  )

  const displayedCategories = (() => {
    if (!draftOrder) return categories
    const byId = new Map(categories.map((category) => [category.id, category]))
    return draftOrder
      .map((id) => byId.get(id))
      .filter((category): category is Category => Boolean(category))
  })()

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
    const nodes = [...list.querySelectorAll<HTMLElement>('[data-category-id]')]
    let targetKey: string | null = null
    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) {
        targetKey = node.dataset.categoryId ?? null
        break
      }
    }
    if (!targetKey) targetKey = nodes[nodes.length - 1]?.dataset.categoryId ?? null
    if (!targetKey) return
    const current = draftOrderRef.current ?? orderRef.current
    const next = reorderKeys(current, state.key, targetKey)
    if (next === current) return
    draftOrderRef.current = next
    setDraftOrder(next)
  }

  function finishDrag() {
    window.clearTimeout(holdTimer.current)
    unbindWindow()
    const state = drag.current
    if (!state) return
    if (state.armed) skipClick.current = true
    if (state.dragging) {
      const order = draftOrderRef.current ?? orderRef.current
      onReorder(order)
    }
    draftOrderRef.current = null
    setDraftOrder(null)
    setDraggingKey(null)
    drag.current = null
  }

  function onWindowPointerUp(event: PointerEvent) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    finishDrag()
  }

  function onCategoryPointerDown(
    event: ReactPointerEvent<HTMLLIElement>,
    categoryId: string,
  ) {
    if (!custom || event.button !== 0) return
    skipClick.current = false
    window.clearTimeout(holdTimer.current)
    unbindWindow()
    const pointerId = event.pointerId
    const target = event.currentTarget
    drag.current = {
      key: categoryId,
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
      setDraggingKey(state.key)
      draftOrderRef.current = orderRef.current
      setDraftOrder(orderRef.current)
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

  function guardedClick(action: () => void) {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    action()
  }

  const title = section ? SECTION_TITLES[section] : 'Настройки'
  const goBack = section ? () => setSection(null) : onBack

  return (
    <div className="screen">
      <Header
        title={title}
        subtitle={
          section === 'list' || section === 'transfer' ? undefined : store.name
        }
        left={
          <button type="button" className="icon-button" onClick={goBack} aria-label="Назад">
            <BackIcon />
          </button>
        }
        right={
          section === 'categories' ? (
            <AddIconButton
              ariaLabel="Добавить категорию"
              onClick={() => {
                if (unusedCategories.length > 0) setPicking(true)
                else setAdding(true)
              }}
            />
          ) : undefined
        }
        help={
          section === 'categories' ? (
            <>
              <p>
                В списке только те категории, которые вы добавили. «+» — взять общую или
                создать новую. Крестик убирает категорию из этого списка.
              </p>
              <p>
                Нажмите название, чтобы сделать категорию только для этого списка или общей.
                Заштрихованные названия — только здесь. Нажмите значок, чтобы выбрать цвет и
                пиктограмму.
              </p>
              <p>
                Порядок «По ходу отделов»: зажмите плашку и перетащите, как списки на главном
                экране. Можно скопировать отделы из другого списка или в другой список.
              </p>
            </>
          ) : section === 'transfer' && otherStores.length > 0 ? (
            <p>
              Скопировать или перенести можно некупленные товары. Купленные остаются на
              месте. Порядок категорий в другом списке не меняется.
            </p>
          ) : undefined
        }
      />

      <main className="content">
        {section === null && (
          <ul className="store-list">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="settings-nav-row"
                  onClick={() => setSection(item.id)}
                >
                  <span className="settings-nav-text">
                    <span className="settings-nav-title">{item.title}</span>
                    <span className="settings-nav-hint">{item.hint}</span>
                  </span>
                  <span className="settings-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {section === 'list' && (
          <section className="settings-block">
            <label className="field-label" htmlFor="store-title">
              Название
            </label>
            <input
              id="store-title"
              className="input"
              value={storeName}
              aria-label="Название списка"
              onChange={(event) => setStoreName(event.target.value)}
              onBlur={() => {
                const next = storeName.trim()
                if (!next) {
                  setStoreName(store.name)
                  return
                }
                onRenameStore(next)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
            {syncEnabled && onVisibility ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={store.visibility !== 'home' ? 'choice active' : 'choice'}
                    onClick={() => onVisibility('private')}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={store.visibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => onVisibility('home')}
                  >
                    Весь дом
                  </button>
                </div>
                <p className="hint" style={{ opacity: 0.75 }}>
                  «Только я» — список виден лишь вам (и на ваших телефонах с кодом T). «Весь дом» —
                  всем участникам семьи.
                </p>
              </>
            ) : null}
            <button
              type="button"
              className="button-danger add-category"
              onClick={() => setDeleting(true)}
            >
              Удалить список
            </button>
          </section>
        )}

        {section === 'categories' && (
          <>
            <section className="settings-block">
              <h2>Порядок</h2>
              <div className="choice-row">
                <button
                  type="button"
                  className={store.categorySort === 'alpha' ? 'choice active' : 'choice'}
                  onClick={() => onSort('alpha')}
                >
                  По алфавиту
                </button>
                <button
                  type="button"
                  className={custom ? 'choice active' : 'choice'}
                  onClick={() => onSort('custom')}
                >
                  По ходу отделов
                </button>
              </div>
              {custom && categories.length > 1 ? (
                <p className="hint" style={{ opacity: 0.75 }}>
                  Зажмите плашку и перетащите вверх или вниз.
                </p>
              ) : null}
            </section>

            <section className="settings-block">
              <h2>В этом списке</h2>
              {categories.length === 0 ? (
                <p className="hint">Нажмите «+», чтобы добавить категории в этот список.</p>
              ) : (
                <ul
                  ref={listRef}
                  className={
                    draggingKey
                      ? 'category-edit-list category-edit-list--reordering'
                      : 'category-edit-list'
                  }
                >
                  {displayedCategories.map((category) => (
                    <li
                      key={category.id}
                      data-category-id={category.id}
                      className={[
                        'category-edit-row',
                        custom ? 'category-edit-row--tile' : '',
                        draggingKey === category.id ? 'category-edit-row--dragging' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onPointerDown={
                        custom
                          ? (event) => onCategoryPointerDown(event, category.id)
                          : undefined
                      }
                      onContextMenu={custom ? (event) => event.preventDefault() : undefined}
                    >
                      {custom ? (
                        <span className="store-handle" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="category-mark-button"
                        aria-label={`Цвет и значок категории ${categoryName(category, store)}`}
                        onClick={() => guardedClick(() => setStyling(category))}
                      >
                        <CategoryMark category={category} />
                      </button>
                      <button
                        type="button"
                        className={`input category-name-input${isLocalToStore(category, store) ? ' category-name-input--custom' : ''}`}
                        aria-label={`Тип категории ${categoryName(category, store)}`}
                        onClick={() => guardedClick(() => setEditingScope(category))}
                      >
                        {names[category.id] ?? categoryName(category, store)}
                      </button>
                      <button
                        type="button"
                        className="qty-button"
                        aria-label={`Убрать категорию ${categoryName(category, store)}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation()
                          guardedClick(() => setRemoving(category))
                        }}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {otherStores.length > 0 ? (
                <div className="choice-row" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setCopyMode('from')}
                  >
                    Скопировать из другого списка
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setCopyMode('to')}
                  >
                    Скопировать в другой список
                  </button>
                </div>
              ) : null}
            </section>
          </>
        )}

        {section === 'templates' && (
          <section className="settings-block">
            {(store.templates ?? []).length === 0 ? (
              <p className="hint">Пока нет шаблонов</p>
            ) : (
              <ul className="template-list">
                {(store.templates ?? []).map((template) => (
                  <li key={template.id} className="template-row">
                    <input
                      className="input category-name-input"
                      defaultValue={template.name}
                      aria-label={`Название шаблона ${template.name}`}
                      onBlur={(event) => {
                        const next = event.target.value.trim()
                        if (!next) {
                          event.target.value = template.name
                          return
                        }
                        onRenameTemplate(template.id, next)
                      }}
                    />
                    <button
                      type="button"
                      className="button-secondary template-action"
                      onClick={() => onApplyTemplate(template.id)}
                    >
                      Заполнить
                    </button>
                    <button
                      type="button"
                      className="qty-button"
                      aria-label={`Удалить шаблон ${template.name}`}
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="button-secondary add-category"
              onClick={() => setNamingTemplate(true)}
            >
              Сохранить текущий список
            </button>
          </section>
        )}

        {section === 'transfer' && (
          <section className="settings-block">
            {otherStores.length === 0 ? (
              <p className="hint">
                Добавьте ещё один магазин на главном экране — тогда можно будет
                скопировать или перенести товары.
              </p>
            ) : (
              <button
                type="button"
                className="button-secondary add-category"
                onClick={() => setTransferring(true)}
              >
                Перенести в другой список
              </button>
            )}
          </section>
        )}
      </main>

      {picking && (
        <AddListCategoryDialog
          categories={unusedCategories}
          onClose={() => setPicking(false)}
          onPick={(categoryIds) => {
            onEnableCategory(categoryIds)
            setPicking(false)
          }}
          onCreate={() => {
            setPicking(false)
            setAdding(true)
          }}
        />
      )}
      {adding && (
        <NewCategoryDialog
          showScopeToggle
          onClose={() => setAdding(false)}
          onAdd={(name, color, icon, global) => {
            onAddCategory(name, color, icon, global)
            setAdding(false)
          }}
        />
      )}
      {editingScope && (
        <CategoryScopeDialog
          category={editingScope}
          displayName={names[editingScope.id] ?? categoryName(editingScope, store)}
          isLocal={isLocalToStore(editingScope, store)}
          onClose={() => setEditingScope(null)}
          onSave={(name, global) => {
            onSetScope(editingScope.id, name, global)
            setNames((current) => ({ ...current, [editingScope.id]: name }))
            setEditingScope(null)
          }}
        />
      )}
      {styling && (
        <CategoryStyleDialog
          category={styling}
          onClose={() => setStyling(null)}
          onSave={(color, icon) => {
            onStyleCategory(styling.id, color, icon)
            setStyling(null)
          }}
        />
      )}
      {namingTemplate && (
        <NameDialog
          title="Новый шаблон"
          label="Название"
          placeholder="Например, На неделю"
          initial={`Шаблон ${(store.templates?.length ?? 0) + 1}`}
          confirmLabel="Сохранить"
          onClose={() => setNamingTemplate(false)}
          onConfirm={(name) => {
            onSaveTemplate(name)
            setNamingTemplate(false)
          }}
        />
      )}
      {transferring && (
        <TransferDialog
          stores={otherStores}
          activeCount={activeCount}
          onClose={() => setTransferring(false)}
          onCopy={(storeId) => {
            onCopyToStore(storeId)
            setTransferring(false)
          }}
          onMove={(storeId) => {
            onMoveToStore(storeId)
            setTransferring(false)
          }}
        />
      )}
      {copyMode && (
        <CopyCategoriesDialog
          mode={copyMode}
          stores={otherStores}
          onClose={() => setCopyMode(null)}
          onCopy={(otherStoreId) => {
            if (copyMode === 'from') onCopyCategoriesFrom(otherStoreId)
            else onCopyCategoriesTo(otherStoreId)
            setCopyMode(null)
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Убрать категорию?"
          text={removeCategoryText(removing, store, items)}
          confirmLabel="Убрать"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            onRemoveCategory(removing.id)
            setRemoving(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Удалить список?"
          text={`«${store.name}» и все его товары будут удалены.`}
          confirmLabel="Удалить"
          onClose={() => setDeleting(false)}
          onConfirm={onDeleteStore}
        />
      )}
    </div>
  )
}
