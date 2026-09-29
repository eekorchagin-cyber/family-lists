type TemplateFitDialogProps = {
  missingNames: string[]
  onMatching: () => void
  onAll: () => void
  onClose: () => void
}

export function TemplateFitDialog({
  missingNames,
  onMatching,
  onAll,
  onClose,
}: TemplateFitDialogProps) {
  const list = missingNames.join(', ')
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>В списке нет таких отделов</h2>
        <p className="hint">Нет отделов: {list}. Эти товары могут не продаваться в этом магазине.</p>
        <div className="dialog-actions dialog-actions-single">
          <button type="button" className="button-secondary" onClick={onMatching}>
            Вставить только из имеющихся отделов
          </button>
          <button type="button" className="button-primary" onClick={onAll}>
            Вставить все и добавить отделы
          </button>
          <button type="button" className="button-secondary" onClick={onClose}>
            Не вставлять
          </button>
        </div>
      </div>
    </div>
  )
}
