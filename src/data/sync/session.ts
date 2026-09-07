import type { AppData } from '../../types'

export const SYNC_KEY = 'pokupki-sync'

export type SyncSession = {
  email: string
  password: string
  userId: string
  homeId: string
  displayName: string
  isCreator: boolean
  frozen: boolean
  lastPulledAt: string | null
}

export type HomeMember = {
  id: string
  displayName: string
  isCreator: boolean
  createdAt?: string
}

export function loadSession(): SyncSession | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SyncSession>
    if (!value.userId || !value.email || !value.password) return null
    const homeId = value.homeId ?? ''
    return {
      email: value.email,
      password: value.password,
      userId: value.userId,
      homeId,
      displayName: value.displayName ?? '',
      isCreator: Boolean(value.isCreator),
      frozen: Boolean(value.frozen) || !homeId,
      lastPulledAt: value.lastPulledAt ?? null,
    }
  } catch {
    return null
  }
}

export function saveSession(session: SyncSession | null): void {
  if (!session) {
    localStorage.removeItem(SYNC_KEY)
    return
  }
  localStorage.setItem(SYNC_KEY, JSON.stringify(session))
}

export function dataLooksPopulated(data: AppData): boolean {
  return data.stores.length > 0 || data.items.length > 0
}

const UPDATED_STORES_KEY = 'pokupki-updated-stores'

export function loadUpdatedStoreIds(): string[] {
  try {
    const raw = localStorage.getItem(UPDATED_STORES_KEY)
    if (!raw) return []
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function saveUpdatedStoreIds(ids: string[]): void {
  if (ids.length === 0) {
    localStorage.removeItem(UPDATED_STORES_KEY)
    return
  }
  localStorage.setItem(UPDATED_STORES_KEY, JSON.stringify(ids))
}
