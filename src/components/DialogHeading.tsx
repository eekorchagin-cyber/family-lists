import { BackIcon } from './NavIcons'

export function DialogHeading({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="dialog-head">
      <button type="button" className="icon-button" onClick={onClose} aria-label="Назад">
        <BackIcon />
      </button>
      <h2>{title}</h2>
    </div>
  )
}
