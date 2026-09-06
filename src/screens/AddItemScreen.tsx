import { useMemo, useState, type FormEvent } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { Header } from '../components/Header'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { categoryName } from '../data/categories'
import { catalogCategoryId } from '../data/catalog'
import { formatQty, parseQty } from '../data/qty'
import type { CatalogEntry, Category, Item, ParsedItem, Store } from '../types'

type AddItemScreenProps = {
  store: Store
  draft: ParsedItem
  categories: Category[]
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
  catalog,
  items,
  onBack,
  onAdd,
  onAddCategory,
}: AddItemScreenProps) {
  const suggestedCategory = useMemo(() => {
    const fromCatalog = catalogCategoryId(
      catalog,
      draft.name,
      categories.map((category) => category.id),
    )
    if (fromCatalog) return fromCatalog
    const found = [...items]
      .reverse()
      .find((item) => item.name.toLowerCase() === draft.name.toLowerCase())
    if (found && categories.some((category) => category.id === found.categoryId)) {
      return found.categoryId
    }
    return categories[0]?.id ?? ''
  }, [catalog, categories, draft.name, items])

  const [categoryId, setCategoryId] = useState(suggestedCategory)
  const [qtyText, setQtyText] = useState(formatQty(draft.qty))
  const [unit, setUnit] = useState(draft.unit)
  const [addingCategory, setAddingCategory] = useState(false)

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
            ←
          </button>
        }
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
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={[
                  'category-chip',
                  categoryId === category.id ? 'active' : '',
                  (category.storeId === store.id || store.categoryNames?.[category.id]) ? 'category-chip--local' : '',
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

      <div className="add-footer">
        <button type="submit" className="button-primary add-submit" disabled={!categoryId || qty === null}>
          Добавить
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
