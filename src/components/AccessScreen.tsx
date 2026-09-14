import { useState, type FormEvent } from 'react'
import { ConnectSteps } from './ConnectSteps'
import { Header } from './Header'
import { UserGuide } from './UserGuide'
import { editCode, kindFromCode, mustUseHomeScreenShortcut } from '../data/sync/codes'

type AccessScreenProps = {
  busy: boolean
  error: string | null
  initialCode?: string | null
  onConnect: (code: string, name?: string) => Promise<'need-name' | 'error' | 'already' | void>
  onClearError: () => void
}

export function AccessScreen({
  busy,
  error,
  initialCode = '',
  onConnect,
  onClearError,
}: AccessScreenProps) {
  const [code, setCode] = useState(() => editCode(initialCode ?? ''))
  const [name, setName] = useState('')
  const kind = kindFromCode(code)
  const needsName = kind !== 'pairing'
  const ready = code.trim().length >= 4 && (!needsName || name.trim().length > 0)
  const fromSafari = mustUseHomeScreenShortcut()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (fromSafari || !ready || busy) return
    void onConnect(code.trim().toUpperCase(), name.trim() || undefined)
  }

  return (
    <form className="screen" onSubmit={submit}>
      <Header
        title="Вход"
        help={<UserGuide />}
        helpTitle="Как пользоваться"
      />
      <main className="content access-content">
        {fromSafari ? (
          <>
            <ConnectSteps role="install" />
            <p className="hint">
              Код действует один раз. Во вкладке Safari это другая копия: если ввести код здесь, с
              ярлыка он уже не сработает.
            </p>
          </>
        ) : (
          <>
            <ConnectSteps forKind={kind} />
            <p className="hint">Код действует только внутри ярлыка, не во вкладке Safari.</p>
            {error ? (
              <p className="hint sync-error">
                {error}{' '}
                <button type="button" className="text-button" onClick={onClearError}>
                  Скрыть
                </button>
              </p>
            ) : null}
            <label className="field-label" htmlFor="access-code">
              Код
            </label>
            <input
              id="access-code"
              className="input sync-code-input"
              value={code}
              onChange={(event) => setCode(editCode(event.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="next"
            />
            {kind !== 'pairing' ? (
              <>
                <label className="field-label" htmlFor="access-name">
                  Ваше имя
                </label>
                <input
                  id="access-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Например, Маша"
                  autoComplete="name"
                />
              </>
            ) : null}
            <button type="submit" className="button-primary add-category" disabled={!ready || busy}>
              Продолжить
            </button>
          </>
        )}
      </main>
    </form>
  )
}
