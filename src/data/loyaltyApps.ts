export const LOYALTY_APPS = [
  { id: 'pyaterochka', name: 'Пятёрочка', url: 'pyaterochka://', android: 'ru.pyaterochka.app.browser' },
  { id: 'perekrestok', name: 'Перекрёсток', url: 'perekrestok://', android: 'ru.perekrestok.app' },
  { id: 'lenta', name: 'Лента', url: 'lentaapp://', android: 'com.icemobile.lenta' },
  { id: 'krasnoe', name: 'Красное & Белое', url: 'kb://', android: 'ru.krasnoeibeloe.app' },
  { id: 'auchan', name: 'Ашан', url: 'auchan://', android: 'ru.auchan.shop' },
  { id: 'metro', name: 'METRO', url: 'metro://', android: 'de.metro.mobile.android' },
  { id: 'magnit', name: 'Магнит', url: 'magnit://', android: 'ru.tander.magnit' },
  { id: 'ozon', name: 'OZON', url: 'ozon://', android: 'ru.ozon.app.android' },
  { id: 'komandor', name: 'Командор', url: 'https://www.sm-komandor.ru' },
] as const

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

export function loyaltyAppHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const known = LOYALTY_APPS.find(
    (app) => app.url === trimmed || ('android' in app && app.android === trimmed),
  )
  if (isAndroid() && known && 'android' in known && known.android) {
    const scheme = known.url.includes('://') ? known.url.split(':')[0] : 'https'
    return `intent://#Intent;scheme=${scheme};package=${known.android};S.browser_fallback_url=${encodeURIComponent(known.url)};end`
  }
  return trimmed
}

export function openLoyaltyApp(value: string): void {
  const href = loyaltyAppHref(value)
  if (!href) return
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
