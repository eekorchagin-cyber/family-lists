import { CategoryMark } from './CategoryMark'
import type { Category } from '../types'

type AddListCategoryDialogProps = {
  categories: Category[]
  onClose: () => void
  onPick: (categoryId: string) => void
  onCreate: () => void
}

export function AddListCategoryDialog({
  categories,
  onClose,
  onPick,
  onCreate,
}: AddListCategoryDialogProps) {
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Добавить категорию</h2>
        {categories.length > 0 ? (
          <>
            <p className="hint">Общие категории, которых ещё нет в этом списке.</p>
            <ul className="category-list sheet-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className="category-chip"
                    onClick={() => onPick(category.id)}
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
        </div>
      </div>
    </div>
  )
}
