import { useState } from 'react'
import { defaultCategoryId } from '../data/categories'
import { parseItem } from '../data/parseItem'
import { formatQty, lastUnit, parseQty, rememberUnit } from '../data/qty'
import type { Category, NamedTemplate, StoreVisibility, TemplateItem } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogHeading } from './DialogHeading'
import { QtyRow } from './QtyRow'
import { TemplateItemsByCategory } from './TemplateItemsByCategory'

type TemplateDraftDialogProps = {
  template: NamedTemplate
  categories: Category[]
  syncEnabled?: boolean
  validateName?: (name: string) => string | null
  onClose: () => void
  onSave: (draft: {
    id: string
    name: string
    items: TemplateItem[]
    visibility: StoreVisibility
  }) => void
  onDelete: (templateId: string) => void
}

export function TemplateDraftDialog({
  template,
  categories,
  syncEnabled = false,
  validateName,
  onClose,
  onSave,
  onDelete,
}: TemplateDraftDialogProps) {
  const categoryOptions = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const [name, setName] = useState(template.name)
  const [items, setItems] = useState<TemplateItem[]>(template.items.map((item) => ({ ...item })))
  const [visibility, setVisibility] = useState<StoreVisibility>(
    template.visibility === 'private' ? 'private' : 'home',
  )
  const [product, setProduct] = useState('')
  const [qtyText, setQtyText] = useState('1')
  const [unit, setUnit] = useState(lastUnit())
  const [categoryId, setCategoryId] = useState(defaultCategoryId(categoryOptions))
  const [confirming, setConfirming] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const qty = parseQty(qtyText)

  function confirmPosition() {
    const parsed = parseItem(product)
    if (!parsed || qty === null) return
    const nextUnit = unit.trim() || lastUnit() || 'шт'
    rememberUnit(nextUnit)
    setItems((current) => [
      ...current,
      { name: parsed.name, qty, unit: nextUnit, categoryId },
    ])
    setProduct('')
    setQtyText('1')
    setUnit(nextUnit)
  }

  return (
    <>
      <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading title="Шаблон" onClose={onClose} />
          <label className="field-label" htmlFor="list-template-edit-name">
            Название
          </label>
          <input
            id="list-template-edit-name"
            className="input"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (nameError) setNameError(null)
            }}
          />
          {nameError ? <p className="hint hint--error">{nameError}</p> : null}
          {syncEnabled ? (
            <>
              <p className="field-label">Кто видит</p>
              <div className="choice-row">
                <button
                  type="button"
                  className={visibility === 'private' ? 'choice active' : 'choice'}
                  onClick={() => setVisibility('private')}
                >
                  Только я
                </button>
                <button
                  type="button"
                  className={visibility === 'home' ? 'choice active' : 'choice'}
                  onClick={() => setVisibility('home')}
                >
                  Весь дом
                </button>
              </div>
            </>
          ) : null}
          <p className="field-label">Товары в шаблоне</p>
          {items.length === 0 ? (
            <p className="hint">Позиций пока нет. Добавьте название, количество и отдел ниже.</p>
          ) : (
            <TemplateItemsByCategory
              items={items}
              categories={categoryOptions}
              onRemove={(index) =>
                setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
            />
          )}
          <div className="template-add">
            <p className="field-label">Добавить позицию:</p>
            <input
              className="input"
              value={product}
              placeholder="Название товара"
              aria-label="Название товара"
              onChange={(event) => setProduct(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  confirmPosition()
                }
              }}
            />
            <p className="field-label">Количество</p>
            <QtyRow
              qtyText={qtyText}
              unit={unit}
              onQtyText={setQtyText}
              onUnit={setUnit}
              onCommit={() => {
                if (qty === null) setQtyText('1')
                else setQtyText(formatQty(qty))
              }}
            />
            {categoryOptions.length > 0 ? (
              <select
                className="input"
                aria-label="Категория товара"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={confirmPosition}
              disabled={!product.trim() || qty === null}
            >
              Подтвердить
            </button>
          </div>
          <div className="dialog-actions dialog-actions-single">
            <button
              type="button"
              className="button-primary"
              disabled={!name.trim() || items.length === 0}
              onClick={() => {
                const trimmed = name.trim()
                if (!trimmed || items.length === 0) return
                const problem = validateName?.(trimmed) ?? null
                if (problem) {
                  setNameError(problem)
                  return
                }
                setNameError(null)
                onSave({ id: template.id, name: trimmed, items, visibility })
              }}
            >
              Сохранить шаблон
            </button>
          </div>
          <button type="button" className="button-danger add-category" onClick={() => setConfirming(true)}>
            Удалить шаблон
          </button>
        </div>
      </div>
      {confirming ? (
        <ConfirmDialog
          title="Удалить шаблон?"
          text={`Шаблон «${name.trim() || template.name}» исчезнет.`}
          confirmLabel="Удалить"
          onClose={() => setConfirming(false)}
          onConfirm={() => onDelete(template.id)}
        />
      ) : null}
    </>
  )
}
