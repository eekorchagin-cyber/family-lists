import { useMemo, useState } from 'react'
import { CategoryMark } from './CategoryMark'
import { DialogHeading } from './DialogHeading'
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
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/ё/g, 'е')
    if (!needle) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().replace(/ё/g, 'е').includes(needle),
    )
  }, [categories, query])

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
        <DialogHeading title="Добавить категорию" onClose={onClose} />
        {categories.length > 0 ? (
          <>
            <p className="hint">
              Общие категории, которых ещё нет в этом списке. Можно отметить несколько.
            </p>
            <div className="category-picker">
              <input
                className="input category-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск категории"
                aria-label="Поиск категории"
                autoComplete="off"
              />
              {filtered.length > 0 ? (
                <ul className="category-list sheet-list">
                  {filtered.map((category) => (
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
              ) : (
                <p className="hint">Нет категорий с таким названием.</p>
              )}
            </div>
          </>
        ) : (
          <p className="hint">Все общие категории уже есть в этом списке.</p>
        )}
        <button type="button" className="button-secondary sheet-extra" onClick={onCreate}>
          Новая категория
        </button>
        <div className="dialog-actions dialog-actions-single">
          <button
            type="button"
            className="button-primary"
            disabled={selected.size === 0}
            onClick={() =>
              onPick(categories.filter((category) => selected.has(category.id)).map((category) => category.id))
            }
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
