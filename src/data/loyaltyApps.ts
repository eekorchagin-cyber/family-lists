import { isAppleMobile } from './sync/codes'

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

function playPackage(value: string): string | null {
  const match = /play\.google\.com\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/.exec(value)
  if (match) return match[1]
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/i.test(value.trim())) return value.trim()
  return null
}

const ASCII_SCHEME = /^[a-z][a-z0-9+.-]*:/i

function looksLikeDomain(value: string): boolean {
  return /^(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:[/?#].*)?$/i.test(value)
}

export function shortcutOpenHref(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return `shortcuts://run-shortcut?name=${encodeURIComponent(trimmed)}`
}

export function parseShortcutName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const query = /^(?:shortcuts:\/\/run-shortcut\?)(.+)$/i.exec(trimmed)
  if (query) {
    try {
      return new URLSearchParams(query[1]).get('name')?.trim() ?? ''
    } catch {
      return ''
    }
  }
  return ''
}

export function isLatinShortcutName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9 ._-]{0,63}$/.test(value.trim())
}

export function loyaltyAppHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('intent:')) return trimmed
  const pkg = playPackage(trimmed)
  if (pkg && isAndroid()) {
    return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${pkg};end`
  }
  const shortcutName = parseShortcutName(trimmed)
  if (shortcutName) return shortcutOpenHref(shortcutName)
  if (isLatinShortcutName(trimmed)) return shortcutOpenHref(trimmed)
  if (ASCII_SCHEME.test(trimmed)) {
    if (/^[a-z][a-z0-9+.-]*:$/i.test(trimmed)) return `${trimmed}//`
    return trimmed
  }
  if (looksLikeDomain(trimmed)) return `https://${trimmed}`
  return ''
}

export function loyaltyAppError(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Введите латинское имя быстрой команды или ссылку https://…'
  if (loyaltyAppHref(trimmed)) return ''
  if (/[а-яё]/i.test(trimmed)) {
    return 'Имя команды — латиницей, как в «Командах», например Kopilka. Русское имя Safari считает страницей сайта.'
  }
  return 'Для «Команд» достаточно имени латиницей. Либо вставьте ссылку https://…'
}

/** Открыть программу. Без noreferrer — иначе iOS не отдаёт custom scheme установленному приложению. */
export function openLoyaltyApp(value: string): boolean {
  const href = loyaltyAppHref(value)
  if (!href) return false
  window.location.assign(href)
  return true
}

/** Android: список установленных. iPhone: приложение «Команды», оттуда открывают любую программу. */
export function openInstalledAppsList(): boolean {
  if (isAndroid()) {
    window.location.assign(
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end',
    )
    return true
  }
  if (isAppleMobile()) {
    window.location.assign('shortcuts://')
    return true
  }
  return false
}

export async function readClipboardLink(): Promise<string> {
  const text = (await navigator.clipboard.readText()).trim()
  return text
}

export function takeSharedAppLink(): { url: string; title: string } | null {
  try {
    const url = sessionStorage.getItem('pokupki-shared-app')?.trim() ?? ''
    const title = sessionStorage.getItem('pokupki-shared-app-title')?.trim() ?? ''
    if (!url) return null
    sessionStorage.removeItem('pokupki-shared-app')
    sessionStorage.removeItem('pokupki-shared-app-title')
    return { url, title }
  } catch {
    return null
  }
}

export function captureSharedAppFromLocation(): void {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const url = (params.get('url') ?? params.get('text') ?? '').trim()
  if (!url) return
  if (!ASCII_SCHEME.test(url) && !playPackage(url) && !looksLikeDomain(url)) return
  try {
    sessionStorage.setItem('pokupki-shared-app', url)
    const title = (params.get('title') ?? '').trim()
    if (title) sessionStorage.setItem('pokupki-shared-app-title', title)
  } catch {
    /* ignore */
  }
}
