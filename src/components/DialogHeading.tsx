import type { ReactNode } from 'react'
import { BackIcon } from './NavIcons'

export function DialogHeading({
  title,
  onClose,
  right,
}: {
  title: string
  onClose: () => void
  right?: ReactNode
}) {
  return (
    <div className="dialog-head">
      <button type="button" className="icon-button" onClick={onClose} aria-label="Назад">
        <BackIcon />
      </button>
      <h2>{title}</h2>
      {right}
    </div>
  )
}
