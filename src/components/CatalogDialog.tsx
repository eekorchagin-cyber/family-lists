import { useState, type KeyboardEvent } from 'react'
import { defaultCategoryId } from '../data/categories'
import { canAutofocus } from '../data/viewport'
import { CategoryMark } from './CategoryMark'
import { DialogHeading } from './DialogHeading'
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
  const knownCategory = Boolean(entry?.categoryId)
  const [name, setName] = useState(entry?.name ?? '')
  const [categoryId, setCategoryId] = useState(
    entry?.categoryId ?? categories[0]?.id ?? '',
  )
  const [pickingCategory, setPickingCategory] = useState(!knownCategory)
  const [addingCategory, setAddingCategory] = useState(false)
  const [error, setError] = useState('')

  const selectedCategory = categories.find((category) => category.id === categoryId)

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
          if (id) {
            setCategoryId(id)
            if (knownCategory) setPickingCategory(false)
          }
          setAddingCategory(false)
        }}
      />
    )
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading title={entry ? 'Товар' : 'Новый товар'} onClose={onClose} />
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
          autoFocus={canAutofocus()}
        />
        {error ? <p className="hint">{error}</p> : null}
        <p className="field-label">Категория</p>
        {!pickingCategory && selectedCategory ? (
          <div className="category-chosen">
            <button
              type="button"
              className={[
                'category-chip',
                'active',
                stores?.find((s) => s.id === selectedCategory.storeId)
                  ? 'category-chip--local'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setPickingCategory(true)}
            >
              <CategoryMark category={selectedCategory} />
              <span className="category-chip-name">{selectedCategory.name}</span>
              {stores?.find((s) => s.id === selectedCategory.storeId) ? (
                <span className="category-chip-store">
                  {stores.find((s) => s.id === selectedCategory.storeId)?.name}
                </span>
              ) : null}
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
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        setCategoryId(category.id)
                        if (knownCategory) setPickingCategory(false)
                      }}
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
          </>
        )}
        <div className="dialog-actions dialog-actions-single">
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
