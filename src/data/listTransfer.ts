import { categoriesForStore } from './categories'
import { sameRuText } from './text'
import type { Category, Item, Store } from '../types'

export type TransferPartition = {
  matching: { item: Item; targetCategoryId: string }[]
  leftover: Item[]
}

/** Категория товара подходит целевому списку (по id или по имени отдела). */
export function resolveTargetCategoryId(
  categoryId: string,
  target: Pick<Store, 'id' | 'categoryOrder'>,
  categories: Category[],
): string | undefined {
  const targetCats = categoriesForStore(categories, target)
  if (targetCats.some((category) => category.id === categoryId)) return categoryId
  const source = categories.find((category) => category.id === categoryId)
  if (!source) return undefined
  const byName = targetCats.find((category) => sameRuText(category.name, source.name))
  return byName?.id
}

export function partitionItemsForTransfer(
  items: Item[],
  target: Pick<Store, 'id' | 'categoryOrder'>,
  categories: Category[],
): TransferPartition {
  const matching: TransferPartition['matching'] = []
  const leftover: Item[] = []
  for (const item of items) {
    const targetCategoryId = resolveTargetCategoryId(item.categoryId, target, categories)
    if (targetCategoryId) matching.push({ item, targetCategoryId })
    else leftover.push(item)
  }
  return { matching, leftover }
}

export type TransferSummary = {
  transferredCount: number
  leftoverItems: Item[]
}
