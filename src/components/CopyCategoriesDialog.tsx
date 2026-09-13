import { useState } from 'react'
import type { Store } from '../types'

type CopyCategoriesDialogProps = {
  mode: 'from' | 'to'
  stores: Store[]
  onClose: () => void
  onCopy: (otherStoreId: string) => void
}

export function CopyCategoriesDialog({
  mode,
  stores,
  onClose,
  onCopy,
}: CopyCategoriesDialogProps) {
  const [targetId, setTargetId] = useState(stores[0]?.id ?? '')
  const canCopy = Boolean(targetId)

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{mode === 'from' ? 'Скопировать из списка' : 'Скопировать в список'}</h2>
        <p className="hint">
          {mode === 'from'
            ? 'Отделы выбранного списка появятся здесь. Уже добавленные не дублируются; локальные копируются как новые.'
            : 'Отделы этого списка появятся в выбранном. Уже добавленные там не дублируются; локальные копируются как новые.'}
        </p>
        {stores.length === 0 ? (
          <p className="hint">Нет других списков.</p>
        ) : (
          <>
            <p className="field-label">{mode === 'from' ? 'Откуда' : 'Куда'}</p>
            <ul className="choice-row sheet-list">
              {stores.map((store) => (
                <li key={store.id}>
                  <button
                    type="button"
                    className={store.id === targetId ? 'choice active' : 'choice'}
                    onClick={() => setTargetId(store.id)}
                  >
                    {store.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={!canCopy}
            onClick={() => onCopy(targetId)}
          >
            Скопировать
          </button>
        </div>
      </div>
    </div>
  )
}
