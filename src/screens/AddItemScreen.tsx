import { useMemo, useState, type FormEvent } from 'react'
import { DoneButton } from '../components/DoneButton'
import { CategoryMark } from '../components/CategoryMark'
import { Header } from '../components/Header'
import { BackIcon } from '../components/NavIcons'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { categoryName, isLocalToStore } from '../data/categories'
import { catalogCategoryId, findCatalogEntry } from '../data/catalog'
import { formatQty, parseQty } from '../data/qty'
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
  const suggestedCategory = useMemo(() => {
    const knownIds = knownCategories.map((category) => category.id)
    const fromCatalog = catalogCategoryId(catalog, draft.name, knownIds)
    if (fromCatalog) return fromCatalog
    const found = [...items]
      .reverse()
      .find((item) => item.name.toLowerCase() === draft.name.toLowerCase())
    if (found && knownIds.includes(found.categoryId)) return found.categoryId
    const entry = findCatalogEntry(catalog, draft.name)
    if (entry && knownIds.includes(entry.categoryId)) return entry.categoryId
    return categories[0]?.id ?? knownCategories[0]?.id ?? ''
  }, [catalog, categories, knownCategories, draft.name, items])

  const [categoryId, setCategoryId] = useState(suggestedCategory)
  const [qtyText, setQtyText] = useState(formatQty(draft.qty))
  const [unit, setUnit] = useState(draft.unit)
  const [addingCategory, setAddingCategory] = useState(false)

  const picker = useMemo(() => {
    const seen = new Set(categories.map((category) => category.id))
    const extra = knownCategories.find(
      (category) => category.id === categoryId && !seen.has(category.id),
    )
    return extra ? [extra, ...categories] : categories
  }, [categories, categoryId, knownCategories])

  const qty = parseQty(qtyText)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!categoryId || qty === null) return
    onAdd(draft.name, categoryId, qty, unit)
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
        right={<DoneButton type="submit" disabled={!categoryId || qty === null} />}
      />

      <div className="add-scroll">
        <h2 className="product-title">{draft.name}</h2>

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
        <ul className="category-list">
          {picker.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={[
                  'category-chip',
                  categoryId === category.id ? 'active' : '',
                  isLocalToStore(category, store) ? 'category-chip--local' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setCategoryId(category.id)}
              >
                <CategoryMark category={category} />
                {categoryName(category, store)}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="button-secondary add-category"
          onClick={() => setAddingCategory(true)}
        >
          Новая категория
        </button>
      </div>

      {addingCategory && (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (id) setCategoryId(id)
            setAddingCategory(false)
          }}
        />
      )}
    </form>
  )
}
