import type { ReactNode } from 'react'
import { HelpButton } from './HelpButton'
import { LongPressButton } from './LongPressButton'

type HeaderProps = {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
  help?: ReactNode
  helpTitle?: string
  updated?: boolean
  onTitleLongPress?: () => void
}

export function Header({
  title,
  subtitle,
  left,
  right,
  help,
  helpTitle,
  updated = false,
  onTitleLongPress,
}: HeaderProps) {
  return (
    <header className={updated ? 'header header--updated' : 'header'}>
      <div className="header-side">{left}</div>
      <div className="header-titles">
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
        {subtitle ? <p className="header-subtitle">{subtitle}</p> : null}
      </div>
      <div className="header-side header-side-right">
        {help ? <HelpButton text={help} title={helpTitle} /> : null}
        {right}
      </div>
    </header>
  )
}
