import { DialogHeading } from './DialogHeading'
import { ActionLabel } from './ActionLabel'

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
        <DialogHeading title={title} onClose={onClose} />
        <p className="hint">{text}</p>
        <div className="dialog-actions dialog-actions-single">
          <button type="button" className="button-danger" onClick={onConfirm} aria-label={confirmLabel}>
            <ActionLabel text={confirmLabel} />
          </button>
        </div>
      </div>
    </div>
  )
}
