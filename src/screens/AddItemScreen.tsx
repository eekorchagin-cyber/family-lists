import { useMemo, useState, type FormEvent } from 'react'
import { DoneButton } from '../components/DoneButton'
import { CategoryMark } from '../components/CategoryMark'
import { Header } from '../components/Header'
import { BackIcon } from '../components/NavIcons'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { categoryName, isLocalToStore } from '../data/categories'
import { catalogCategoryId } from '../data/catalog'
import { playConfirmSound } from '../data/sounds'
import { formatQty, lastUnit, parseQty, rememberUnit } from '../data/qty'
import type { CatalogEntry, Category, Item, ParsedItem, Store } from '../types'

type AddItemScreenProps = {
  store: Store
  draft: ParsedItem
  categories: Category[]
  knownCategories: Category[]
  catalog: CatalogEntry[]
  items: Item[]
  onBack: () => void
  onAdd: (name: string, categoryId: string, qty: number, unit: string) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
}

export function AddItemScreen({
  store,
  draft,
  categories,
  knownCategories,
  catalog,
  items,
  onBack,
  onAdd,
  onAddCategory,
}: AddItemScreenProps) {
  const suggestion = useMemo(() => {
    const knownIds = knownCategories.map((category) => category.id)
    const fromCatalog = catalogCategoryId(catalog, draft.name, knownIds, store)
    if (fromCatalog) return { id: fromCatalog, known: true }
    const found = [...items]
      .reverse()
      .find((item) => item.name.toLowerCase() === draft.name.toLowerCase())
    if (found && knownIds.includes(found.categoryId)) {
      return { id: found.categoryId, known: true }
    }
    return {
      id: categories[0]?.id ?? knownCategories[0]?.id ?? '',
      known: false,
    }
  }, [catalog, categories, knownCategories, draft.name, items, store])

  const [categoryId, setCategoryId] = useState(suggestion.id)
  const [pickingCategory, setPickingCategory] = useState(!suggestion.known)
  const [categoryQuery, setCategoryQuery] = useState('')
  const [qtyText, setQtyText] = useState(formatQty(draft.qty))
  const [unit, setUnit] = useState(draft.unit)
  const [addingCategory, setAddingCategory] = useState(false)

  const selectedCategory = useMemo(
    () =>
      knownCategories.find((category) => category.id === categoryId) ??
      categories.find((category) => category.id === categoryId),
    [categories, categoryId, knownCategories],
  )

  const picker = useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase().replace(/ё/g, 'е')
    if (needle) {
      return knownCategories
        .filter((category) =>
          categoryName(category, store).toLowerCase().replace(/ё/g, 'е').includes(needle),
        )
        .sort((a, b) => categoryName(a, store).localeCompare(categoryName(b, store), 'ru'))
    }
    const seen = new Set(categories.map((category) => category.id))
    const extra = knownCategories.find(
      (category) => category.id === categoryId && !seen.has(category.id),
    )
    return extra ? [extra, ...categories] : categories
  }, [categories, categoryId, categoryQuery, knownCategories, store])

  const qty = parseQty(qtyText)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!categoryId || qty === null) return
    playConfirmSound('add')
    const nextUnit = unit.trim() || lastUnit()
    rememberUnit(nextUnit)
    onAdd(draft.name, categoryId, qty, nextUnit)
  }

  return (
    <form className="screen" onSubmit={submit}>
      <Header
        title={store.name}
        left={
          <button type="button" className="icon-button" onClick={onBack} aria-label="Назад">
            <BackIcon />
          </button>
        }
      />

      <div className="add-scroll">
        <div className="product-head">
          <h2 className="product-title">{draft.name}</h2>
          <DoneButton type="submit" disabled={!categoryId || qty === null} />
        </div>

        <label className="field-label" htmlFor="qty">
          Количество
        </label>
        <QtyRow
          qtyText={qtyText}
          unit={unit}
          onQtyText={setQtyText}
          onUnit={setUnit}
          onCommit={() => {
            if (qty === null) setQtyText(formatQty(draft.qty))
            else setQtyText(formatQty(qty))
          }}
        />

        <p className="field-label">Категория</p>
        {!pickingCategory && selectedCategory ? (
          <div className="category-chosen">
            <button
              type="button"
              className={[
                'category-chip',
                'active',
                isLocalToStore(selectedCategory, store) ? 'category-chip--local' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setPickingCategory(true)}
            >
              <CategoryMark category={selectedCategory} />
              <span className="category-chip-name">
                {categoryName(selectedCategory, store)}
              </span>
            </button>
            <button
              type="button"
              className="category-change"
              onClick={() => setPickingCategory(true)}
            >
              Изменить
            </button>
          </div>
        ) : (
          <>
            <div className="category-picker">
              <input
                className="input category-search"
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                placeholder="Поиск категории"
                aria-label="Поиск категории"
                autoComplete="off"
              />
              {picker.length === 0 ? (
                <p className="hint">Нет такой категории</p>
              ) : (
                <ul className="category-list">
                  {picker.map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        className={[
                          'category-chip',
                          categoryId === category.id ? 'active' : '',
                          isLocalToStore(category, store) ? 'category-chip--local' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          setCategoryId(category.id)
                          if (suggestion.known) setPickingCategory(false)
                        }}
                      >
                        <CategoryMark category={category} />
                        {categoryName(category, store)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              className="button-secondary add-category"
              onClick={() => setAddingCategory(true)}
            >
              Новая категория
            </button>
          </>
        )}
      </div>

      {addingCategory && (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (id) {
              setCategoryId(id)
              if (suggestion.known) setPickingCategory(false)
            }
            setAddingCategory(false)
          }}
        />
      )}
    </form>
  )
}
