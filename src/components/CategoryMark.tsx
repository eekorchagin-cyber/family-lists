import { categoryGlyph, iconIdFromName, isCategoryIconId } from '../data/categories'
import type { Category } from '../types'
import {
  CategorySpecialIcon,
  hasCategorySpecialIcon,
} from './CategorySpecialIcons'

type CategoryMarkProps = {
  category: Pick<Category, 'name' | 'color' | 'icon'>
  className?: string
}

function resolveIconId(category: Pick<Category, 'name' | 'icon'>): string {
  if (category.icon && isCategoryIconId(category.icon)) return category.icon
  return iconIdFromName(category.name)
}

export function CategoryMarkFace({
  category,
}: {
  category: Pick<Category, 'name' | 'icon'>
}) {
  const iconId = resolveIconId(category)
  if (hasCategorySpecialIcon(iconId)) {
    return <CategorySpecialIcon id={iconId} />
  }
  return categoryGlyph(category)
}

export function CategoryMark({ category, className }: CategoryMarkProps) {
  return (
    <span
      className={className ? `category-mark ${className}` : 'category-mark'}
      style={
        category.color === 'none'
          ? { background: 'transparent', border: '1.5px dashed var(--border)' }
          : { background: category.color }
      }
      aria-hidden="true"
    >
      <CategoryMarkFace category={category} />
    </span>
  )
}
