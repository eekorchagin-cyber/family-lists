import { fileCategoryIcon, fileIconSrc } from '../data/categoryIconFiles'
import { categoryGlyph, displayIconId } from '../data/categories'
import { useIconStyle } from '../data/iconStyle'
import type { Category } from '../types'
import {
  CategorySpecialIcon,
  hasCategorySpecialIcon,
} from './CategorySpecialIcons'

type CategoryMarkProps = {
  category: Pick<Category, 'name' | 'color' | 'icon'>
  className?: string
}

function resolveIconId(category: Pick<Category, 'name' | 'icon'>, style?: 'contour' | 'color'): string {
  return displayIconId(category.name, category.icon, style)
}

export function CategoryMarkFace({
  category,
}: {
  category: Pick<Category, 'name' | 'icon'>
}) {
  const iconId = resolveIconId(category, useIconStyle())
  const fileIcon = fileCategoryIcon(iconId)
  if (fileIcon) {
    return <img src={fileIconSrc(fileIcon.file)} alt="" />
  }
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
