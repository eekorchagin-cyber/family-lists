import { isStandaloneApp } from './sync/codes'
import type { Item, Settings, Store } from '../types'

const SKIP_KEY = 'pokupki-badge-skip'

type BadgeNav = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function excludedBadgeStoreIds(settings: Settings): string[] {
  return settings.badgeExcludedStoreIds ?? []
}

export function badgeIncludeNewStores(settings: Settings): boolean {
  return settings.badgeIncludeNew !== false
}

export function isStoreInBadge(storeId: string, settings: Settings): boolean {
  return !excludedBadgeStoreIds(settings).includes(storeId)
}

export function withBadgeStore(settings: Settings, storeId: string, included: boolean): Settings {
  const excluded = excludedBadgeStoreIds(settings)
  const isExcluded = excluded.includes(storeId)
  if (included === !isExcluded) return settings
  const next = included ? excluded.filter((id) => id !== storeId) : [...excluded, storeId]
  return {
    ...settings,
    badgeExcludedStoreIds: next.length > 0 ? next : undefined,
  }
}

export function unboughtCount(items: Item[], stores: Store[], settings?: Settings): number {
  const excluded = new Set(settings ? excludedBadgeStoreIds(settings) : [])
  const known = new Set(
    stores.filter((store) => !excluded.has(store.id)).map((store) => store.id),
  )
  let count = 0
  for (const item of items) {
    if (item.bought || !known.has(item.storeId)) continue
    count += 1
  }
  return count
}

function badgeNav(): BadgeNav | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as BadgeNav
  if (typeof nav.setAppBadge !== 'function') return null
  return nav
}

export function canUseAppBadge(): boolean {
  return Boolean(badgeNav()) && isStandaloneApp()
}

export function shouldPromptAppBadge(): boolean {
  if (!canUseAppBadge()) return false
  if (typeof Notification === 'undefined') return false
  if (Notification.permission !== 'default') return false
  try {
    return localStorage.getItem(SKIP_KEY) !== '1'
  } catch {
    return true
  }
}

export function skipAppBadgePrompt(): void {
  try {
    localStorage.setItem(SKIP_KEY, '1')
  } catch {
    // private mode
  }
}

export async function enableAppBadge(): Promise<boolean> {
  if (!canUseAppBadge() || typeof Notification === 'undefined') return false
  if (Notification.permission === 'denied') {
    skipAppBadgePrompt()
    return false
  }
  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') {
      skipAppBadgePrompt()
      return false
    }
  }
  return true
}

export async function updateAppBadge(count: number): Promise<void> {
  const nav = badgeNav()
  if (!nav || !isStandaloneApp()) return
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return
  try {
    if (count > 0) await nav.setAppBadge(count)
    else if (typeof nav.clearAppBadge === 'function') await nav.clearAppBadge()
    else await nav.setAppBadge(0)
  } catch {
    // нет разрешения или не ярлык
  }
}
