import type { CSSProperties } from 'react'
import {
  actionIdForLabel,
  BUTTON_ACTIONS,
  buttonIconUrl,
  useButtonLabelStyle,
  type ButtonActionId,
} from '../data/buttonActions'

type ActionLabelProps = {
  action?: ButtonActionId
  /** Текст кнопки; если совпадает с известным названием — подставится значок. */
  text?: string
  /** Плитка для сетки команд; иначе маска currentColor для обычных кнопок. */
  tile?: boolean
}

export function ActionLabel({ action, text, tile = false }: ActionLabelProps) {
  const mode = useButtonLabelStyle()
  const id = action ?? (text ? actionIdForLabel(text) : undefined)
  const meta = id ? BUTTON_ACTIONS[id] : undefined
  const label = meta?.label ?? text ?? ''

  if (mode === 'icons' && meta) {
    if (tile) {
      return (
        <img
          className="action-icon action-icon--tile"
          src={buttonIconUrl(meta.file, 'tile')}
          alt=""
          aria-hidden
        />
      )
    }
    return (
      <span
        className="action-icon action-icon--mask"
        style={
          {
            '--action-mask': `url(${buttonIconUrl(meta.file, 'transparent')})`,
          } as CSSProperties
        }
        aria-hidden
      />
    )
  }

  return <>{label}</>
}
