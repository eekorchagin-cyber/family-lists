import { categoryGlyph } from '../data/categories'
import type { Category } from '../types'

type CategoryMarkProps = {
  category: Pick<Category, 'name' | 'color' | 'icon'>
  className?: string
}

export function CategoryMark({ category, className }: CategoryMarkProps) {
  return (
    <span
      className={className ? `category-mark ${className}` : 'category-mark'}
      style={category.color === 'none' ? { background: 'transparent', border: '1.5px dashed var(--border)' } : { background: category.color }}
      aria-hidden="true"
    >
      {categoryGlyph(category)}
    </span>
  )
}
