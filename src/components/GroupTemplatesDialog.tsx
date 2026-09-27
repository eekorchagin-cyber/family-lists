import { useState } from 'react'
import { parseItem } from '../data/parseItem'
import { formatQty } from '../data/qty'
import { templateVisible } from '../data/templates'
import type { Category, NamedTemplate, Store, StoreGroup, StoreVisibility, TemplateItem } from '../types'

type Draft = {
  id?: string
  name: string
  items: TemplateItem[]
  visibility: StoreVisibility
  storeId?: string
}

type GroupTemplatesDialogProps = {
  group: StoreGroup
  stores?: Store[]
  categories: Category[]
  syncEnabled?: boolean
  myId?: string
  onClose: () => void
  onSave: (draft: Draft) => void
  onSaveStore: (storeId: string, draft: Draft) => void
  onDelete: (templateId: string) => void
}

export function GroupTemplatesDialog({
  group,
  stores = [],
  categories,
  syncEnabled = false,
  myId,
  onClose,
  onSave,
  onSaveStore,
  onDelete,
}: GroupTemplatesDialogProps) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [product, setProduct] = useState('')
  const options = categories.filter((category) => !category.storeId)
  const categoryOptions = options.length > 0 ? options : categories
  const [categoryId, setCategoryId] = useState(categoryOptions[0]?.id ?? 'other')
  const templates = (group.templates ?? []).filter((template) => templateVisible(template, myId))
  const rows = [
    ...templates.map((template) => ({ template, storeId: undefined as string | undefined, storeName: undefined as string | undefined })),
    ...stores.flatMap((store) =>
      (store.templates ?? [])
        .filter((template) => templateVisible(template, myId))
        .map((template) => ({ template, storeId: store.id, storeName: store.name })),
    ),
  ]

  function startCreate() {
    setProduct('')
    setDraft({
      name: `Шаблон ${(group.templates?.length ?? 0) + 1}`,
      items: [],
      visibility: 'home',
    })
  }

  function startEdit(template: NamedTemplate, storeId?: string) {
    setProduct('')
    setDraft({
      id: template.id,
      name: template.name,
      items: template.items.map((item) => ({ ...item })),
      visibility: template.visibility === 'private' ? 'private' : 'home',
      ...(storeId ? { storeId } : {}),
    })
  }

  function addProduct() {
    if (!draft) return
    const parsed = parseItem(product)
    if (!parsed) return
    setDraft({
      ...draft,
      items: [...draft.items, { ...parsed, categoryId }],
    })
    setProduct('')
  }

  return (
    <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{draft ? (draft.id ? 'Шаблон' : 'Новый шаблон') : `Шаблоны · ${group.name}`}</h2>
        {draft ? (
          <>
            <label className="field-label" htmlFor="group-template-name">
              Название
            </label>
            <input
              id="group-template-name"
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
            {syncEnabled ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={draft.visibility === 'private' ? 'choice active' : 'choice'}
                    onClick={() => setDraft({ ...draft, visibility: 'private' })}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={draft.visibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => setDraft({ ...draft, visibility: 'home' })}
                  >
                    Весь дом
                  </button>
                </div>
              </>
            ) : null}
            <p className="field-label">Товары</p>
            {draft.items.length === 0 ? (
              <p className="hint">Добавьте хотя бы один товар. Можно сразу: Молоко: 2 шт</p>
            ) : (
              <ul className="template-list">
                {draft.items.map((item, index) => (
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
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: draft.items.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
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
                Добавить товар
              </button>
            </div>
            <div className="dialog-actions">
              <button type="button" className="button-secondary" onClick={() => setDraft(null)}>
                Назад
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={!draft.name.trim() || draft.items.length === 0}
                onClick={() => {
                  if (draft.storeId) onSaveStore(draft.storeId, draft)
                  else onSave(draft)
                  setDraft(null)
                }}
              >
                Сохранить
              </button>
            </div>
          </>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="hint">В группе пока нет шаблонов. Шаблон можно подставить в любой список.</p>
            ) : (
              <ul className="template-list">
                {rows.map(({ template, storeId, storeName }) => (
                  <li key={`${storeId ?? group.id}:${template.id}`} className="template-row">
                    <div className="template-copy">
                      <span>{template.name}</span>
                      <span className="settings-nav-hint">
                        {storeName ? `из списка ${storeName} · ` : ''}
                        товаров: {template.items.length}
                        {syncEnabled
                          ? template.visibility === 'private'
                            ? ' · Только я'
                            : ' · Весь дом'
                          : ''}
                      </span>
                    </div>
                    <button type="button" className="button-secondary template-action" onClick={() => startEdit(template, storeId)}>
                      Изменить
                    </button>
                    <button
                      type="button"
                      className="qty-button"
                      aria-label={`Удалить шаблон ${template.name}`}
                      onClick={() => onDelete(template.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="choice-row">
              <button type="button" className="button-primary" onClick={startCreate}>
                Создать шаблон
              </button>
              <button type="button" className="button-secondary" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
