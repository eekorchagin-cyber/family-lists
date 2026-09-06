export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PUBLIC_APP_URL = 'https://eekorchagin-cyber.github.io/family-lists'

export type CodeKind = 'invite' | 'pairing'

export function randomCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const byte of bytes) {
    const index = byte % CODE_ALPHABET.length
    code += CODE_ALPHABET[index] ?? 'A'
  }
  return code
}

export function inviteCode(): string {
  return `D-${randomCode(5)}`
}

export function deviceCode(): string {
  return `T-${randomCode(5)}`
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function formatCode(code: string): string {
  const raw = normalizeCode(code)
  if (raw.length < 2) return raw
  return `${raw[0]}-${raw.slice(1)}`
}

export function editCode(value: string): string {
  const raw = normalizeCode(value)
  if (!raw) return ''
  if (raw.length === 1) return `${raw}-`
  return `${raw[0]}-${raw.slice(1)}`
}

export function kindFromCode(code: string): CodeKind | null {
  const raw = normalizeCode(code)
  if (raw.length !== 6) return null
  if (raw.startsWith('D')) return 'invite'
  if (raw.startsWith('T')) return 'pairing'
  return null
}

export function randomPassword(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function localAuthEmail(userId: string): string {
  return `${userId.replaceAll('-', '')}@example.com`
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  )
}

export function publicBase(): string {
  if (typeof window === 'undefined') return PUBLIC_APP_URL
  if (isLocalHost(window.location.hostname)) return PUBLIC_APP_URL
  const path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '')
  return `${window.location.origin}${path}`
}

export function joinUrl(code: string): string {
  const encoded = encodeURIComponent(formatCode(code))
  return `${publicBase()}/?code=${encoded}#code=${encoded}`
}

export function pairUrl(code: string): string {
  return joinUrl(code)
}

function codeFromParam(value: string | null): string | null {
  const code = value?.trim().toUpperCase()
  return code || null
}

function parseCodeToken(source: string, key: string): string | null {
  const match = new RegExp(`(?:^|[?#&])${key}=([A-Za-z0-9-]+)`, 'i').exec(source)
  return codeFromParam(match?.[1] ?? null)
}

export function parseJoinHash(hash: string): string | null {
  return parseCodeToken(hash, 'join') ?? parseCodeToken(hash, 'code')
}

export function parsePairHash(hash: string): string | null {
  return parseCodeToken(hash, 'pair') ?? parseCodeToken(hash, 'code')
}

const JOIN_CODE_KEY = 'pokupki-join-code'

export function parseEnterCode(search = window.location.search, hash = window.location.hash): string | null {
  const params = new URLSearchParams(search)
  return (
    codeFromParam(params.get('code')) ??
    codeFromParam(params.get('join')) ??
    codeFromParam(params.get('pair')) ??
    parseCodeToken(hash, 'code') ??
    parseCodeToken(hash, 'join') ??
    parseCodeToken(hash, 'pair') ??
    parseCodeToken(search, 'code') ??
    parseCodeToken(search, 'join') ??
    parseCodeToken(search, 'pair')
  )
}

export function consumeEnterCode(): string | null {
  const fromUrl = parseEnterCode()
  let stored: string | null = null
  try {
    stored = sessionStorage.getItem(JOIN_CODE_KEY)
  } catch {
    stored = null
  }
  if (fromUrl) {
    try {
      sessionStorage.setItem(JOIN_CODE_KEY, fromUrl)
    } catch {
      /* ignore quota */
    }
    const params = new URLSearchParams(window.location.search)
    params.delete('join')
    params.delete('pair')
    params.delete('code')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }
  return fromUrl ?? stored
}

export function clearStoredEnterCode(): void {
  try {
    sessionStorage.removeItem(JOIN_CODE_KEY)
  } catch {
    /* ignore */
  }
}
