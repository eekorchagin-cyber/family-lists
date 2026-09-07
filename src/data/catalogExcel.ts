import {
  catalogExportRows,
  type CatalogImportRow,
  type CatalogImportSummary,
} from './catalog'
import { xlsxBlob, xlsxToRows } from './xlsxTable'
import type { CatalogEntry, Category } from '../types'

const PRODUCT_HEADERS = new Set([
  'товар',
  'наименование',
  'название',
  'name',
  'product',
])
const CATEGORY_HEADERS = new Set(['категория', 'category'])

export function downloadCatalogXlsx(
  catalog: CatalogEntry[],
  categories: Category[],
): void {
  const rows = [
    ['Товар', 'Категория'],
    ...catalogExportRows(catalog, categories).map((row) => [row.name, row.category]),
  ]
  const blob = xlsxBlob(rows)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'наименования-товаров.xlsx'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function headerKind(value: string): 'product' | 'category' | null {
  const key = value.trim().toLowerCase()
  if (PRODUCT_HEADERS.has(key)) return 'product'
  if (CATEGORY_HEADERS.has(key)) return 'category'
  return null
}

export function rowsToCatalogImport(rows: string[][]): CatalogImportRow[] {
  if (rows.length === 0) return []
  const first = rows[0] ?? ['', '']
  const left = headerKind(first[0] ?? '')
  const right = headerKind(first[1] ?? '')
  const hasHeaders = left !== null || right !== null
  const productFirst = left !== 'category' && right !== 'product'
  const data = hasHeaders ? rows.slice(1) : rows
  return data
    .map((row) => {
      const a = (row[0] ?? '').trim()
      const b = (row[1] ?? '').trim()
      return productFirst ? { name: a, category: b } : { name: b, category: a }
    })
    .filter((row) => row.name || row.category)
}

export async function readCatalogXlsx(file: File): Promise<CatalogImportRow[]> {
  const buffer = new Uint8Array(await file.arrayBuffer())
  return rowsToCatalogImport(xlsxToRows(buffer))
}

export function importSummaryText(summary: Pick<
  CatalogImportSummary,
  'addedItems' | 'skippedItems' | 'addedCategories'
>): string {
  if (summary.addedItems === 0 && summary.addedCategories === 0 && summary.skippedItems === 0) {
    return 'В файле нет строк с товарами.'
  }
  const parts = [
    `Добавлено товаров: ${summary.addedItems}.`,
    `Новых категорий: ${summary.addedCategories}.`,
    `Пропущено (уже есть): ${summary.skippedItems}.`,
  ]
  return parts.join(' ')
}
