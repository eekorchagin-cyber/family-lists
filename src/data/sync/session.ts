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

/** Id списков из встроенного backup.json — не считаем их «своими» данными семьи. */
export const BUNDLED_BACKUP_STORE_IDS = new Set([
  'fd7ad4d7-9463-4f9f-8a8a-56cb9b403e75',
  '6bbb6333-d4ab-4ef3-a7e9-a9b4c9929f3d',
  'cad30135-1ebc-4967-9027-81f0d8425bc8',
  'aeb4c6c6-f848-4807-afa7-7a4c6ba4fc48',
  '1ce416e6-0598-4637-8bbc-dbc8efc682cc',
])

/** Локальные данные — только сид из backup (типичный «свежий» второй телефон). */
export function isBundledBackupData(data: AppData): boolean {
  if (data.stores.length === 0) return false
  if ((data.groups ?? []).length > 0) return false
  return data.stores.every((store) => BUNDLED_BACKUP_STORE_IDS.has(store.id))
}

export function dataLooksPopulated(data: AppData): boolean {
  if (isBundledBackupData(data)) return false
  return data.stores.length > 0 || data.items.length > 0
}

/** Облако и локаль — разные наборы списков (нет общих id). */
export function datasetsDisjoint(local: AppData, remote: AppData): boolean {
  if (local.stores.length === 0 || remote.stores.length === 0) return false
  const localIds = new Set(local.stores.map((store) => store.id))
  return remote.stores.every((store) => !localIds.has(store.id))
}

/** Второй телефон должен взять облако целиком, а не merge с backup. */
export function shouldReplaceWithCloud(local: AppData, remote: AppData): boolean {
  if (remote.stores.length === 0 && remote.items.length === 0) return false
  if (isBundledBackupData(local)) return true
  if (datasetsDisjoint(local, remote)) return true
  return false
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
