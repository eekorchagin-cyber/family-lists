import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { editCode, kindFromCode } from '../data/sync/codes'
import { canAutofocus } from '../data/viewport'
import { ConnectSteps } from './ConnectSteps'
import { DialogTitle } from './DialogTitle'

type CodeJoinDialogProps = {
  title: string
  text?: string
  steps?: ReactNode
  codeLabel: string
  nameLabel?: string
  initialCode?: string
  confirmLabel: string
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (code: string, name: string) => void
}

export function CodeJoinDialog({
  title,
  text,
  steps,
  codeLabel,
  nameLabel,
  initialCode = '',
  confirmLabel,
  busy = false,
  error = null,
  onClose,
  onConfirm,
}: CodeJoinDialogProps) {
  const [code, setCode] = useState(() => editCode(initialCode))
  const [name, setName] = useState('')
  const ready = code.trim().length >= 4 && (!nameLabel || name.trim().length > 0)

  function submit() {
    if (!ready || busy) return
    onConfirm(code.trim().toUpperCase(), name.trim())
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && /^[A-Z]-$/.test(code)) {
      event.preventDefault()
      setCode('')
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogTitle title={title} onBack={onClose} />
        {text ? <p className="hint">{text}</p> : null}
        {steps ?? <ConnectSteps forKind={kindFromCode(code)} />}
        {error ? <p className="hint sync-error">{error}</p> : null}
        {nameLabel ? (
          <>
            <label className="field-label" htmlFor="sync-name">
              {nameLabel}
            </label>
            <input
              id="sync-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={onKeyDown}
              autoFocus={canAutofocus()}
            />
          </>
        ) : null}
        <label className="field-label" htmlFor="sync-code">
          {codeLabel}
        </label>
        <input
          id="sync-code"
          className="input sync-code-input"
          value={code}
          onChange={(event) => setCode(editCode(event.target.value))}
          onKeyDown={onKeyDown}
          autoCapitalize="characters"
          autoFocus={canAutofocus() && !nameLabel}
        />
        <div className="dialog-actions dialog-actions-single">
          <button
            type="button"
            className="button-primary"
            disabled={!ready || busy}
            onClick={submit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
