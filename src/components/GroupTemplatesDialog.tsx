import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogHeading } from './DialogHeading'
import { defaultCategoryId } from '../data/categories'
import { parseItem } from '../data/parseItem'
import { formatQty, lastUnit, parseQty, rememberUnit } from '../data/qty'
import { QtyRow } from './QtyRow'
import { TemplateItemsByCategory } from './TemplateItemsByCategory'
import {
  findTemplateNameConflict,
  templateNameConflictMessage,
  templateVisible,
} from '../data/templates'
import type {
  Category,
  NamedTemplate,
  Store,
  StoreGroup,
  StoreVisibility,
  TemplateFolder,
  TemplateItem,
} from '../types'

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
  allStores?: Store[]
  allGroups?: StoreGroup[]
  templateFolders?: TemplateFolder[]
  categories: Category[]
  syncEnabled?: boolean
  myId?: string
  onClose: () => void
  onSave: (draft: Draft) => boolean | void
  onSaveStore: (storeId: string, draft: Draft) => boolean | void
  onDelete: (templateId: string) => void
  onMoveToStore?: (templateId: string, storeId: string) => boolean | void
  onMoveToGroup?: (templateId: string, groupId: string) => boolean | void
}

export function GroupTemplatesDialog({
  group,
  stores = [],
  allStores,
  allGroups,
  templateFolders = [],
  categories,
  syncEnabled = false,
  myId,
  onClose,
  onSave,
  onSaveStore,
  onDelete,
  onMoveToStore,
  onMoveToGroup,
}: GroupTemplatesDialogProps) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [menu, setMenu] = useState<{
    template: NamedTemplate
    storeId?: string
  } | null>(null)
  const [pickingStoreFor, setPickingStoreFor] = useState<NamedTemplate | null>(null)
  const [product, setProduct] = useState('')
  const [qtyText, setQtyText] = useState('1')
  const [unit, setUnit] = useState(lastUnit())
  const options = categories.filter((category) => !category.storeId)
  const categoryOptions = [...(options.length > 0 ? options : categories)].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru'),
  )
  const [categoryId, setCategoryId] = useState(defaultCategoryId(categoryOptions))
  const qty = parseQty(qtyText)
  const groupRows = (group.templates ?? [])
    .filter((template) => templateVisible(template, myId))
    .map((template) => ({ template, storeId: undefined as string | undefined, storeName: undefined as string | undefined }))
  const storeRows = stores.flatMap((store) =>
    (store.templates ?? [])
      .filter((template) => templateVisible(template, myId))
      .map((template) => ({ template, storeId: store.id, storeName: store.name })),
  )
  const empty = groupRows.length === 0 && storeRows.length === 0

  function templateMeta(template: NamedTemplate, storeName?: string) {
    const parts = [
      storeName ? `из списка «${storeName}»` : null,
      `товаров: ${template.items.length}`,
      syncEnabled ? (template.visibility === 'private' ? 'Только я' : 'Весь дом') : null,
    ].filter(Boolean)
    return parts.join(' · ')
  }

  function moveGroupTemplateToStore(template: NamedTemplate, storeId: string) {
    onMoveToStore?.(template.id, storeId)
    setPickingStoreFor(null)
    setMenu(null)
  }

  function requestMoveToStore(template: NamedTemplate) {
    if (stores.length === 0) return
    if (stores.length === 1) {
      moveGroupTemplateToStore(template, stores[0].id)
      return
    }
    setMenu(null)
    setPickingStoreFor(template)
  }

  function renderRow({
    template,
    storeId,
    storeName,
  }: {
    template: NamedTemplate
    storeId?: string
    storeName?: string
  }) {
    return (
      <li key={`${storeId ?? group.id}:${template.id}`} className="template-row">
        <div className="template-copy">
          <span>{template.name}</span>
          <span className="settings-nav-hint">{templateMeta(template, storeName)}</span>
        </div>
        <button
          type="button"
          className="qty-button store-menu"
          aria-label={`Меню шаблона ${template.name}`}
          onClick={() => setMenu({ template, storeId })}
        >
          ⋯
        </button>
      </li>
    )
  }

  function startCreate() {
    setProduct('')
    setNameError(null)
    setDraft({
      name: `Шаблон ${(group.templates?.length ?? 0) + 1}`,
      items: [],
      visibility: 'home',
    })
  }

  function startEdit(template: NamedTemplate, storeId?: string) {
    setProduct('')
    setNameError(null)
    setDraft({
      id: template.id,
      name: template.name,
      items: template.items.map((item) => ({ ...item })),
      visibility: template.visibility === 'private' ? 'private' : 'home',
      ...(storeId ? { storeId } : {}),
    })
  }

  function confirmPosition() {
    if (!draft) return
    const parsed = parseItem(product)
    if (!parsed || qty === null) return
    const nextUnit = unit.trim() || lastUnit() || 'шт'
    rememberUnit(nextUnit)
    setDraft({
      ...draft,
      items: [...draft.items, { name: parsed.name, qty, unit: nextUnit, categoryId }],
    })
    setProduct('')
    setQtyText('1')
    setUnit(nextUnit)
  }

  return (
    <>
    <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading
          title={draft ? (draft.id ? 'Шаблон' : 'Новый шаблон') : `Шаблоны · ${group.name}`}
          onClose={draft ? () => setDraft(null) : onClose}
        />
        {draft ? (
          <>
            <label className="field-label" htmlFor="group-template-name">
              Название
            </label>
            <input
              id="group-template-name"
              className="input"
              value={draft.name}
              onChange={(event) => {
                setDraft({ ...draft, name: event.target.value })
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
            <p className="field-label">Товары в шаблоне</p>
            {draft.items.length === 0 ? (
              <p className="hint">Позиций пока нет. Добавьте название, количество и отдел ниже.</p>
            ) : (
              <TemplateItemsByCategory
                items={draft.items}
                categories={categoryOptions}
                onRemove={(index) =>
                  setDraft({
                    ...draft,
                    items: draft.items.filter((_, itemIndex) => itemIndex !== index),
                  })
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
                disabled={!draft.name.trim() || draft.items.length === 0}
                onClick={() => {
                  if (!draft.name.trim() || draft.items.length === 0) return
                  const conflict = findTemplateNameConflict(
                    draft.name,
                    {
                      stores: allStores ?? stores,
                      groups: allGroups ?? [group],
                      folders: templateFolders,
                    },
                    draft.id,
                  )
                  if (conflict) {
                    setNameError(templateNameConflictMessage(conflict))
                    return
                  }
                  const ok = draft.storeId ? onSaveStore(draft.storeId, draft) : onSave(draft)
                  if (ok === false) return
                  setNameError(null)
                  setProduct('')
                  setDraft(null)
                }}
              >
                Сохранить шаблон
              </button>
            </div>
            {draft.id ? (
              <button type="button" className="button-danger add-category" onClick={() => setConfirming(true)}>
                Удалить шаблон
              </button>
            ) : null}
          </>
        ) : (
          <>
            {empty ? (
              <p className="hint">В группе пока нет шаблонов. Шаблон можно подставить в любой список.</p>
            ) : (
              <div className="template-pick-groups">
                <section className="template-pick-group">
                  <h3 className="template-pick-heading">Шаблоны группы</h3>
                  {groupRows.length === 0 ? (
                    <p className="hint">Пока нет общих шаблонов группы.</p>
                  ) : (
                    <ul className="template-list template-list--nested">
                      {groupRows.map(renderRow)}
                    </ul>
                  )}
                </section>
                <section className="template-pick-group">
                  <h3 className="template-pick-heading">Шаблоны списков</h3>
                  {storeRows.length === 0 ? (
                    <p className="hint">У списков этой группы своих шаблонов нет.</p>
                  ) : (
                    <ul className="template-list template-list--nested">
                      {storeRows.map(renderRow)}
                    </ul>
                  )}
                </section>
              </div>
            )}
            <div className="choice-row">
              <button type="button" className="button-primary" onClick={startCreate}>
                Создать шаблон
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    {confirming && draft?.id ? (
      <ConfirmDialog
        title="Удалить шаблон?"
        text={`Шаблон «${draft.name.trim() || 'без названия'}» исчезнет.`}
        confirmLabel="Удалить"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          const id = draft.id
          if (!id) return
          onDelete(id)
          setConfirming(false)
          setDraft(null)
        }}
      />
    ) : null}
    {menu ? (
      <div className="overlay overlay--capture" role="presentation" onClick={() => setMenu(null)}>
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading title={menu.template.name} onClose={() => setMenu(null)} />
          <div className="command-row">
            <button
              type="button"
              className="command-button command-button--text"
              onClick={() => {
                const { template, storeId } = menu
                setMenu(null)
                startEdit(template, storeId)
              }}
            >
              <span className="command-label">Изменить</span>
            </button>
          </div>
          <div className="command-row command-row--move">
            {menu.storeId ? (
              <button
                type="button"
                className="command-button command-button--text command-button--move"
                disabled={!onMoveToGroup}
                onClick={() => {
                  onMoveToGroup?.(menu.template.id, group.id)
                  setMenu(null)
                }}
              >
                <span className="command-label">Из списка в группу</span>
              </button>
            ) : (
              <button
                type="button"
                className="command-button command-button--text command-button--move"
                disabled={!onMoveToStore || stores.length === 0}
                onClick={() => requestMoveToStore(menu.template)}
              >
                <span className="command-label">Из группы в список</span>
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null}
    {pickingStoreFor ? (
      <div
        className="overlay overlay--capture"
        role="presentation"
        onClick={() => setPickingStoreFor(null)}
      >
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading
            title={`Куда перенести «${pickingStoreFor.name}»`}
            onClose={() => setPickingStoreFor(null)}
          />
          <p className="hint">Выберите список группы.</p>
          <ul className="template-list">
            {[...stores]
              .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
              .map((store) => (
                <li key={store.id} className="template-row">
                  <div className="template-copy">
                    <span>{store.name}</span>
                  </div>
                  <button
                    type="button"
                    className="button-secondary template-action"
                    onClick={() => moveGroupTemplateToStore(pickingStoreFor, store.id)}
                  >
                    Сюда
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    ) : null}
    </>
  )
}
