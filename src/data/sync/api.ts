import type { AppData, CatalogEntry, Category, Item, Store } from '../../types'
import { getSupabase } from './client'
import { deviceCode, inviteCode, kindFromCode, localAuthEmail, randomPassword } from './codes'
import { restoreDeletes, takeDeletes } from './deletes'
import {
  GROUPS_CATALOG_ID,
  parseGroupsCatalog,
  stripGroupMarker,
  withGroupMarker,
} from '../homeLayout'
import { nowIso } from './merge'
import { loadSession, type HomeMember, type SyncSession } from './session'

type StoreRow = {
  id: string
  home_id: string
  owner_id: string
  name: string
  visibility: 'private' | 'home'
  category_sort: string
  category_order: string[]
  category_names: Record<string, string>
  templates: Store['templates']
  updated_at: string
}

type CategoryRow = {
  id: string
  home_id: string
  store_id: string | null
  name: string
  color: string
  icon: string | null
  updated_at: string
}

type ItemRow = {
  id: string
  home_id: string
  store_id: string
  name: string
  category_id: string
  qty: number
  unit: string
  bought: boolean
  added_by: string | null
  bought_by: string | null
  updated_at: string
}

type CatalogRow = {
  id: string
  home_id: string
  name: string
  category_id: string
  updated_at: string
}

function requireClient() {
  const client = getSupabase()
  if (!client) throw new Error('Supabase не настроен')
  return client
}

export async function signUpDevice(displayName: string): Promise<SyncSession> {
  const client = requireClient()
  const userId = crypto.randomUUID()
  const email = localAuthEmail(userId)
  const password = randomPassword()
  const { error } = await client.auth.signUp({ email, password })
  if (error) throw error
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) throw userError ?? new Error('Нет пользователя')
  const uid = userData.user.id
  const { data: home, error: homeError } = await client
    .from('homes')
    .insert({ name: 'Дом', created_by: uid })
    .select('id')
    .single()
  if (homeError || !home) throw homeError ?? new Error('Не удалось создать дом')
  const { error: profileError } = await client.from('profiles').insert({
    id: uid,
    home_id: home.id,
    display_name: displayName.trim(),
    is_creator: true,
  })
  if (profileError) throw profileError
  return {
    email,
    password,
    userId: uid,
    homeId: home.id,
    displayName: displayName.trim(),
    isCreator: true,
    frozen: false,
    lastPulledAt: null,
  }
}

export async function signInDevice(email: string, password: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function joinHome(code: string, displayName: string): Promise<SyncSession> {
  const client = requireClient()
  const userId = crypto.randomUUID()
  const email = localAuthEmail(userId)
  const password = randomPassword()
  const { error } = await client.auth.signUp({ email, password })
  if (error) throw error
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  const { error: redeemError, data: homeId } = await client.rpc('redeem_invite', {
    p_code: code,
    p_name: displayName.trim(),
  })
  if (redeemError || !homeId) throw redeemError ?? new Error('Неверный код')
  const { data: userData } = await client.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Нет пользователя')
  return {
    email,
    password,
    userId: uid,
    homeId: String(homeId),
    displayName: displayName.trim(),
    isCreator: false,
    frozen: false,
    lastPulledAt: null,
  }
}

export async function restoreSession(session: SyncSession): Promise<void> {
  const client = requireClient()
  const { data } = await client.auth.getSession()
  if (data.session?.user.id === session.userId) return
  await signInDevice(session.email, session.password)
}

export async function recoverSessionFromAuth(): Promise<SyncSession | null> {
  const existing = loadSession()
  const client = getSupabase()
  if (!client) return existing
  const { data } = await client.auth.getSession()
  const user = data.session?.user
  if (!user) return existing
  const profile = await loadMyProfile()
  if (!profile?.homeId) return existing
  return {
    email: user.email ?? existing?.email ?? '',
    password: existing?.password ?? '',
    userId: user.id,
    homeId: profile.homeId,
    displayName: profile.displayName,
    isCreator: profile.isCreator,
    frozen: false,
    lastPulledAt: existing?.lastPulledAt ?? null,
  }
}

export async function loadMembers(): Promise<HomeMember[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, is_creator, created_at')
    .not('home_id', 'is', null)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    isCreator: row.is_creator,
    createdAt: row.created_at,
  }))
}

export async function createInviteCode(): Promise<string> {
  const client = requireClient()
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('home_id')
    .eq('id', (await client.auth.getUser()).data.user?.id)
    .single()
  if (profileError || !profile?.home_id) throw profileError ?? new Error('Нет дома')
  await client.from('invites').delete().eq('home_id', profile.home_id)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = inviteCode()
    const { error } = await client.from('invites').insert({
      code,
      home_id: profile.home_id,
      created_by: (await client.auth.getUser()).data.user?.id,
    })
    if (!error) return code
  }
  throw new Error('Не удалось создать код')
}

export async function loadInviteCode(): Promise<string | null> {
  const client = requireClient()
  const { data, error } = await client.from('invites').select('code').limit(1).maybeSingle()
  if (error) throw error
  const code = data?.code ?? null
  if (!code) return null
  if (kindFromCode(code) === 'invite') return code
  return createInviteCode()
}

export async function createPairingCode(email: string, password: string): Promise<string> {
  const client = requireClient()
  const code = deviceCode()
  const { error } = await client.rpc('create_pairing', {
    p_code: code,
    p_email: email,
    p_password: password,
  })
  if (error) throw error
  return code
}

export async function redeemPairing(code: string): Promise<{ email: string; password: string }> {
  const client = requireClient()
  const { data, error } = await client.rpc('redeem_pairing', { p_code: code })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.email || !row?.password) throw new Error('Неверный код')
  return { email: row.email, password: row.password }
}

export async function excludeMember(userId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('exclude_member', { p_user_id: userId })
  if (error) throw error
}

export async function reclaimHome(): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('reclaim_home')
  if (error) throw error
  if (typeof data !== 'string' || !data) throw new Error('Не удалось вернуться в дом')
  return data
}

export async function loadMyProfile(): Promise<{
  id: string
  homeId: string | null
  displayName: string
  isCreator: boolean
} | null> {
  const client = requireClient()
  const uid =
    (await client.auth.getSession()).data.session?.user?.id ??
    (await client.auth.getUser()).data.user?.id
  if (!uid) return null
  const { data, error } = await client
    .from('profiles')
    .select('id, home_id, display_name, is_creator')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    homeId: data.home_id,
    displayName: data.display_name,
    isCreator: data.is_creator,
  }
}

export async function completePairing(code: string): Promise<SyncSession> {
  const creds = await redeemPairing(code)
  await signInDevice(creds.email, creds.password)
  const profile = await loadMyProfile()
  if (!profile?.homeId) throw new Error('Нет дома')
  return {
    email: creds.email,
    password: creds.password,
    userId: profile.id,
    homeId: profile.homeId,
    displayName: profile.displayName,
    isCreator: profile.isCreator,
    frozen: false,
    lastPulledAt: null,
  }
}

export async function pullRemote(): Promise<AppData> {
  const client = requireClient()
  const [stores, categories, items, catalog] = await Promise.all([
    client.from('stores').select('*'),
    client.from('categories').select('*'),
    client.from('items').select('*'),
    client.from('catalog').select('*'),
  ])
  if (stores.error) throw stores.error
  if (categories.error) throw categories.error
  if (items.error) throw items.error
  if (catalog.error) throw catalog.error

  const catalogEntries = ((catalog.data ?? []) as CatalogRow[]).map(catalogFromRow)
  const groupsEntry = catalogEntries.find((entry) => entry.id === GROUPS_CATALOG_ID)
  const groups = parseGroupsCatalog(groupsEntry?.name) ?? []
  return {
    version: 1,
    settings: { theme: 'light', fontSize: 'm' },
    stores: ((stores.data ?? []) as StoreRow[]).map(storeFromRow),
    groups,
    categories: ((categories.data ?? []) as CategoryRow[]).map(categoryFromRow),
    items: ((items.data ?? []) as ItemRow[]).map(itemFromRow),
    catalog: catalogEntries.filter((entry) => entry.id !== GROUPS_CATALOG_ID),
  }
}

export async function pushLocal(session: SyncSession, data: AppData): Promise<void> {
  const client = requireClient()
  const homeId = session.homeId
  const ownerId = session.userId
  const at = nowIso()
  const writableIds = new Set(
    data.stores
      .filter(
        (store) =>
          (store.ownerId ?? ownerId) === ownerId || store.visibility === 'home',
      )
      .map((store) => store.id),
  )

  const storeRows = data.stores
    .filter((store) => writableIds.has(store.id))
    .map((store) => ({
      id: store.id,
      home_id: homeId,
      owner_id: store.ownerId ?? ownerId,
      name: store.name,
      visibility: store.visibility ?? 'private',
      category_sort: store.categorySort,
      category_order: store.categoryOrder,
      category_names: withGroupMarker(store.categoryNames, store.groupId),
      templates: store.templates ?? [],
      updated_at: store.updatedAt ?? at,
    }))
  if (storeRows.length > 0) {
    const { error } = await client.from('stores').upsert(storeRows)
    if (error) throw error
  }

  const categoryRows = data.categories.map((category) => ({
    id: category.id,
    home_id: homeId,
    store_id: category.storeId ?? null,
    name: category.name,
    color: category.color,
    icon: category.icon ?? null,
    updated_at: category.updatedAt ?? at,
  }))
  if (categoryRows.length > 0) {
    const { error } = await client.from('categories').upsert(categoryRows)
    if (error) throw error
  }

  const itemRows = data.items
    .filter((item) => writableIds.has(item.storeId))
    .map((item) => ({
    id: item.id,
    home_id: homeId,
    store_id: item.storeId,
    name: item.name,
    category_id: item.categoryId,
    qty: item.qty,
    unit: item.unit,
    bought: item.bought,
    added_by: item.addedBy ?? ownerId,
    bought_by: item.boughtBy ?? null,
    updated_at: item.updatedAt ?? at,
  }))
  if (itemRows.length > 0) {
    const { error } = await client.from('items').upsert(itemRows)
    if (error) throw error
  }

  const catalogRows = (data.catalog ?? [])
    .filter((entry) => entry.id !== GROUPS_CATALOG_ID)
    .map((entry) => ({
      id: entry.id,
      home_id: homeId,
      name: entry.name,
      category_id: entry.categoryId,
      updated_at: entry.updatedAt ?? at,
    }))
  const groupsAt = (data.groups ?? []).map((group) => group.updatedAt ?? '').sort().at(-1) ?? at
  catalogRows.push({
    id: GROUPS_CATALOG_ID,
    home_id: homeId,
    name: JSON.stringify(data.groups ?? []),
    category_id: 'other',
    updated_at: groupsAt,
  })
  if (catalogRows.length > 0) {
    const { error } = await client.from('catalog').upsert(catalogRows)
    if (error) throw error
  }

  const pending = takeDeletes()
  try {
    if (pending.clearedItems.length > 0) {
      const { error } = await client.from('items').delete().in('id', pending.clearedItems)
      if (error) throw error
    }
    if (pending.items.length > 0) {
      const { data: boughtRows } = await client
        .from('items')
        .select('id, bought')
        .in('id', pending.items)
      const skip = new Set(
        (boughtRows ?? []).filter((row) => row.bought).map((row) => row.id),
      )
      const ids = pending.items.filter((id) => !skip.has(id))
      if (ids.length > 0) {
        const { error } = await client.from('items').delete().in('id', ids)
        if (error) throw error
      }
    }
    if (pending.stores.length > 0) {
      const { error } = await client.from('stores').delete().in('id', pending.stores)
      if (error) throw error
    }
    // groups live in catalog entry; nothing to delete per-id on the server
    if (pending.categories.length > 0) {
      const { error } = await client.from('categories').delete().in('id', pending.categories)
      if (error) throw error
    }
    if (pending.catalog.length > 0) {
      const { error } = await client.from('catalog').delete().in('id', pending.catalog)
      if (error) throw error
    }
  } catch (error) {
    restoreDeletes(pending)
    throw error
  }
}

function storeFromRow(row: StoreRow): Store {
  const marked = stripGroupMarker(row.category_names ?? {})
  return {
    id: row.id,
    name: row.name,
    categorySort: row.category_sort === 'alpha' ? 'alpha' : 'custom',
    categoryOrder: row.category_order ?? [],
    categoryNames: marked.names,
    templates: row.templates ?? [],
    visibility: row.visibility,
    ownerId: row.owner_id,
    ...(marked.groupId ? { groupId: marked.groupId } : {}),
    updatedAt: row.updated_at,
  }
}

function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    ...(row.icon ? { icon: row.icon } : {}),
    ...(row.store_id ? { storeId: row.store_id } : {}),
    updatedAt: row.updated_at,
  }
}

function itemFromRow(row: ItemRow): Item {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    categoryId: row.category_id,
    qty: row.qty,
    unit: row.unit,
    bought: row.bought,
    ...(row.added_by ? { addedBy: row.added_by } : {}),
    ...(row.bought_by ? { boughtBy: row.bought_by } : {}),
    updatedAt: row.updated_at,
  }
}

function catalogFromRow(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    updatedAt: row.updated_at,
  }
}
