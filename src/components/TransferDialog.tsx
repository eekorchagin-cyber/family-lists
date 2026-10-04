import { useMemo, useState } from 'react'
import type { Item, Store } from '../types'
import type { TransferSummary } from '../data/listTransfer'
import { DialogHeading } from './DialogHeading'
import { NameDialog } from './NameDialog'

type TransferMode = 'copy' | 'move'

type TransferDialogProps = {
  stores: Store[]
  activeCount: number
  onClose: () => void
  onTransfer: (
    storeId: string,
    mode: TransferMode,
    onlyItemIds?: string[],
  ) => TransferSummary
  onCreateStore: (
    name: string,
    items: Item[],
    mode: TransferMode,
  ) => void
}

type Phase =
  | { kind: 'pick'; mode?: TransferMode; pending?: Item[] }
  | {
      kind: 'leftover'
      mode: TransferMode
      leftover: Item[]
      transferredCount: number
      targetName: string
    }
  | { kind: 'create'; mode: TransferMode; leftover: Item[] }

function itemLabel(item: Item): string {
  const qty = item.qty !== 1 || item.unit !== 'шт' ? ` — ${item.qty} ${item.unit}` : ''
  return `${item.name}${qty}`
}

export function TransferDialog({
  stores,
  activeCount,
  onClose,
  onTransfer,
  onCreateStore,
}: TransferDialogProps) {
  const sorted = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [stores],
  )
  const [targetId, setTargetId] = useState(sorted[0]?.id ?? '')
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })

  const pendingCount = phase.kind === 'pick' && phase.pending ? phase.pending.length : activeCount
  const canTransfer = Boolean(targetId) && pendingCount > 0

  function runTransfer(mode: TransferMode) {
    if (!targetId) return
    const pending = phase.kind === 'pick' ? phase.pending : undefined
    const onlyIds = pending?.map((item) => item.id)
    const summary = onTransfer(targetId, mode, onlyIds)
    const targetName = sorted.find((store) => store.id === targetId)?.name ?? 'список'
    if (summary.leftoverItems.length === 0) {
      onClose()
      return
    }
    setPhase({
      kind: 'leftover',
      mode,
      leftover: summary.leftoverItems,
      transferredCount: summary.transferredCount,
      targetName,
    })
  }

  if (phase.kind === 'create') {
    return (
      <NameDialog
        title="Список для остатка"
        label="Название"
        placeholder="Например, Уже есть"
        confirmLabel="Создать"
        inputId="transfer-leftover-store"
        onClose={onClose}
        onConfirm={(name) => {
          onCreateStore(name, phase.leftover, phase.mode)
          onClose()
        }}
      />
    )
  }

  if (phase.kind === 'leftover') {
    const { leftover, transferredCount, targetName, mode } = phase
    return (
      <div className="overlay" role="presentation" onClick={onClose}>
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading title="Остались товары" onClose={onClose} />
          <p className="hint">
            {transferredCount > 0
              ? `В «${targetName}» ${mode === 'copy' ? 'скопировано' : 'перенесено'}: ${transferredCount}. `
              : `В «${targetName}» ничего не попало — нет подходящих отделов. `}
            Не назначено: {leftover.length}. Выберите другой список или создайте новый для остатка.
          </p>
          <ul className="sheet-list transfer-leftover-list">
            {leftover.slice(0, 8).map((item) => (
              <li key={item.id} className="hint">
                {itemLabel(item)}
              </li>
            ))}
            {leftover.length > 8 ? (
              <li className="hint">и ещё {leftover.length - 8}…</li>
            ) : null}
          </ul>
          <div className="choice-row">
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                const nextTarget = sorted.find((store) => store.id !== targetId)?.id ?? sorted[0]?.id ?? ''
                setTargetId(nextTarget)
                setPhase({ kind: 'pick', mode, pending: leftover })
              }}
            >
              В другой список
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setPhase({ kind: 'create', mode, leftover })}
            >
              Создать список
            </button>
          </div>
          <div className="dialog-actions dialog-actions-single">
            <button type="button" className="button-secondary" onClick={onClose}>
              Оставить здесь
            </button>
          </div>
        </div>
      </div>
    )
  }

  const lockedMode = phase.mode
  const isContinue = Boolean(phase.pending)

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading
          title={isContinue ? 'Куда ещё' : 'В другой список'}
          onClose={onClose}
        />
        {pendingCount > 0 ? (
          <p className="hint">
            {isContinue
              ? `Осталось ${pendingCount}. Попадут только товары, чьи отделы есть в выбранном списке.`
              : 'Попадут только некупленные товары с отделами, которые уже есть в целевом списке. Скопировать — останутся здесь. Перенести — уберутся из этого списка.'}
          </p>
        ) : (
          <p className="hint">Нет некупленных товаров. Купленные не копируются и не переносятся.</p>
        )}
        <p className="field-label">Куда</p>
        <ul className="choice-row sheet-list">
          {sorted.map((store) => (
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
          {lockedMode ? (
            <button
              type="button"
              className="button-primary"
              disabled={!canTransfer}
              onClick={() => runTransfer(lockedMode)}
            >
              {lockedMode === 'copy' ? 'Скопировать' : 'Перенести'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="button-primary"
                disabled={!canTransfer}
                onClick={() => runTransfer('copy')}
              >
                Скопировать
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={!canTransfer}
                onClick={() => runTransfer('move')}
              >
                Перенести
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
