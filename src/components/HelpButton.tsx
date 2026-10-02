import { useState, type ReactNode } from 'react'
import { HelpIcon } from './NavIcons'

type HelpButtonProps = {
  text: ReactNode
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

export function HelpButton({ text, title = 'Подсказка' }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

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
      {open && (
        <div className="overlay" role="presentation" onClick={() => setOpen(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{title}</h2>
            <div className="help-text">
              <HelpBody text={text} />
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
