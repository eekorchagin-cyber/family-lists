import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'pokupki-supabase-config'

export type SupabaseConfig = {
  url: string
  anonKey: string
}

let client: SupabaseClient | null | undefined
let cachedConfig: SupabaseConfig | null | undefined

function fromEnv(): SupabaseConfig | null {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

function fromStorage(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SupabaseConfig>
    const url = typeof value.url === 'string' ? value.url.trim() : ''
    const anonKey = typeof value.anonKey === 'string' ? value.anonKey.trim() : ''
    if (!url || !anonKey) return null
    return { url, anonKey }
  } catch {
    return null
  }
}

export function loadSupabaseConfig(): SupabaseConfig | null {
  if (cachedConfig !== undefined) return cachedConfig
  cachedConfig = fromStorage() ?? fromEnv()
  return cachedConfig
}

export function saveSupabaseConfig(config: SupabaseConfig | null): void {
  if (!config) {
    localStorage.removeItem(CONFIG_KEY)
  } else {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ url: config.url.trim(), anonKey: config.anonKey.trim() }),
    )
  }
  cachedConfig = undefined
  client = undefined
}

export function supabaseConfigured(): boolean {
  return loadSupabaseConfig() !== null
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const config = loadSupabaseConfig()
  if (!config) {
    client = null
    return client
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}
