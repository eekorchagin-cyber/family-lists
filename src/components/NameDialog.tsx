import { useState, type KeyboardEvent } from 'react'
import { canAutofocus } from '../data/viewport'

type NameDialogProps = {
  title: string
  label: string
  placeholder?: string
  initial?: string
  confirmLabel: string
  inputId?: string
  onClose: () => void
  onConfirm: (name: string) => void
}

export function NameDialog({
  title,
  label,
  placeholder,
  initial = '',
  confirmLabel,
  inputId = 'name-dialog-input',
  onClose,
  onConfirm,
}: NameDialogProps) {
  const [name, setName] = useState(initial)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={canAutofocus()}
        />
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="button-primary" disabled={!name.trim()} onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
