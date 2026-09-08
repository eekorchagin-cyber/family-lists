import { useCallback, useEffect, useState } from 'react'
import { isLocalHost } from '../data/sync/codes'
import { APP_VERSION } from '../data/version'

const RELOAD_KEY = 'pokupki-update-reload'
const DISMISS_KEY = 'pokupki-update-dismiss'
const SEEN_KEY = 'pokupki-seen-version'

export type RemoteVersion = {
  version: string
  title?: string
  notes?: string
}

export function isStandaloneApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export function useAppUpdate() {
  const [remote, setRemote] = useState<RemoteVersion | null>(null)
  const [stuck, setStuck] = useState(false)
  const [alreadyCurrent, setAlreadyCurrent] = useState(false)

  const check = useCallback(async () => {
    if (isLocalHost(location.hostname)) return
    try {
      const response = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as RemoteVersion
      if (!data?.version) return
      if (data.version === APP_VERSION) {
        setStuck(false)
        let seen = ''
        try {
          seen = localStorage.getItem(SEEN_KEY) ?? ''
        } catch {
          /* ignore */
        }
        if (seen === APP_VERSION) {
          setRemote(null)
          setAlreadyCurrent(false)
          return
        }
        setAlreadyCurrent(true)
        setRemote(data)
        return
      }
      setAlreadyCurrent(false)
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === data.version) return
      } catch {
        /* ignore */
      }
      try {
        if (sessionStorage.getItem(RELOAD_KEY) === data.version) setStuck(true)
      } catch {
        /* ignore */
      }
      setRemote(data)
    } catch {
      /* сеть недоступна — проверим позже */
    }
  }, [])

  useEffect(() => {
    void check()
    const timer = window.setInterval(() => void check(), 60_000)
    return () => window.clearInterval(timer)
  }, [check])

  const reload = useCallback(() => {
    if (!remote) return
    try {
      sessionStorage.setItem(RELOAD_KEY, remote.version)
    } catch {
      /* ignore */
    }
    location.reload()
  }, [remote])

  const dismiss = useCallback(() => {
    if (alreadyCurrent) {
      try {
        localStorage.setItem(SEEN_KEY, APP_VERSION)
      } catch {
        /* ignore */
      }
    } else if (remote) {
      try {
        sessionStorage.setItem(DISMISS_KEY, remote.version)
      } catch {
        /* ignore */
      }
    }
    setRemote(null)
    setStuck(false)
    setAlreadyCurrent(false)
  }, [alreadyCurrent, remote])

  return { remote, stuck, alreadyCurrent, standalone: isStandaloneApp(), reload, dismiss }
}
