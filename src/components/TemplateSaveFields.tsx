import { foldersForUser } from '../data/myTemplates'
import {
  sameSaveTarget,
  templateSaveChoices,
  type TemplateSaveTarget,
} from '../data/templates'
import type { Store, StoreGroup, StoreVisibility, TemplateFolder } from '../types'

type TemplateSaveFieldsProps = {
  store: Pick<Store, 'groupId'>
  groups: StoreGroup[]
  folders: TemplateFolder[]
  myId?: string
  target: TemplateSaveTarget
  onTarget: (target: TemplateSaveTarget) => void
  syncEnabled: boolean
  visibility: StoreVisibility
  onVisibility: (visibility: StoreVisibility) => void
}

export function TemplateSaveFields({
  store,
  groups,
  folders,
  myId,
  target,
  onTarget,
  syncEnabled,
  visibility,
  onVisibility,
}: TemplateSaveFieldsProps) {
  const choices = templateSaveChoices(store, groups, foldersForUser(folders, myId))
  const own = choices.filter((choice) => choice.target.kind !== 'folder')
  const mine = choices.filter((choice) => choice.target.kind === 'folder')
  function choiceButton(choice: (typeof choices)[number]) {
    const selected = sameSaveTarget(choice.target, target)
    return (
      <button
        key={
          choice.target.kind === 'folder'
            ? choice.target.folderId
            : choice.target.kind === 'group'
              ? choice.target.groupId
              : 'store'
        }
        type="button"
        className={selected ? 'choice active' : 'choice'}
        aria-pressed={selected}
        onClick={() => onTarget(choice.target)}
      >
        {choice.label}
      </button>
    )
  }
  return (
    <>
      <p className="field-label">Куда сохранить</p>
      <div className="choice-row">{own.map(choiceButton)}</div>
      {mine.length > 0 ? (
        <>
          <p className="field-label">Мои группы шаблонов</p>
          <div className="choice-row">{mine.map(choiceButton)}</div>
        </>
      ) : null}
      {target.kind === 'folder' ? (
        <p className="hint">Группа в «Мои шаблоны» видна только вам.</p>
      ) : syncEnabled ? (
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
      ) : null}
    </>
  )
}
