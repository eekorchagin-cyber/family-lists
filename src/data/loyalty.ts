import type { LoyaltyCard, LoyaltyKind, Store, StoreGroup } from '../types'

export const LOYALTY_KEY = '__lc'

export function asCategoryNames(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const names: Record<string, string> = {}
  for (const [key, name] of Object.entries(value as Record<string, unknown>)) {
    if (key === LOYALTY_KEY) {
      if (typeof name === 'string' && name.trim()) names[key] = name
      else if (name && typeof name === 'object') names[key] = JSON.stringify(name)
      continue
    }
    if (typeof name === 'string' && name.trim()) names[key] = name
  }
  return names
}

export function parseLoyaltyCard(value: unknown): LoyaltyCard | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const kind = row.kind
  const text = typeof row.value === 'string' ? row.value.trim() : ''
  const image =
    typeof row.image === 'string' && row.image.startsWith('data:image') ? row.image : ''
  if (kind !== 'barcode' && kind !== 'qr' && kind !== 'app') return undefined
  if (!text && !image) return undefined
  if (kind === 'app' && !text) return undefined
  return {
    kind,
    value: text,
    ...(typeof row.format === 'string' && row.format.trim()
      ? { format: row.format.trim() }
      : {}),
    ...(typeof row.label === 'string' && row.label.trim() ? { label: row.label.trim() } : {}),
    ...(image ? { image } : {}),
  }
}

export function parseLoyaltyCardJson(raw: unknown): LoyaltyCard | undefined {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return parseLoyaltyCard(raw)
  if (typeof raw !== 'string') return undefined
  const text = raw.trim()
  if (!text) return undefined
  const payload = text.startsWith('lc:') ? text.slice(3) : text
  try {
    return parseLoyaltyCard(JSON.parse(payload) as unknown)
  } catch {
    return undefined
  }
}

export function stripLoyaltyMarker(names: Record<string, string>): {
  names: Record<string, string>
  card?: LoyaltyCard
} {
  const next: Record<string, string> = {}
  let card: LoyaltyCard | undefined
  for (const [key, value] of Object.entries(names)) {
    if (key === LOYALTY_KEY) {
      card = parseLoyaltyCardJson(value)
      continue
    }
    next[key] = value
  }
  return { names: next, ...(card ? { card } : {}) }
}

export function withLoyaltyMarker(
  names: Record<string, string>,
  card: LoyaltyCard | undefined,
): Record<string, string> {
  const { names: clean } = stripLoyaltyMarker(names)
  if (!card) return clean
  return { ...clean, [LOYALTY_KEY]: `lc:${JSON.stringify(card)}` }
}

export function hasLoyaltyCard(card: LoyaltyCard | undefined): boolean {
  if (!card) return false
  if (card.kind === 'app') return Boolean(card.value.trim())
  return Boolean(card.value.trim() || card.image)
}

export function resolveLoyaltyCard(
  store: Store,
  groups: StoreGroup[],
): { card: LoyaltyCard; source: 'store' | 'group' } | null {
  const fromNames = stripLoyaltyMarker(store.categoryNames ?? {}).card
  const own =
    (store.loyaltyCard && hasLoyaltyCard(store.loyaltyCard) ? store.loyaltyCard : undefined) ??
    (fromNames && hasLoyaltyCard(fromNames) ? fromNames : undefined)
  if (own) return { card: own, source: 'store' }
  if (!store.groupId) return null
  const group = groups.find((item) => item.id === store.groupId)
  if (group?.loyaltyCard && hasLoyaltyCard(group.loyaltyCard)) {
    return { card: group.loyaltyCard, source: 'group' }
  }
  return null
}

export function loyaltyKindFromFormat(format: string): LoyaltyKind {
  const needle = format.toLowerCase().replace(/_/g, '')
  if (needle.includes('qr') || needle.includes('datamatrix') || needle.includes('aztec')) {
    return 'qr'
  }
  return 'barcode'
}

export function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/|[a-z][a-z0-9+.-]*:\/\/)/i.test(value.trim())
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (image: ImageBitmapSource) => Promise<{ rawValue?: string; format?: string }[]>
}

export function canDetectBarcode(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

export async function detectCodeFromFile(
  file: File,
): Promise<{ value: string; format: string } | null> {
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  if (!Detector) return null
  const detector = new Detector({
    formats: [
      'qr_code',
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'itf',
      'codabar',
      'data_matrix',
    ],
  })
  const bitmap = await createImageBitmap(file)
  try {
    const codes = await detector.detect(bitmap)
    const first = codes.find((item) => item.rawValue?.trim())
    if (!first?.rawValue) return null
    return { value: first.rawValue.trim(), format: first.format ?? '' }
  } finally {
    bitmap.close()
  }
}

export async function fileToLoyaltyImage(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const max = 720
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return null
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    let quality = 0.72
    let data = canvas.toDataURL('image/jpeg', quality)
    while (data.length > 140_000 && quality > 0.4) {
      quality -= 0.1
      data = canvas.toDataURL('image/jpeg', quality)
    }
    if (data.length > 180_000) return null
    return data
  } catch {
    return null
  }
}
