import type { Category, NamedTemplate, Store, TemplateItem } from '../types'
import { knownCategoriesForStore } from './categories'

export type SharedTemplate = {
  storeId: string
  storeName: string
  template: NamedTemplate
}

export function sharedTemplates(stores: Store[]): SharedTemplate[] {
  const rows: SharedTemplate[] = []
  for (const store of stores) {
    for (const template of store.templates ?? []) {
      rows.push({ storeId: store.id, storeName: store.name, template })
    }
  }
  return rows
}

export function findSharedTemplate(
  stores: Store[],
  templateId: string,
): SharedTemplate | undefined {
  return sharedTemplates(stores).find((row) => row.template.id === templateId)
}

export function mapTemplateCategoryId(
  entry: TemplateItem,
  store: Store,
  categories: Category[],
): string {
  const known = knownCategoriesForStore(categories, store.id)
  if (known.some((category) => category.id === entry.categoryId)) return entry.categoryId
  const source = categories.find((category) => category.id === entry.categoryId)
  if (!source) return known[0]?.id ?? entry.categoryId
  const byName = known.find(
    (category) => category.name.trim().toLowerCase() === source.name.trim().toLowerCase(),
  )
  return byName?.id ?? known[0]?.id ?? entry.categoryId
}
