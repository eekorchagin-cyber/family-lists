import type { SharedTemplate } from '../data/templates'
import { DialogHeading } from './DialogHeading'
import type { NamedTemplate, TemplateFolder } from '../types'

type MyTemplateRow = {
  folder: TemplateFolder
  template: NamedTemplate
}

type ApplyTemplateDialogProps = {
  templates: SharedTemplate[]
  myRows: MyTemplateRow[]
  onApply: (templateId: string) => void
  onClose: () => void
}

function TemplatePick({
  name,
  source,
  personal,
  onApply,
}: {
  name: string
  source?: string
  personal?: boolean
  onApply: () => void
}) {
  const label = source ? `Добавить в список: ${name}, ${source}` : `Добавить в список: ${name}`
  return (
    <li className="template-pick-row">
      <span className="template-pick-name">{name}</span>
      {personal ? (
        <span className="store-local-mark store-local-mark--icon" title="личное">
          <span aria-hidden="true">🔒</span>
          <span className="visually-hidden">личное</span>
        </span>
      ) : null}
      <button type="button" className="qty-button store-menu" aria-label={label} onClick={onApply}>
        <span aria-hidden="true">↓</span>
      </button>
    </li>
  )
}

export function ApplyTemplateDialog({
  templates,
  myRows,
  onApply,
  onClose,
}: ApplyTemplateDialogProps) {
  const empty = myRows.length === 0 && templates.length === 0
  const sections = [
    myRows.length > 0
      ? {
          id: 'mine',
          title: 'Из моих шаблонов',
          rows: myRows.map(({ folder, template }) => ({
            id: template.id,
            name: template.name,
            source: folder.name,
            personal: true,
          })),
        }
      : null,
    templates.length > 0
      ? {
          id: 'place',
          title: 'Шаблоны этого списка',
          rows: templates.map(({ template }) => ({
            id: template.id,
            name: template.name,
            source: undefined,
            personal: template.visibility === 'private',
          })),
        }
      : null,
  ].filter((section) => section !== null)

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading title="Из шаблона" onClose={onClose} />
        {empty ? (
          <p className="hint">Пока нет шаблонов.</p>
        ) : (
          <div className="template-pick-groups">
            {sections.map((section) => (
              <section key={section.id} className="template-pick-group">
                <h3 className="template-pick-heading">{section.title}</h3>
                <ul className="template-list template-list--nested">
                  {section.rows.map((row) => (
                    <TemplatePick
                      key={row.id}
                      name={row.name}
                      source={row.source}
                      personal={row.personal}
                      onApply={() => onApply(row.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
