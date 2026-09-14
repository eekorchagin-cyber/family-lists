import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  enableAppBadge,
  shouldPromptAppBadge,
  skipAppBadgePrompt,
  unboughtCount,
  updateAppBadge,
} from '../data/appBadge'
import type { Item, Settings, Store } from '../types'

export function useAppBadge(
  items: Item[],
  stores: Store[],
  settings: Settings,
  active: boolean,
) {
  const [prompt, setPrompt] = useState(false)
  const count = useMemo(
    () => unboughtCount(items, stores, settings),
    [items, settings, stores],
  )

  useEffect(() => {
    if (!active) return
    setPrompt(shouldPromptAppBadge())
  }, [active])

  useEffect(() => {
    if (!active) return
    void updateAppBadge(count)
  }, [active, count])

  useEffect(() => {
    if (!active) return
    const onShow = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return
      void updateAppBadge(count)
    }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('pageshow', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('pageshow', onShow)
      window.removeEventListener('focus', onShow)
    }
  }, [active, count])

  const allow = useCallback(async () => {
    const ok = await enableAppBadge()
    setPrompt(false)
    if (ok) void updateAppBadge(count)
  }, [count])

  const skip = useCallback(() => {
    skipAppBadgePrompt()
    setPrompt(false)
  }, [])

  return { prompt, allow, skip }
}
