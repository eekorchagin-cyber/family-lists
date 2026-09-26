import type { LoyaltyCard, LoyaltyKind, Store, StoreGroup } from '../types'

export const LOYALTY_KEY = '__lc'

export function parseLoyaltyCard(value: unknown): LoyaltyCard | undefined {
  if (!value || typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const kind = row.kind
  const text = typeof row.value === 'string' ? row.value.trim() : ''
  if ((kind !== 'barcode' && kind !== 'qr' && kind !== 'app') || !text) return undefined
  return {
    kind,
    value: text,
    ...(typeof row.format === 'string' && row.format.trim()
      ? { format: row.format.trim() }
      : {}),
    ...(typeof row.label === 'string' && row.label.trim() ? { label: row.label.trim() } : {}),
  }
}

export function parseLoyaltyCardJson(raw: string | undefined): LoyaltyCard | undefined {
  if (!raw?.trim()) return undefined
  try {
    return parseLoyaltyCard(JSON.parse(raw) as unknown)
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
  return { ...clean, [LOYALTY_KEY]: JSON.stringify(card) }
}

export function resolveLoyaltyCard(
  store: Store,
  groups: StoreGroup[],
): { card: LoyaltyCard; source: 'store' | 'group' } | null {
  if (store.loyaltyCard?.value.trim()) {
    return { card: store.loyaltyCard, source: 'store' }
  }
  if (!store.groupId) return null
  const group = groups.find((item) => item.id === store.groupId)
  if (group?.loyaltyCard?.value.trim()) {
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
  return /^https?:\/\//i.test(value.trim())
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
