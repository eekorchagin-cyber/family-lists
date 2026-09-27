import { useEffect, useState } from 'react'
import { editCode, formatCode, kindFromCode } from '../data/sync/codes'
import { contactShareMessage, type Person } from '../data/sync/forwardApi'

type PeoplePanelProps = {
  configured: boolean
  signedIn: boolean
  myCode: string | null
  people: Person[]
  busy: boolean
  error: string | null
  onAdd: (code: string) => Promise<void>
  onRemove: (userId: string) => Promise<void>
  onRefresh: () => Promise<void>
  onClearError: () => void
}

export function PeoplePanel({
  configured,
  signedIn,
  myCode,
  people,
  busy,
  error,
  onAdd,
  onRemove,
  onRefresh,
  onClearError,
}: PeoplePanelProps) {
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    void onRefresh()
  }, [onRefresh])

  const copyCode = async () => {
    if (!myCode) return
    const text = contactShareMessage(myCode)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setLocalError('Не удалось скопировать. Выделите код и скопируйте его сами.')
    }
  }

  const submit = async () => {
    setLocalError(null)
    onClearError()
    if (kindFromCode(code) !== 'contact') {
      setLocalError('Нужен код человека на U из сообщения. Коды семьи D, T и P сюда не подходят.')
      return
    }
    try {
      await onAdd(formatCode(code))
      setCode('')
      setAdding(false)
    } catch {
      /* текст ошибки приходит сверху */
    }
  }

  if (!configured) {
    return <p className="hint">Облако на этом сайте не включено, переслать список пока нельзя.</p>
  }
  if (!signedIn) {
    return (
      <p className="hint">
        Сначала войдите в Настройки → Семья. Код человека нужен, даже если списки уйдут в другую семью.
      </p>
    )
  }

  const shownError = localError ?? error

  return (
    <>
      <section className="settings-block">
        <h2>Мой код</h2>
        <p className="hint">
          Отправьте этот код сообщением. Человек добавит вас в свой список и сможет переслать список.
          Семья при этом не общая.
        </p>
        <p className="share-message">{myCode ?? (busy ? 'Готовим код…' : 'Код появится через несколько секунд')}</p>
        <button type="button" className="button-primary add-category" disabled={!myCode || busy} onClick={() => void copyCode()}>
          {copied ? 'Сообщение скопировано' : 'Скопировать сообщение'}
        </button>
      </section>
      <section className="settings-block">
        <h2>Люди</h2>
        <p className="hint">
          Сюда попадают только те, чей код вы сами ввели. Присланный список появится отдельным новым
          списком и не войдёт в списки семьи.
        </p>
        {shownError ? <p className="hint">{shownError}</p> : null}
        {people.length === 0 ? (
          <p className="hint">Пока никого нет.</p>
        ) : (
          <ul className="store-list">
            {people.map((person) => (
              <li key={person.userId}>
                <div className="settings-nav-row">
                  <span className="settings-nav-text">
                    <span className="settings-nav-title">{person.name}</span>
                    <span className="settings-nav-hint">{person.code}</span>
                  </span>
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={busy}
                    onClick={() => void onRemove(person.userId)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {adding ? (
          <>
            <p className="field-label">Код из сообщения</p>
            <input
              className="input"
              value={code}
              aria-label="Код человека"
              autoCapitalize="characters"
              autoCorrect="off"
              onChange={(event) => {
                setLocalError(null)
                onClearError()
                setCode(editCode(event.target.value).slice(0, 7))
              }}
            />
            <div className="choice-row">
              <button type="button" className="button-primary" disabled={busy || code.length < 7} onClick={() => void submit()}>
                Сохранить
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setAdding(false)
                  setCode('')
                  setLocalError(null)
                  onClearError()
                }}
              >
                Отмена
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="button-primary add-category" disabled={busy} onClick={() => setAdding(true)}>
            Добавить по коду
          </button>
        )}
      </section>
    </>
  )
}
