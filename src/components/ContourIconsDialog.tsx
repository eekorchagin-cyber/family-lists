type ContourIconsDialogProps = {
  onUpdate: () => void
  onKeep: () => void
}

export function ContourIconsDialog({ onUpdate, onKeep }: ContourIconsDialogProps) {
  return (
    <div className="overlay" role="presentation" onClick={onKeep}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>Контурные значки</h2>
        <p className="hint">
          Заменить цветные значки на контурные там, где для названия есть такой значок.
          Уже контурные останутся без изменений.
        </p>
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onKeep}>
            Оставить
          </button>
          <button type="button" className="button-primary" onClick={onUpdate}>
            Обновить
          </button>
        </div>
      </div>
    </div>
  )
}
