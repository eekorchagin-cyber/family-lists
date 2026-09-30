import { useState } from 'react'
import { parseItem } from '../data/parseItem'
import { formatQty } from '../data/qty'
import type { Category, NamedTemplate, StoreVisibility, TemplateItem } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogTitle } from './DialogTitle'

type TemplateDraftDialogProps = {
  template: NamedTemplate
  categories: Category[]
  syncEnabled?: boolean
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
  const [categoryId, setCategoryId] = useState(categoryOptions[0]?.id ?? 'other')
  const [confirming, setConfirming] = useState(false)

  function addProduct() {
    const parsed = parseItem(product)
    if (!parsed) return
    setItems((current) => [...current, { ...parsed, categoryId }])
    setProduct('')
  }

  return (
    <>
      <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogTitle title="Шаблон" onBack={onClose} />
          <label className="field-label" htmlFor="list-template-edit-name">
            Название
          </label>
          <input
            id="list-template-edit-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
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
          <p className="field-label">Товары</p>
          {items.length === 0 ? (
            <p className="hint">Добавьте хотя бы один товар. Можно сразу: Молоко: 2 шт</p>
          ) : (
            <ul className="template-list">
              {items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="template-row">
                  <div className="template-copy">
                    <span>
                      {item.name}: {formatQty(item.qty)} {item.unit}
                    </span>
                    <span className="settings-nav-hint">
                      {categoryOptions.find((category) => category.id === item.categoryId)?.name ??
                        'Без категории'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="qty-button"
                    aria-label={`Убрать ${item.name}`}
                    onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="template-add">
            <input
              className="input"
              value={product}
              placeholder="Товар или Товар: 2 шт"
              aria-label="Новый товар шаблона"
              onChange={(event) => setProduct(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addProduct()
                }
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
            <button type="button" className="button-secondary" onClick={addProduct} disabled={!product.trim()}>
              Добавить
            </button>
          </div>
          <div className="dialog-actions dialog-actions-single">
            <button
              type="button"
              className="button-primary"
              disabled={!name.trim() || items.length === 0}
              onClick={() => onSave({ id: template.id, name: name.trim(), items, visibility })}
            >
              Сохранить
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
