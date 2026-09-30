export function parseQty(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return null
  const qty = Number(normalized)
  if (!Number.isFinite(qty) || qty <= 0) return null
  return qty
}

export function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty)
  return String(qty).replace('.', ',')
}

export function roundQty(value: number): number {
  return Math.round(value * 10) / 10
}

const LAST_UNIT_KEY = 'pokupki-last-unit'

export function lastUnit(): string {
  try {
    const value = localStorage.getItem(LAST_UNIT_KEY)?.trim()
    return value || 'шт'
  } catch {
    return 'шт'
  }
}

export function rememberUnit(unit: string): void {
  const value = unit.trim() || 'шт'
  try {
    localStorage.setItem(LAST_UNIT_KEY, value)
  } catch {
    // приватный режим
  }
}
