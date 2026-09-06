import type { ParsedItem } from '../types'

const QUANTITY_PATTERN = /^(.*?)\s*:\s*(\d+(?:[.,]\d+)?)\s*(.*)$/

export function parseItem(input: string): ParsedItem | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = QUANTITY_PATTERN.exec(trimmed)
  if (!match) {
    return { name: trimmed, qty: 1, unit: 'шт' }
  }

  const name = match[1].trim()
  if (!name) return null

  const qty = Number(match[2].replace(',', '.'))
  if (!Number.isFinite(qty) || qty <= 0) {
    return { name, qty: 1, unit: match[3].trim() || 'шт' }
  }

  return {
    name,
    qty,
    unit: match[3].trim() || 'шт',
  }
}
