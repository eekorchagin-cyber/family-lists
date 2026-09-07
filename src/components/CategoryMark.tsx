import { categoryGlyph } from '../data/categories'
import type { Category } from '../types'
import { WestieIcon } from './WestieIcon'

type CategoryMarkProps = {
  category: Pick<Category, 'name' | 'color' | 'icon'>
  className?: string
}

export function CategoryMarkFace({
  category,
}: {
  category: Pick<Category, 'name' | 'icon'>
}) {
  if (category.icon === 'westie') return <WestieIcon />
  const glyph = categoryGlyph(category)
  if (glyph === '') return <WestieIcon />
  return glyph
}

export function CategoryMark({ category, className }: CategoryMarkProps) {
  return (
    <span
      className={className ? `category-mark ${className}` : 'category-mark'}
      style={category.color === 'none' ? { background: 'transparent', border: '1.5px dashed var(--border)' } : { background: category.color }}
      aria-hidden="true"
    >
      <CategoryMarkFace category={category} />
    </span>
  )
}
