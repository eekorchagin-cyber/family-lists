import { lastUnit } from './qty'
import type { ParsedItem } from '../types'

const QUANTITY_PATTERN = /^(.*?)\s*:\s*(\d+(?:[.,]\d+)?)\s*(.*)$/

export function parseItem(input: string): ParsedItem | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = QUANTITY_PATTERN.exec(trimmed)
  if (!match) {
    return { name: trimmed, qty: 1, unit: lastUnit() }
  }

  const name = match[1].trim()
  if (!name) return null

  const typedUnit = match[3].trim()
  const unit = typedUnit || lastUnit()
  const unitGiven = Boolean(typedUnit)
  const qty = Number(match[2].replace(',', '.'))
  if (!Number.isFinite(qty) || qty <= 0) {
    return { name, qty: 1, unit, unitGiven }
  }

  return { name, qty, unit, unitGiven }
}
