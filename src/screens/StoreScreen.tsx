import { useMemo, useState, type FormEvent } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { Header } from '../components/Header'
import { LongPressButton } from '../components/LongPressButton'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { SettingsIcon } from '../components/SettingsIcon'
import { categoryName } from '../data/categories'
import { parseItem } from '../data/parseItem'
import { formatQty, parseQty } from '../data/qty'
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
  onSaveTemplate: (name: string) => void
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
  onSaveTemplate,
}: StoreScreenProps) {
  const [query, setQuery] = useState('')
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [qtyText, setQtyText] = useState('1')
  const [unit, setUnit] = useState('шт')
  const [addingCategory, setAddingCategory] = useState(false)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [renamingStore, setRenamingStore] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const activeItems = useMemo(
    () => items.filter((item) => !item.bought),
    [items],
  )
  const boughtItems = useMemo(
    () => items.filter((item) => item.bought),
    [items],
  )
  const allDone = items.length > 0 && activeItems.length === 0
  const [wasAllDone, setWasAllDone] = useState(allDone)
  if (allDone !== wasAllDone) {
    setWasAllDone(allDone)
    setShowCompletion(allDone)
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
        onTitleLongPress={() => setRenamingStore(true)}
        left={
          <button type="button" className="icon-button" onClick={onBack} aria-label="К списку магазинов">
            ←
          </button>
        }
        right={
          <button
            type="button"
            className="icon-button"
            aria-label="Настройки списка"
            onClick={onOpenSettings}
          >
            <SettingsIcon />
          </button>
        }
      />

      <main className="content">
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
        <p className="hint">Введите, например, Молоко: 2 шт</p>

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
          <p className="empty">Список пуст</p>
        ) : (
          <div className="groups">
            {grouped.map(({ category, items: categoryItems }) => (
              <section key={category.id} className="group">
                <h2 className={`group-title${(category.storeId === store.id || store.categoryNames?.[category.id]) ? ' group-title--local' : ''}`}>
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
                        <span className="item-name">{item.name}</span>
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
                        <span className="item-name">{item.name}</span>
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
                        onClick={() => undefined}
                        onLongPress={() => onUnmarkBought(item.id)}
                      >
                        <span className="item-name">{item.name}</span>
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
                  onClearBought()
                  setShowCompletion(false)
                }}
              >
                Стереть купленные
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowCompletion(false)}
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
            setShowCompletion(false)
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
    </div>
  )
}
