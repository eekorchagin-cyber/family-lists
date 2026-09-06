import type { ReactNode } from 'react'
import { LongPressButton } from './LongPressButton'

type HeaderProps = {
  title: string
  left?: ReactNode
  right?: ReactNode
  onTitleLongPress?: () => void
}

export function Header({ title, left, right, onTitleLongPress }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-side">{left}</div>
      <h1 className="header-title">
        {onTitleLongPress ? (
          <LongPressButton
            className="header-title-button"
            ariaLabel={`${title}. Удерживайте, чтобы переименовать`}
            onClick={() => {}}
            onLongPress={onTitleLongPress}
          >
            {title}
          </LongPressButton>
        ) : (
          title
        )}
      </h1>
      <div className="header-side header-side-right">{right}</div>
    </header>
  )
}
