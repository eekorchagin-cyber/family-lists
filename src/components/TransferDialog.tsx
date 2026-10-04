import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
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
  /** Остаток уже есть: отметить купленным, из списка не удалять. */
  onMarkLeftoverHave: (items: Item[]) => void
}

type Phase =
  | { kind: 'pick'; mode?: TransferMode; pending?: Item[] }
  | {
      kind: 'leftover'
      mode: TransferMode
      leftover: Item[]
      transferredCount: number
      targetName: string
      /** Больше некуда раздавать — только сохранить остаток. */
      exhausted?: boolean
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
  onMarkLeftoverHave,
}: TransferDialogProps) {
  const sorted = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [stores],
  )
  const [targetId, setTargetId] = useState(sorted[0]?.id ?? '')
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  /** Списки, куда в этой раздаче уже попали товары — повторно не предлагаем. */
  const [filledStoreIds, setFilledStoreIds] = useState<string[]>([])

  const pendingItems = phase.kind === 'pick' ? phase.pending : undefined
  const pendingCount = pendingItems ? pendingItems.length : activeCount
  const freeStores = sorted.filter((store) => !filledStoreIds.includes(store.id))
  const targetFilled = Boolean(targetId) && filledStoreIds.includes(targetId)
  const canTransfer = Boolean(targetId) && pendingCount > 0 && !targetFilled
  /** Продолжение раздачи, а свободных списков больше нет — нужно сохранить остаток. */
  const stuckWithRemainder =
    Boolean(pendingItems) && pendingCount > 0 && freeStores.length === 0

  function openRemainderSave(mode: TransferMode, leftover: Item[]) {
    setPhase({
      kind: 'leftover',
      mode,
      leftover,
      transferredCount: 0,
      targetName: '',
      exhausted: true,
    })
  }

  function runTransfer(mode: TransferMode) {
    if (!targetId || filledStoreIds.includes(targetId)) return
    const pending = phase.kind === 'pick' ? phase.pending : undefined
    const onlyIds = pending?.map((item) => item.id)
    const summary = onTransfer(targetId, mode, onlyIds)
    const targetName = sorted.find((store) => store.id === targetId)?.name ?? 'список'
    const nextFilled =
      summary.transferredCount > 0 || summary.alreadyPresentCount > 0
        ? filledStoreIds.includes(targetId)
          ? filledStoreIds
          : [...filledStoreIds, targetId]
        : filledStoreIds
    if (nextFilled !== filledStoreIds) {
      setFilledStoreIds(nextFilled)
    }
    if (summary.leftoverItems.length === 0) {
      onClose()
      return
    }
    const stillFree = sorted.some((store) => !nextFilled.includes(store.id))
    // Сразу после записи данных, чтобы экран остатка не потерялся при перерисовке списка
    flushSync(() => {
      setPhase({
        kind: 'leftover',
        mode,
        leftover: summary.leftoverItems,
        transferredCount: summary.transferredCount,
        targetName,
        exhausted: !stillFree,
      })
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
    const { leftover, transferredCount, targetName, mode, exhausted } = phase
    return (
      <div className="overlay overlay--capture" role="presentation">
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading title="Остались товары" onClose={onClose} />
          <p className="hint">
            {exhausted
              ? `Раздача по спискам закончена. Осталось ${leftover.length} — сохраните отдельным списком или отметьте, что уже есть. `
              : transferredCount > 0
                ? `В «${targetName}» ${mode === 'copy' ? 'скопировано' : 'перенесено'}: ${transferredCount}. `
                : `В «${targetName}» ничего нового не попало — подходящие товары там уже есть или нет отделов. `}
            {!exhausted
              ? `Не назначено: ${leftover.length}. «Остальное есть, очистить» — отметить остаток купленным (уже есть), из списка не удалять. Закрыть окно (←) — остаток как был.`
              : '«Остальное есть, очистить» — отметить остаток купленным, из списка не удалять. Закрыть окно (←) — остаток как был.'}
          </p>
          <ul className="transfer-leftover-list">
            {leftover.map((item) => (
              <li key={item.id}>{itemLabel(item)}</li>
            ))}
          </ul>
          <div className="choice-row">
            {!exhausted ? (
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  const justFilled =
                    transferredCount > 0 || filledStoreIds.includes(targetId)
                      ? targetId
                      : ''
                  const filled = new Set(
                    justFilled ? [...filledStoreIds, justFilled] : filledStoreIds,
                  )
                  const nextTarget =
                    sorted.find((store) => store.id !== targetId && !filled.has(store.id))
                      ?.id ??
                    sorted.find((store) => !filled.has(store.id))?.id ??
                    ''
                  if (!nextTarget) {
                    openRemainderSave(mode, leftover)
                    return
                  }
                  setTargetId(nextTarget)
                  setPhase({ kind: 'pick', mode, pending: leftover })
                }}
              >
                В другой список
              </button>
            ) : null}
            <button
              type="button"
              className={exhausted ? 'button-primary' : 'button-secondary'}
              onClick={() => setPhase({ kind: 'create', mode, leftover })}
            >
              Создать из этого список
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                onMarkLeftoverHave(leftover)
                onClose()
              }}
            >
              Остальное есть, очистить
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
          title={
            stuckWithRemainder
              ? 'Остались товары'
              : isContinue
                ? 'Куда ещё'
                : 'В другой список'
          }
          onClose={onClose}
        />
        {stuckWithRemainder ? (
          <p className="hint">
            Все доступные списки уже получили товары. Осталось {pendingCount} — сохраните
            отдельным списком или отметьте, что уже есть.
          </p>
        ) : pendingCount > 0 ? (
          <p className="hint">
            {isContinue
              ? `Осталось ${pendingCount}. Попадут только товары, чьи отделы есть в выбранном списке. С пометкой «уже» — в этой раздаче уже получали, повторно не копируем.`
              : 'Попадут только некупленные товары с отделами, которые уже есть в целевом списке. Скопировать — останутся здесь. Перенести — уберутся из этого списка. Если товар в цели уже есть — второй раз не копируется.'}
          </p>
        ) : (
          <p className="hint">Нет некупленных товаров. Купленные не копируются и не переносятся.</p>
        )}
        {!stuckWithRemainder ? (
          <>
            <p className="field-label">Куда</p>
            <ul className="choice-row sheet-list">
              {sorted.map((store) => {
                const received = filledStoreIds.includes(store.id)
                const classes = [
                  'choice',
                  store.id === targetId && !received ? 'active' : '',
                  received ? 'choice--received' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <li key={store.id}>
                    <button
                      type="button"
                      className={classes}
                      disabled={received}
                      aria-disabled={received}
                      onClick={() => {
                        if (!received) setTargetId(store.id)
                      }}
                    >
                      <span className="choice-label">{store.name}</span>
                      {received ? <span className="choice-received-mark">уже</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : pendingItems ? (
          <ul className="transfer-leftover-list">
            {pendingItems.map((item) => (
              <li key={item.id}>{itemLabel(item)}</li>
            ))}
          </ul>
        ) : null}
        <div className="choice-row">
          {stuckWithRemainder && pendingItems && lockedMode ? (
            <>
              <button
                type="button"
                className="button-primary"
                onClick={() => setPhase({ kind: 'create', mode: lockedMode, leftover: pendingItems })}
              >
                Создать из этого список
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  onMarkLeftoverHave(pendingItems)
                  onClose()
                }}
              >
                Остальное есть, очистить
              </button>
            </>
          ) : lockedMode ? (
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
