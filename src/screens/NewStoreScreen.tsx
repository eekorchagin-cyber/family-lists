import { useState, type FormEvent } from 'react'
import { Header } from '../components/Header'

type NewStoreScreenProps = {
  onBack: () => void
  onAdd: (name: string) => void
}

export function NewStoreScreen({ onBack, onAdd }: NewStoreScreenProps) {
  const [name, setName] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
  }

  return (
    <form className="screen" onSubmit={submit}>
      <Header
        title="Новый список"
        left={
          <button type="button" className="icon-button" onClick={onBack} aria-label="Назад">
            ←
          </button>
        }
      />
      <div className="add-scroll">
        <label className="field-label" htmlFor="store-name">
          Название магазина
        </label>
        <input
          id="store-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Например, Пятёрочка"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
      <div className="add-footer">
        <button type="submit" className="button-primary add-submit" disabled={!name.trim()}>
          Добавить
        </button>
      </div>
    </form>
  )
}
