type MergeDialogProps = {
  busy?: boolean
  onChoose: (mode: 'cloud' | 'device' | 'merge') => void
}

export function MergeDialog({ busy = false, onChoose }: MergeDialogProps) {
  return (
    <div className="overlay" role="presentation">
      <div className="dialog">
        <h2>Как сложить списки?</h2>
        <p className="hint">
          На этом телефоне и в облаке уже есть списки. Купленные товары никуда не пропадут.
        </p>
        <div className="choice-row">
          <button
            type="button"
            className="button-primary"
            disabled={busy}
            onClick={() => onChoose('merge')}
          >
            Объединить одинаковые имена
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => onChoose('cloud')}
          >
            Взять из облака
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => onChoose('device')}
          >
            Оставить с телефона
          </button>
        </div>
      </div>
    </div>
  )
}
