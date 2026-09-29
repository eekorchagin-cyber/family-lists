import type { StoreVisibility } from '../types'

type TemplateSaveFieldsProps = {
  syncEnabled: boolean
  visibility: StoreVisibility
  onVisibility: (visibility: StoreVisibility) => void
}

export function TemplateSaveFields({
  syncEnabled,
  visibility,
  onVisibility,
}: TemplateSaveFieldsProps) {
  if (!syncEnabled) return null
  return (
    <>
      <p className="field-label">Кто видит</p>
      <div className="choice-row">
        <button
          type="button"
          className={visibility === 'private' ? 'choice active' : 'choice'}
          onClick={() => onVisibility('private')}
        >
          Только я
        </button>
        <button
          type="button"
          className={visibility === 'home' ? 'choice active' : 'choice'}
          onClick={() => onVisibility('home')}
        >
          Весь дом
        </button>
      </div>
    </>
  )
}
