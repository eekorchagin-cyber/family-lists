function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

function playPackage(value: string): string | null {
  const match = /play\.google\.com\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/.exec(value)
  if (match) return match[1]
  if (/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/i.test(value.trim())) return value.trim()
  return null
}

export function loyaltyAppHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('intent:')) return trimmed
  const pkg = playPackage(trimmed)
  if (pkg && isAndroid()) {
    return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${pkg};end`
  }
  return trimmed
}

/** Открыть программу. Без noreferrer — иначе iOS не отдаёт custom scheme установленному приложению. */
export function openLoyaltyApp(value: string): void {
  const href = loyaltyAppHref(value)
  if (!href) return
  window.location.assign(href)
}

/** Системный список установленных приложений (Android). С веб-страницы выбрать пакет и вернуть его нельзя. */
export function openInstalledAppsList(): boolean {
  if (!isAndroid()) return false
  window.location.assign(
    'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end',
  )
  return true
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
  if (!/^(https?:|intent:|[a-z][a-z0-9+.-]*:)/i.test(url) && !playPackage(url)) return
  try {
    sessionStorage.setItem('pokupki-shared-app', url)
    const title = (params.get('title') ?? '').trim()
    if (title) sessionStorage.setItem('pokupki-shared-app-title', title)
  } catch {
    /* ignore */
  }
}
