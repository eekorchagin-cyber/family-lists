import { useState } from 'react'
import { canAutofocus } from '../data/viewport'
import type { Category } from '../types'
import { DialogTitle } from './DialogTitle'

type CategoryScopeDialogProps = {
  category: Category
  displayName: string
  isLocal: boolean
  onClose: () => void
  onSave: (name: string, global: boolean) => void
}

export function CategoryScopeDialog({
  category,
  displayName,
  isLocal,
  onClose,
  onSave,
}: CategoryScopeDialogProps) {
  const [name, setName] = useState(displayName)
  const [isGlobal, setIsGlobal] = useState(!isLocal)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, isGlobal)
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogTitle title={displayName || category.name} onBack={onClose} />
        <label className="field-label" htmlFor="category-scope-name">
          Название
        </label>
        <input
          id="category-scope-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus={canAutofocus()}
        />
        <p className="field-label">Тип</p>
        <div className="scope-toggle">
          <button
            type="button"
            className={`scope-option${!isGlobal ? ' scope-option--active' : ''}`}
            onClick={() => setIsGlobal(false)}
          >
            Только здесь
          </button>
          <button
            type="button"
            className={`scope-option${isGlobal ? ' scope-option--active' : ''}`}
            onClick={() => setIsGlobal(true)}
          >
            Для всех списков
          </button>
        </div>
        <p className="hint">
          {isGlobal
            ? 'Общая категория: её можно добавить в любой список. Здесь она останется.'
            : 'Категория останется только в этом списке.'}
        </p>
        <div className="dialog-actions dialog-actions-single">
          <button type="button" className="button-primary" disabled={!name.trim()} onClick={submit}>
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
