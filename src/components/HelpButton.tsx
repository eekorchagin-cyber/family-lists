import { useState, type ReactNode } from 'react'

type HelpButtonProps = {
  text: ReactNode
  title?: string
}

export function HelpButton({ text, title = 'Подсказка' }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="icon-button help-button"
        aria-label="Подсказка"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <div className="overlay" role="presentation" onClick={() => setOpen(false)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <h2>{title}</h2>
            <div className="help-text">{text}</div>
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
