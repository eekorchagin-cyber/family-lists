import { catalogCategoryId } from './catalog'
import { categoriesForStore, defaultCategoryId } from './categories'
import { foldRu, sameRuText } from './text'
import type { CatalogEntry, Category, Item, Store } from '../types'

export type ImportedLine = {
  name: string
  qty: number
  unit: string
  bought: boolean
  raw: string
}

const TRAILING_QTY =
  /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(пары|пар|шт|штуки|штук|кг|г|л|мл)?\s*$/i
const COLON_QTY = /^(.*?)\s*:\s*(\d+(?:[.,]\d+)?)\s*(.*)$/
const KEEP_IN_NAME = /\d+\s*на\s*\d+/i
/**
 * Символы до названия отбрасываем (−, *, [ ], 1., • и т.п.).
 * Отметку [x] / [ ] из этой «шапки» сохраняем как куплен/не куплен.
 * Важно: «x» внутри [x] не считается началом названия.
 */
export function stripLeadingSymbols(line: string): { body: string; bought: boolean } {
  let text = line.replace(/^\uFEFF/, '').trim()
  let bought = false
  while (text) {
    const check = /^\[([ \txX✓✗])\]\s*/.exec(text)
    if (check) {
      if (/[xX✓]/.test(check[1])) bought = true
      text = text.slice(check[0].length)
      continue
    }
    const mark = /^([-*•·▪◦]+|\d+[.)])\s*/.exec(text)
    if (mark) {
      text = text.slice(mark[0].length)
      continue
    }
    const junk = /^[^\p{L}\p{N}]+/u.exec(text)
    if (junk) {
      text = text.slice(junk[0].length)
      continue
    }
    break
  }
  return { body: text.trim(), bought }
}

/** Имя для сравнения: без пояснений в скобках и лишних пробелов. */
export function normalizeImportName(name: string): string {
  return foldRu(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Похожие названия: одинаковые после нормализации или одно включает другое (≥4 символа). */
export function similarImportName(left: string, right: string): boolean {
  const a = normalizeImportName(left)
  const b = normalizeImportName(right)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  return a.includes(b) || b.includes(a)
}

function parseQtyTail(text: string): { name: string; qty: number; unit: string } | null {
  const trimmed = text.trim()
  if (!trimmed || KEEP_IN_NAME.test(trimmed)) return null

  const colon = COLON_QTY.exec(trimmed)
  if (colon) {
    const name = colon[1].trim()
    if (!name) return null
    const qty = Number(colon[2].replace(',', '.'))
    if (!Number.isFinite(qty) || qty <= 0) return null
    return { name, qty, unit: colon[3].trim() || 'шт' }
  }

  const trail = TRAILING_QTY.exec(trimmed)
  if (!trail) return null
  const name = trail[1].trim()
  if (!name || KEEP_IN_NAME.test(name)) return null
  const qty = Number(trail[2].replace(',', '.'))
  if (!Number.isFinite(qty) || qty <= 0) return null
  const unitRaw = (trail[3] ?? '').trim().toLowerCase()
  let unit = 'шт'
  if (unitRaw === 'пары' || unitRaw === 'пар') unit = 'пар'
  else if (unitRaw === 'шт' || unitRaw === 'штуки' || unitRaw === 'штук') unit = 'шт'
  else if (unitRaw) unit = unitRaw
  return { name, qty, unit }
}

export function parseImportLine(rawLine: string): ImportedLine | null {
  const raw = rawLine.replace(/^\uFEFF/, '').trim()
  if (!raw) return null
  if (/^#{1,6}\s/.test(raw)) return null
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(raw)) return null

  const { body, bought } = stripLeadingSymbols(raw)
  if (!body) return null

  const qtyPart = parseQtyTail(body)
  if (qtyPart) {
    return { name: qtyPart.name, qty: qtyPart.qty, unit: qtyPart.unit, bought, raw }
  }
  return { name: body, qty: 1, unit: 'шт', bought, raw }
}

export function parseImportText(text: string): ImportedLine[] {
  const seen = new Set<string>()
  const result: ImportedLine[] = []
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseImportLine(line)
    if (!parsed) continue
    const key = normalizeImportName(parsed.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(parsed)
  }
  return result
}

export function otherCategoryId(
  categories: Category[],
  store: Pick<Store, 'id' | 'categoryOrder'>,
): string {
  const enabled = categoriesForStore(categories, store)
  const fromEnabled = defaultCategoryId(enabled, '')
  if (fromEnabled) return fromEnabled
  const global = categories.filter((category) => !category.storeId)
  return defaultCategoryId(global, 'filecat-13')
}

export function resolveImportCategoryId(
  name: string,
  store: Store,
  categories: Category[],
  catalog: CatalogEntry[],
): string {
  const known = categoriesForStore(categories, store).map((category) => category.id)
  const fromMemory = catalogCategoryId(catalog, name, known, store)
  if (fromMemory) return fromMemory
  return otherCategoryId(categories, store)
}

export function findSimilarItem(
  items: Item[],
  storeId: string,
  name: string,
): Item | undefined {
  return items.find(
    (item) => item.storeId === storeId && similarImportName(item.name, name),
  )
}
