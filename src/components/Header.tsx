import type { ReactNode } from 'react'
import { HelpButton } from './HelpButton'
import { LongPressButton } from './LongPressButton'

type HeaderProps = {
  title: string
  left?: ReactNode
  right?: ReactNode
  help?: ReactNode
  onTitleLongPress?: () => void
}

export function Header({ title, left, right, help, onTitleLongPress }: HeaderProps) {
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
      <div className="header-side header-side-right">
        {help ? <HelpButton text={help} /> : null}
        {right}
      </div>
    </header>
  )
}
