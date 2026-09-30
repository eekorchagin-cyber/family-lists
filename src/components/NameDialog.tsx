import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { canAutofocus } from '../data/viewport'
import { DialogTitle } from './DialogTitle'

type NameDialogProps = {
  title: string
  label: string
  placeholder?: string
  initial?: string
  confirmLabel: string
  inputId?: string
  extra?: ReactNode
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
  extra,
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
        <DialogTitle title={title} onBack={onClose} />
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
        {extra}
        <div className="dialog-actions dialog-actions-single">
          <button type="button" className="button-primary" disabled={!name.trim()} onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
