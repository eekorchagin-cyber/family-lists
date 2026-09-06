import { formatQty, parseQty, roundQty } from '../data/qty'

type QtyRowProps = {
  qtyText: string
  unit: string
  onQtyText: (value: string) => void
  onUnit: (value: string) => void
  onCommit: () => void
}

export function QtyRow({ qtyText, unit, onQtyText, onUnit, onCommit }: QtyRowProps) {
  const qty = parseQty(qtyText)

  function step(delta: number) {
    const current = qty ?? 1
    onQtyText(formatQty(Math.max(0.1, roundQty(current + delta))))
  }

  return (
    <div className="qty-row">
      <button type="button" className="qty-button" onClick={() => step(-1)} aria-label="Меньше">
        −
      </button>
      <input
        id="qty"
        className="input qty-input"
        inputMode="decimal"
        value={qtyText}
        aria-label="Количество"
        onChange={(event) => onQtyText(event.target.value)}
        onBlur={onCommit}
      />
      <button type="button" className="qty-button" onClick={() => step(1)} aria-label="Больше">
        +
      </button>
      <input
        className="input unit-input"
        value={unit}
        onChange={(event) => onUnit(event.target.value)}
        onBlur={onCommit}
        aria-label="Единица"
      />
    </div>
  )
}
