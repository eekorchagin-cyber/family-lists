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
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 8_000)
      let response: Response
      try {
        response = await fetch(`./version.json?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
      } finally {
        window.clearTimeout(timer)
      }
      if (!response.ok) return
      const data = (await response.json()) as RemoteVersion
      if (!data?.version) return

      let reloadFor = ''
      try {
        reloadFor = sessionStorage.getItem(RELOAD_KEY) ?? ''
      } catch {
        /* ignore */
      }

      if (data.version === APP_VERSION) {
        // Удачное обновление: одно окно с описанием и «Понятно», без мигания.
        if (reloadFor === data.version) {
          try {
            sessionStorage.removeItem(RELOAD_KEY)
          } catch {
            /* ignore */
          }
          setStuck(false)
          setAlreadyCurrent(true)
          setRemote(data)
          return
        }
        let seen = ''
        try {
          seen = localStorage.getItem(SEEN_KEY) ?? ''
        } catch {
          /* ignore */
        }
        if (seen === APP_VERSION) {
          setRemote(null)
          setAlreadyCurrent(false)
          setStuck(false)
          return
        }
        setStuck(false)
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
      // Перезагрузка была, а номер версии не сменился — застревание.
      const isStuck = reloadFor === data.version
      setStuck(isStuck)
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
      // SEEN ставим только после «Понятно», чтобы описание не проскакивало.
    } catch {
      /* ignore */
    }
    location.reload()
  }, [remote])

  const dismiss = useCallback(() => {
    if (alreadyCurrent) {
      try {
        localStorage.setItem(SEEN_KEY, APP_VERSION)
        sessionStorage.removeItem(RELOAD_KEY)
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
