import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { canAutofocus } from '../data/viewport'
import { DialogHeading } from './DialogHeading'

type NameDialogProps = {
  title: string
  label: string
  placeholder?: string
  initial?: string
  confirmLabel: string
  inputId?: string
  extra?: ReactNode
  /** Вернуть текст ошибки — диалог останется открытым. */
  validate?: (name: string) => string | null
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
  validate,
  onClose,
  onConfirm,
}: NameDialogProps) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const problem = validate?.(trimmed) ?? null
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
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
        <DialogHeading title={title} onClose={onClose} />
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className="input"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (error) setError(null)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={canAutofocus()}
        />
        {error ? <p className="hint hint--error">{error}</p> : null}
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
