import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { Header } from '../components/Header'
import { LongPressButton } from '../components/LongPressButton'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { BackIcon, SettingsIcon, TransferIcon } from '../components/NavIcons'
import { TransferDialog } from '../components/TransferDialog'
import { categoryName, isLocalToStore } from '../data/categories'
import { parseItem } from '../data/parseItem'
import { formatQty, parseQty } from '../data/qty'
import type { HomeMember } from '../data/sync/session'
import type { Category, Item, ParsedItem, Store } from '../types'

type StoreScreenProps = {
  store: Store
  items: Item[]
  categories: Category[]
  allNames: string[]
  onBack: () => void
  onOpenSettings: () => void
  onRenameStore: (name: string) => void
  onMarkBought: (itemId: string) => void
  onUnmarkBought: (itemId: string) => void
  onChangeCategory: (itemId: string, categoryId: string) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
  onStartAdd: (draft: ParsedItem) => void
  onUpdateItem: (itemId: string, patch: Partial<Pick<Item, 'qty' | 'unit' | 'categoryId'>>) => void
  onClearBought: () => void
  completedEmpty?: boolean
  onSaveTemplate: (name: string) => void
  members?: HomeMember[]
  myId?: string
  thisListUpdated?: boolean
  onDismissStoreUpdate?: () => void
  otherStores?: Store[]
  onCopyToStore?: (storeId: string) => void
  onMoveToStore?: (storeId: string) => void
}

export function StoreScreen({
  store,
  items,
  categories,
  allNames,
  onBack,
  onOpenSettings,
  onRenameStore,
  onMarkBought,
  onUnmarkBought,
  onChangeCategory,
  onAddCategory,
  onStartAdd,
  onUpdateItem,
  onClearBought,
  completedEmpty = false,
  onSaveTemplate,
  members = [],
  myId,
  thisListUpdated = false,
  onDismissStoreUpdate,
  otherStores = [],
  onCopyToStore,
  onMoveToStore,
}: StoreScreenProps) {
  const [query, setQuery] = useState('')
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [qtyText, setQtyText] = useState('1')
  const [unit, setUnit] = useState('шт')
  const [addingCategory, setAddingCategory] = useState(false)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [renamingStore, setRenamingStore] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const completionHandled = useRef(false)

  const activeItems = useMemo(
    () => items.filter((item) => !item.bought),
    [items],
  )
  const boughtItems = useMemo(
    () => items.filter((item) => item.bought),
    [items],
  )
  const allDone = items.length > 0 && activeItems.length === 0

  useEffect(() => {
    if (activeItems.length > 0) completionHandled.current = false
    if (!allDone) {
      setShowCompletion(false)
      return
    }
    if (!completionHandled.current) setShowCompletion(true)
  }, [allDone, activeItems.length])

  function dismissCompletion() {
    completionHandled.current = true
    setShowCompletion(false)
  }

  const grouped = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        items: activeItems.filter((item) => item.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0)
  }, [categories, activeItems])

  const unmatched = activeItems.filter(
    (item) => !categories.some((category) => category.id === item.categoryId),
  )

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    return allNames
      .filter((name) => name.toLowerCase().includes(needle))
      .slice(0, 8)
  }, [allNames, query])

  function openEdit(item: Item) {
    setEditItem(item)
    setQtyText(formatQty(item.qty))
    setUnit(item.unit)
  }

  function commitQty() {
    if (!editItem) return
    const qty = parseQty(qtyText)
    if (qty === null) {
      setQtyText(formatQty(editItem.qty))
      setUnit(editItem.unit)
      return
    }
    onUpdateItem(editItem.id, { qty, unit: unit.trim() || 'шт' })
  }

  function closeEdit() {
    commitQty()
    setEditItem(null)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const draft = parseItem(query)
    if (!draft) return
    onStartAdd(draft)
    setQuery('')
  }

  return (
    <div className="screen">
      <Header
        title={store.name}
        updated={thisListUpdated}
        onTitleLongPress={() => setRenamingStore(true)}
        help="Введите товар и нажмите «Далее». Можно сразу указать количество, например: Молоко: 2 шт. Нажмите товар, чтобы отметить купленным; нажмите купленный ещё раз, чтобы вернуть. Стрелки вверху — скопировать или перенести некупленные в другой список."
        left={
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              onDismissStoreUpdate?.()
              onBack()
            }}
            aria-label="К списку магазинов"
          >
            <BackIcon />
          </button>
        }
        right={
          <>
            {otherStores.length > 0 ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Перенести некупленные в другой список"
                onClick={() => setTransferring(true)}
              >
                <TransferIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="icon-button"
              aria-label="Настройки списка"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
            </button>
          </>
        }
      />

      <main className="content">
        <div className="search-panel">
          <form className="search-form" onSubmit={submitSearch}>
            <input
              className="input search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название товара"
              aria-label="Поиск товара"
              autoComplete="off"
            />
            <button type="submit" className="search-submit" disabled={!query.trim()}>
              Далее
            </button>
          </form>
        </div>

        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="suggestion"
                  onClick={() => {
                    const draft = parseItem(query)
                    onStartAdd({
                      name,
                      qty: draft?.qty ?? 1,
                      unit: draft?.unit ?? 'шт',
                    })
                    setQuery('')
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          <div className="empty empty-store">
            {completedEmpty ? (
              <>
                <p className="empty-complete">Все исполнено</p>
                <p className="empty-thumb" aria-hidden="true">
                  👍
                </p>
              </>
            ) : null}
            <p>Список пуст</p>
          </div>
        ) : (
          <div className="groups">
            {grouped.map(({ category, items: categoryItems }) => (
              <section key={category.id} className="group">
                <h2 className={`group-title${isLocalToStore(category, store) ? ' group-title--local' : ''}`}>
                  <CategoryMark category={category} />
                  {categoryName(category, store)}
                </h2>
                <ul className="item-list">
                  {categoryItems.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row"
                        onClick={() => onMarkBought(item.id)}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {unmatched.length > 0 && (
              <section className="group">
                <h2 className="group-title">
                  <CategoryMark
                    category={{ name: 'Другое', color: '#6b7280', icon: 'other' }}
                  />
                  Другое
                </h2>
                <ul className="item-list">
                  {unmatched.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row"
                        onClick={() => onMarkBought(item.id)}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {boughtItems.length > 0 && (
              <section className="group">
                <h2 className="group-title">Купленные</h2>
                <ul className="item-list">
                  {boughtItems.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row bought"
                        onClick={() => onUnmarkBought(item.id)}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      {editItem && !addingCategory && (
        <div className="overlay" role="presentation" onClick={closeEdit}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{editItem.name}</h2>
            <p className="field-label">Количество</p>
            <QtyRow
              qtyText={qtyText}
              unit={unit}
              onQtyText={setQtyText}
              onUnit={setUnit}
              onCommit={commitQty}
            />
            <p className="field-label">Категория</p>
            <ul className="category-list sheet-list">
              {categories.map((category) => {
                const current = items.find((item) => item.id === editItem.id) ?? editItem
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      className={
                        current.categoryId === category.id
                          ? 'category-chip active'
                          : 'category-chip'
                      }
                      onClick={() => onChangeCategory(editItem.id, category.id)}
                    >
                      <CategoryMark category={category} />
                      {categoryName(category, store)}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="button-secondary sheet-extra"
              onClick={() => setAddingCategory(true)}
            >
              Новая категория
            </button>
            <button type="button" className="button-primary sheet-extra" onClick={closeEdit}>
              Готово
            </button>
          </div>
        </div>
      )}

      {addingCategory && (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (editItem && id) onChangeCategory(editItem.id, id)
            setAddingCategory(false)
          }}
        />
      )}

      {showCompletion && allDone && !editItem && !addingCategory && !namingTemplate && (
        <div className="overlay" role="presentation">
          <div className="dialog">
            <h2>Все товары куплены</h2>
            <p className="hint">Что сделать со списком?</p>
            <div className="choice-row">
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  dismissCompletion()
                  onClearBought()
                }}
              >
                Стереть исполненное
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => dismissCompletion()}
              >
                Оставить список
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setNamingTemplate(true)}
              >
                Сохранить как шаблон
              </button>
            </div>
          </div>
        </div>
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
            dismissCompletion()
          }}
        />
      )}
      {renamingStore && (
        <NameDialog
          title="Название списка"
          label="Название"
          initial={store.name}
          confirmLabel="Сохранить"
          onClose={() => setRenamingStore(false)}
          onConfirm={(name) => {
            onRenameStore(name)
            setRenamingStore(false)
          }}
        />
      )}
      {transferring && onCopyToStore && onMoveToStore && (
        <TransferDialog
          stores={otherStores}
          activeCount={activeItems.length}
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
    </div>
  )
}

function ItemMeta({
  item,
  members,
  myId,
}: {
  item: Item
  members: HomeMember[]
  myId?: string
}) {
  if (members.length === 0) return null
  const nameOf = (id?: string) => members.find((member) => member.id === id)?.displayName
  let text: string | null = null
  if (item.bought) {
    const name = nameOf(item.boughtBy)
    if (name) text = `куплено · ${name}`
  }
  if (!text) {
    const name = nameOf(item.addedBy)
    if (name && (members.length > 1 || item.addedBy !== myId)) {
      text = `добавлено · ${name}`
    }
  }
  if (!text) return null
  return <span className="item-meta">{text}</span>
}
