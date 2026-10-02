import { useSyncExternalStore } from 'react'
import type { ButtonLabelStyle } from '../types'

export const BUTTON_ACTIONS = {
  name: { label: 'Имя', file: 'name' },
  icon: { label: 'Значок', file: 'icon' },
  map: { label: 'Карта', file: 'map' },
  templates: { label: 'Шаблоны', file: 'templates' },
  moveToGroup: { label: 'В группу', file: 'move_to_group' },
  send: { label: 'Отправить', file: 'send' },
  delete: { label: 'Удалить', file: 'delete' },
  done: { label: 'Готово', file: 'done' },
  save: { label: 'Сохранить', file: 'save' },
  newCategory: { label: 'Новая категория', file: 'new_category' },
  understood: { label: 'Понятно', file: 'understood' },
} as const

export type ButtonActionId = keyof typeof BUTTON_ACTIONS

const BY_LABEL = new Map(
  Object.entries(BUTTON_ACTIONS).map(([id, value]) => [value.label, id as ButtonActionId]),
)

export function actionIdForLabel(label: string): ButtonActionId | undefined {
  return BY_LABEL.get(label)
}

export function buttonIconUrl(file: string, variant: 'tile' | 'transparent'): string {
  return `./button-icons/${variant}/${file}.svg`
}

let current: ButtonLabelStyle | undefined
const listeners = new Set<() => void>()

export function publishButtonLabelStyle(style: ButtonLabelStyle | undefined) {
  if (current === style) return
  current = style
  listeners.forEach((listener) => listener())
}

/** По умолчанию — словами, как сейчас. */
export function useButtonLabelStyle(): ButtonLabelStyle {
  return (
    useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
      () => current,
    ) ?? 'words'
  )
}
