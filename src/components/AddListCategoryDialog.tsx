import { useState } from 'react'
import { CategoryMark } from './CategoryMark'
import type { Category } from '../types'

type AddListCategoryDialogProps = {
  categories: Category[]
  onClose: () => void
  onPick: (categoryIds: string[]) => void
  onCreate: () => void
}

export function AddListCategoryDialog({
  categories,
  onClose,
  onPick,
  onCreate,
}: AddListCategoryDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  function toggle(categoryId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Добавить категорию</h2>
        {categories.length > 0 ? (
          <>
            <p className="hint">
              Общие категории, которых ещё нет в этом списке. Можно отметить несколько.
            </p>
            <ul className="category-list sheet-list">
              {categories.map((category) => (
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
          </>
        ) : (
          <p className="hint">Все общие категории уже есть в этом списке.</p>
        )}
        <button type="button" className="button-secondary sheet-extra" onClick={onCreate}>
          Новая категория
        </button>
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={selected.size === 0}
            onClick={() =>
              onPick(categories.filter((category) => selected.has(category.id)).map((category) => category.id))
            }
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
