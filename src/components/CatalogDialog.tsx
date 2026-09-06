import { useState, type KeyboardEvent } from 'react'
import { CategoryMark } from './CategoryMark'
import { NewCategoryDialog } from './NewCategoryDialog'
import type { CatalogEntry, Category, Store } from '../types'

type CatalogDialogProps = {
  entry: CatalogEntry | null
  categories: Category[]
  stores?: Store[]
  onClose: () => void
  onSave: (name: string, categoryId: string) => boolean
  onAddCategory: (name: string, color: string, icon?: string) => string
}

export function CatalogDialog({
  entry,
  categories,
  stores,
  onClose,
  onSave,
  onAddCategory,
}: CatalogDialogProps) {
  const [name, setName] = useState(entry?.name ?? '')
  const [categoryId, setCategoryId] = useState(
    entry?.categoryId ?? categories[0]?.id ?? '',
  )
  const [addingCategory, setAddingCategory] = useState(false)
  const [error, setError] = useState('')

  function submit() {
    const trimmed = name.trim()
    if (!trimmed || !categoryId) return
    const saved = onSave(trimmed, categoryId)
    if (!saved) {
      setError('Такое название уже есть')
      return
    }
    onClose()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  if (addingCategory) {
    return (
      <NewCategoryDialog
        onClose={() => setAddingCategory(false)}
        onAdd={(categoryName, color, icon) => {
          const id = onAddCategory(categoryName, color, icon)
          if (id) setCategoryId(id)
          setAddingCategory(false)
        }}
      />
    )
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{entry ? 'Товар' : 'Новый товар'}</h2>
        <label className="field-label" htmlFor="catalog-name">
          Название
        </label>
        <input
          id="catalog-name"
          className="input"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          onKeyDown={onKeyDown}
          placeholder="Например, Молоко 3,2%"
          autoFocus
        />
        {error ? <p className="hint">{error}</p> : null}
        <p className="field-label">Категория</p>
        <ul className="category-list sheet-list">
          {categories.map((category) => {
            const ownerStore = stores?.find((s) => s.id === category.storeId)
            return (
              <li key={category.id}>
                <button
                  type="button"
                  className={[
                    'category-chip',
                    categoryId === category.id ? 'active' : '',
                    ownerStore ? 'category-chip--local' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setCategoryId(category.id)}
                >
                  <CategoryMark category={category} />
                  <span className="category-chip-name">{category.name}</span>
                  {ownerStore && (
                    <span className="category-chip-store">{ownerStore.name}</span>
                  )}
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
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={!name.trim() || !categoryId}
            onClick={submit}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
