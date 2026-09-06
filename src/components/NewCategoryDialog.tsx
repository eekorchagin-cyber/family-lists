import { useState, type KeyboardEvent } from 'react'
import { CATEGORY_COLORS, iconIdFromName } from '../data/categories'
import { CategoryMarkPicker } from './CategoryMarkPicker'

type NewCategoryDialogProps = {
  onClose: () => void
  onAdd: (name: string, color: string, icon: string, global?: boolean) => void
  /** Если передан — показываем переключатель локальная/глобальная */
  showScopeToggle?: boolean
}

export function NewCategoryDialog({ onClose, onAdd, showScopeToggle }: NewCategoryDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0] ?? '#3b82f6')
  const [icon, setIcon] = useState<string>(iconIdFromName(''))
  const [iconTouched, setIconTouched] = useState(false)
  const [isGlobal, setIsGlobal] = useState(false)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, color, iconTouched ? icon : iconIdFromName(trimmed), showScopeToggle ? isGlobal : undefined)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Новая категория</h2>
        <label className="field-label" htmlFor="category-name">
          Название
        </label>
        <input
          id="category-name"
          className="input"
          value={name}
          onChange={(event) => {
            const next = event.target.value
            setName(next)
            if (!iconTouched) setIcon(iconIdFromName(next))
          }}
          onKeyDown={onKeyDown}
          placeholder="Например, Заморозка"
          autoFocus
        />
        {showScopeToggle && (
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
        )}
        <CategoryMarkPicker
          color={color}
          icon={icon}
          onColor={setColor}
          onIcon={(value) => {
            setIconTouched(true)
            setIcon(value)
          }}
        />
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="button-primary" disabled={!name.trim()} onClick={submit}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
