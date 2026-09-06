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
