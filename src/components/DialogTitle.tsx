import type { ReactNode } from 'react'
import { BackIcon } from './NavIcons'

type DialogTitleProps = {
  title: string
  onBack: () => void
  /** Подпись для стрелки: по умолчанию «Назад». */
  backLabel?: string
  right?: ReactNode
}

/** Единый заголовок диалога: стрелка влево вместо «Назад» / «Закрыть» / «Отмена». */
export function DialogTitle({
  title,
  onBack,
  backLabel = 'Назад',
  right,
}: DialogTitleProps) {
  return (
    <div className="dialog-title-row">
      <button type="button" className="icon-button" onClick={onBack} aria-label={backLabel}>
        <BackIcon />
      </button>
      <h2>{title}</h2>
      {right ? <div className="dialog-title-right">{right}</div> : null}
    </div>
  )
}
