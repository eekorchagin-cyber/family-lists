type ConfirmDialogProps = {
  title: string
  text: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint">{text}</p>
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="button-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
