import { useState } from 'react'
import type { Store } from '../types'

type TransferDialogProps = {
  stores: Store[]
  activeCount: number
  onClose: () => void
  onCopy: (storeId: string) => void
  onMove: (storeId: string) => void
}

export function TransferDialog({
  stores,
  activeCount,
  onClose,
  onCopy,
  onMove,
}: TransferDialogProps) {
  const [targetId, setTargetId] = useState(stores[0]?.id ?? '')
  const canTransfer = Boolean(targetId) && activeCount > 0

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>В другой список</h2>
        {activeCount > 0 ? (
          <p className="hint">
            Переносятся только некупленные товары. Скопировать — они останутся
            здесь. Перенести — уберутся из этого списка.
          </p>
        ) : (
          <p className="hint">Нет некупленных товаров. Купленные не копируются и не переносятся.</p>
        )}
        <p className="field-label">Куда</p>
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
        <div className="choice-row">
          <button
            type="button"
            className="button-primary"
            disabled={!canTransfer}
            onClick={() => onCopy(targetId)}
          >
            Скопировать
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={!canTransfer}
            onClick={() => onMove(targetId)}
          >
            Перенести
          </button>
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
