import { useMemo, useState, type FormEvent } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { DoneButton } from '../components/DoneButton'
import { Header } from '../components/Header'
import { BackIcon } from '../components/NavIcons'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { globalCategories } from '../data/catalog'
import { DEFAULT_CATEGORIES } from '../data/defaults'
import type { Category } from '../types'

type NewStoreScreenProps = {
  categories: Category[]
  onBack: () => void
  onAdd: (name: string, categoryIds: string[]) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
}

function categoriesForNewStore(categories: Category[]): Category[] {
  const globals = globalCategories(categories)
  const defaultIds = DEFAULT_CATEGORIES.map((category) => category.id)
  const head: Category[] = []
  for (const id of defaultIds) {
    const found = globals.find((category) => category.id === id)
    if (found) head.push(found)
  }
  const rest = globals
    .filter((category) => !defaultIds.includes(category.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return [...head, ...rest]
}

function defaultSelectedIds(categories: Category[]): string[] {
  const known = new Set(globalCategories(categories).map((category) => category.id))
  return DEFAULT_CATEGORIES.map((category) => category.id).filter((id) => known.has(id))
}

export function NewStoreScreen({
  categories,
  onBack,
  onAdd,
  onAddCategory,
}: NewStoreScreenProps) {
  const options = useMemo(() => categoriesForNewStore(categories), [categories])
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelectedIds(categories)),
  )
  const [addingCategory, setAddingCategory] = useState(false)

  function toggle(categoryId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const categoryIds = options
      .filter((category) => selected.has(category.id))
      .map((category) => category.id)
    onAdd(trimmed, categoryIds)
  }

  return (
    <form className="screen" onSubmit={submit}>
      <Header
        title="Новый список"
        left={
          <button type="button" className="icon-button" onClick={onBack} aria-label="Назад">
            <BackIcon />
          </button>
        }
        right={<DoneButton type="submit" disabled={!name.trim()} />}
      />
      <div className="add-scroll">
        <label className="field-label" htmlFor="store-name">
          Название магазина
        </label>
        <input
          id="store-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, Пятёрочка"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
        />
        <p className="hint">
          Отметьте отделы этого магазина. Товары из справочника попадут в категорию сами, только
          если она отмечена здесь.
        </p>
        <p className="field-label">Категории</p>
        <ul className="category-list">
          {options.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={['category-chip', selected.has(category.id) ? 'active' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={selected.has(category.id)}
                onClick={() => toggle(category.id)}
              >
                <CategoryMark category={category} />
                {category.name}
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
          onAdd={(categoryName, color, icon) => {
            const id = onAddCategory(categoryName, color, icon)
            if (id) {
              setSelected((current) => {
                const next = new Set(current)
                next.add(id)
                return next
              })
            }
            setAddingCategory(false)
          }}
        />
      )}
    </form>
  )
}
