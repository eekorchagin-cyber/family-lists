import { formatCode } from './codes'
import { getSupabase } from './client'
import type { ForwardPayload, InboxDelivery } from '../forward'

export type Person = {
  userId: string
  code: string
  name: string
}

const DISMISS_KEY = 'pokupki-inbox-dismiss'
const PEOPLE_KEY = 'pokupki-people'
const CODE_KEY = 'pokupki-my-code'

export function loadCachedPeople(): Person[] {
  return readPeople()
}

export function loadCachedContactCode(): string | null {
  try {
    const code = localStorage.getItem(CODE_KEY)?.trim()
    return code ? formatCode(code) : null
  } catch {
    return null
  }
}

export function contactShareMessage(code: string): string {
  return [
    'Возьми',
    '',
    `Мой код, чтобы переслать мне список: ${formatCode(code)}`,
    'Настройки → Люди → Добавить по коду.',
  ].join('\n')
}

export function forwardErrorMessage(error: unknown): string {
  const text = errorText(error)
  if (/schema cache|PGRST202|ensure_contact_code|lookup_contact|send_list|dismiss_inbox|list_inbox|Could not find the function/i.test(text)) {
    return 'Пересылка ещё не включена в облаке. Один раз выполните файл supabase/migrate-list-forward.sql в SQL Editor и нажмите Run.'
  }
  if (/\bself\b/i.test(text)) return 'Это ваш код. Его отправляют вам в сообщении.'
  if (/no person/i.test(text)) return 'Нет человека с таким кодом. Пусть он пришлёт код из Настройки → Люди.'
  if (/too many/i.test(text)) return 'В списке больше 300 товаров. Переслать можно список короче.'
  if (/not signed in|JWT/i.test(text)) return 'Сначала войдите в семью: без входа код человека не создать.'
  if (/Failed to fetch|NetworkError|network/i.test(text)) return 'Нет сети. Попробуйте ещё раз.'
  return 'Не удалось. Проверьте код и сеть.'
}

export function isForwardUnavailable(error: unknown): boolean {
  return /schema cache|PGRST202|Could not find the function|list_inbox/i.test(errorText(error))
}

export async function ensureContactCode(): Promise<string> {
  const client = requireClient()
  const { data, error } = await client.rpc('ensure_contact_code')
  if (error) throw error
  const code = typeof data === 'string' ? data : ''
  if (!code) throw new Error('code failed')
  const formatted = formatCode(code)
  localStorage.setItem(CODE_KEY, formatted)
  return formatted
}

export async function loadContacts(): Promise<Person[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('contacts')
    .select('user_id, code, display_name')
    .order('created_at', { ascending: true })
  if (error) throw error
  const people = (data ?? []).flatMap((row) => {
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    const code = typeof row.code === 'string' ? row.code : ''
    const name = typeof row.display_name === 'string' ? row.display_name.trim() : ''
    if (!userId || !code || !name) return []
    return [{ userId, code: formatCode(code), name }]
  })
  writePeople(people)
  return people
}

export async function addContact(rawCode: string, ownerId: string): Promise<Person> {
  const client = requireClient()
  const { data, error } = await client.rpc('lookup_contact', { p_code: rawCode })
  if (error) throw error
  const row = data as { self?: boolean; user_id?: string; display_name?: string; code?: string } | null
  if (!row) throw new Error('no person')
  if (row.self) throw new Error('self')
  const userId = row.user_id ?? ''
  const name = row.display_name?.trim() ?? ''
  const code = row.code ?? ''
  if (!userId || !name || !code) throw new Error('no person')
  const { error: insertError } = await client.from('contacts').upsert(
    {
      owner_id: ownerId,
      user_id: userId,
      code,
      display_name: name,
    },
    { onConflict: 'owner_id,user_id' },
  )
  if (insertError) throw insertError
  const person = { userId, code: formatCode(code), name }
  const people = readPeople().filter((item) => item.userId !== userId)
  people.push(person)
  writePeople(people)
  return person
}

export async function removeContact(userId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('contacts').delete().eq('user_id', userId)
  if (error) throw error
  writePeople(readPeople().filter((person) => person.userId !== userId))
}

export async function sendList(code: string, name: string, payload: ForwardPayload): Promise<void> {
  const client = requireClient()
  const { error } = await client.rpc('send_list', {
    p_code: code,
    p_name: name,
    p_payload: payload,
  })
  if (error) throw error
}

export async function pullInbox(): Promise<InboxDelivery[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('list_inbox')
    .select('id, from_name, list_name, payload')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).flatMap((row) => {
    const id = typeof row.id === 'string' ? row.id : ''
    if (!id) return []
    return [{
      id,
      fromName: typeof row.from_name === 'string' ? row.from_name : 'Человек',
      listName: typeof row.list_name === 'string' ? row.list_name : 'Список',
      payload: row.payload,
    }]
  })
}

export function queueInboxDismiss(deliveryId: string): void {
  if (!deliveryId) return
  const ids = readDismiss()
  if (!ids.includes(deliveryId)) ids.push(deliveryId)
  localStorage.setItem(DISMISS_KEY, JSON.stringify(ids))
}

export async function flushInboxDismissals(): Promise<void> {
  const ids = readDismiss()
  if (ids.length === 0) return
  const client = requireClient()
  const left: string[] = []
  for (const id of ids) {
    const { error } = await client.rpc('dismiss_inbox', { p_id: id })
    if (error) left.push(id)
  }
  localStorage.setItem(DISMISS_KEY, JSON.stringify(left))
}

function requireClient() {
  const client = getSupabase()
  if (!client) throw new Error('Supabase не настроен')
  return client
}

function readPeople(): Person[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY)
    const value = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(value)) return []
    return value.flatMap((row) => {
      if (!row || typeof row !== 'object') return []
      const person = row as { userId?: unknown; code?: unknown; name?: unknown }
      const userId = typeof person.userId === 'string' ? person.userId : ''
      const code = typeof person.code === 'string' ? person.code : ''
      const name = typeof person.name === 'string' ? person.name.trim() : ''
      if (!userId || !code || !name) return []
      return [{ userId, code: formatCode(code), name }]
    })
  } catch {
    return []
  }
}

function writePeople(people: Person[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people))
}

function readDismiss(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    const value = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '')
  }
  return String(error ?? '')
}
