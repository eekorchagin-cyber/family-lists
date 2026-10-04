import { useState, type ReactNode } from 'react'
import { GuideHelp } from './UserGuide'
import { HelpIcon } from './NavIcons'

type HelpButtonProps = {
  text?: ReactNode
  /** Показать фрагменты общей справки по id разделов. */
  guideIds?: string[]
  title?: string
}

function HelpBody({ text }: { text: ReactNode }) {
  if (typeof text === 'string') {
    const items = text
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean)
    return (
      <ul className="help-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  return text
}

export function HelpButton({ text, guideIds, title = 'Подсказка' }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  const body = guideIds?.length ? <GuideHelp sectionIds={guideIds} /> : text

  return (
    <>
      <button
        type="button"
        className="icon-button"
        aria-label="Подсказка"
        onClick={() => setOpen(true)}
      >
        <HelpIcon />
      </button>
      {open && body != null && (
        <div className="overlay" role="presentation" onClick={() => setOpen(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{title}</h2>
            <div className="help-text">
              <HelpBody text={body} />
            </div>
            <div className="dialog-actions dialog-actions-single">
              <button type="button" className="button-primary" onClick={() => setOpen(false)}>
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
