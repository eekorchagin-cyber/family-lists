import {
  actionIdForLabel,
  BUTTON_ACTIONS,
  useButtonLabelStyle,
  type ButtonActionId,
} from '../data/buttonActions'
import { ActionLabel } from './ActionLabel'

type CommandButtonProps = {
  action?: ButtonActionId
  /** Подпись; если есть значок — можно не указывать action. */
  label?: string
  ariaLabel?: string
  danger?: boolean
  onClick: () => void
}

export function CommandButton({ action, label, ariaLabel, danger, onClick }: CommandButtonProps) {
  const mode = useButtonLabelStyle()
  const id = action ?? (label ? actionIdForLabel(label) : undefined)
  const resolvedLabel = id ? BUTTON_ACTIONS[id].label : (label ?? '')
  const icons = mode === 'icons' && Boolean(id)

  return (
    <button
      type="button"
      className={[
        'command-button',
        icons ? 'command-button--icons' : 'command-button--text',
        danger ? 'command-button--danger' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel ?? resolvedLabel}
      onClick={onClick}
    >
      {icons && id ? (
        <ActionLabel action={id} tile />
      ) : (
        <span className="command-label">{resolvedLabel}</span>
      )}
    </button>
  )
}
