import { useSyncExternalStore } from 'react'
import type { IconStyle } from '../types'

let current: IconStyle | undefined
const listeners = new Set<() => void>()

export function publishIconStyle(style: IconStyle | undefined) {
  if (current === style) return
  current = style
  listeners.forEach((listener) => listener())
}

export function useIconStyle(): IconStyle | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
