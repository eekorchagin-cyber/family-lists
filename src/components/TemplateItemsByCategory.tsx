import { formatQty } from '../data/qty'
import type { Category, TemplateItem } from '../types'

export function groupTemplateItemsByCategory(
  items: TemplateItem[],
  categories: Category[],
): {
  groups: { category: Category; rows: { item: TemplateItem; index: number }[] }[]
  unmatched: { item: TemplateItem; index: number }[]
} {
  const known = new Map(categories.map((category) => [category.id, category]))
  const buckets = new Map<string, { category: Category; rows: { item: TemplateItem; index: number }[] }>()
  const unmatched: { item: TemplateItem; index: number }[] = []

  items.forEach((item, index) => {
    const category = known.get(item.categoryId)
    if (!category) {
      unmatched.push({ item, index })
      return
    }
    const bucket = buckets.get(category.id)
    if (bucket) bucket.rows.push({ item, index })
    else buckets.set(category.id, { category, rows: [{ item, index }] })
  })

  const groups = categories.flatMap((category) => {
    const bucket = buckets.get(category.id)
    return bucket ? [bucket] : []
  })

  for (const bucket of buckets.values()) {
    if (!groups.some((group) => group.category.id === bucket.category.id)) {
      groups.push(bucket)
    }
  }

  return { groups, unmatched }
}

type TemplateItemsByCategoryProps = {
  items: TemplateItem[]
  categories: Category[]
  onRemove: (index: number) => void
}

export function TemplateItemsByCategory({
  items,
  categories,
  onRemove,
}: TemplateItemsByCategoryProps) {
  const { groups, unmatched } = groupTemplateItemsByCategory(items, categories)

  if (items.length === 0) return null

  return (
    <div className="template-pick-groups">
      {groups.map(({ category, rows }) => (
        <section key={category.id} className="template-pick-group">
          <h3 className="template-pick-heading">{category.name}</h3>
          <ul className="template-list template-list--nested">
            {rows.map(({ item, index }) => (
              <li key={`${category.id}-${index}`} className="template-row">
                <div className="template-copy">
                  <span>
                    {item.name}: {formatQty(item.qty)} {item.unit}
                  </span>
                </div>
                <button
                  type="button"
                  className="qty-button"
                  aria-label={`Убрать ${item.name}`}
                  onClick={() => onRemove(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {unmatched.length > 0 ? (
        <section className="template-pick-group">
          <h3 className="template-pick-heading">Без категории</h3>
          <ul className="template-list template-list--nested">
            {unmatched.map(({ item, index }) => (
              <li key={`loose-${index}`} className="template-row">
                <div className="template-copy">
                  <span>
                    {item.name}: {formatQty(item.qty)} {item.unit}
                  </span>
                </div>
                <button
                  type="button"
                  className="qty-button"
                  aria-label={`Убрать ${item.name}`}
                  onClick={() => onRemove(index)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
