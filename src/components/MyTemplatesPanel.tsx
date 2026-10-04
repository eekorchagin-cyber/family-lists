import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogCategoryId } from '../data/catalog'
import { includesRu } from '../data/text'
import { foldersForUser } from '../data/myTemplates'
import { parseItem } from '../data/parseItem'
import { formatQty, lastUnit, parseQty, rememberUnit } from '../data/qty'
import {
  findTemplateNameConflict,
  templateNameConflictMessage,
} from '../data/templates'
import type {
  CatalogEntry,
  Category,
  ParsedItem,
  Store,
  StoreGroup,
  TemplateFolder,
  TemplateItem,
} from '../types'
import { CategoryMark } from './CategoryMark'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogHeading } from './DialogHeading'
import { DoneButton } from './DoneButton'
import { LongPressButton } from './LongPressButton'
import { NameDialog } from './NameDialog'
import { NewCategoryDialog } from './NewCategoryDialog'
import { QtyRow } from './QtyRow'

type Draft = {
  folderId: string
  id?: string
  name: string
  items: TemplateItem[]
}

function CommandButton({
  label,
  ariaLabel,
  danger,
  onClick,
}: {
  label: string
  ariaLabel?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={
        danger
          ? 'command-button command-button--text command-button--danger'
          : 'command-button command-button--text'
      }
      aria-label={ariaLabel ?? label}
      onClick={onClick}
    >
      <span className="command-label">{label}</span>
    </button>
  )
}

function ProductStep({
  title,
  initialQty,
  initialUnit,
  initialCategoryId,
  categoryKnown = false,
  categories,
  onAddCategory,
  onDone,
  onRemove,
}: {
  title: string
  initialQty: number
  initialUnit: string
  initialCategoryId: string
  categoryKnown?: boolean
  categories: Category[]
  onAddCategory: (name: string, color: string, icon?: string) => string
  onDone: (value: { qty: number; unit: string; categoryId: string }) => void
  onRemove?: () => void
}) {
  const [qtyText, setQtyText] = useState(formatQty(initialQty))
  const [unit, setUnit] = useState(initialUnit)
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [pickingCategory, setPickingCategory] = useState(!categoryKnown)
  const [addingCategory, setAddingCategory] = useState(false)
  const qty = parseQty(qtyText)
  const selectedCategory = categories.find((category) => category.id === categoryId)

  return (
    <>
      <div className="product-head">
        <h2 className="product-title">{title}</h2>
        <DoneButton
          disabled={!categoryId || qty === null}
          onClick={() => {
            const nextUnit = unit.trim() || lastUnit()
            rememberUnit(nextUnit)
            onDone({ categoryId, qty: qty ?? initialQty, unit: nextUnit })
          }}
        />
      </div>
      <label className="field-label" htmlFor="qty">
        Количество
      </label>
      <QtyRow
        qtyText={qtyText}
        unit={unit}
        onQtyText={setQtyText}
        onUnit={setUnit}
        onCommit={() => {
          if (qty === null) setQtyText(formatQty(initialQty))
          else setQtyText(formatQty(qty))
        }}
      />
      <p className="field-label">Категория</p>
      {!pickingCategory && selectedCategory ? (
        <div className="category-chosen">
          <button
            type="button"
            className="category-chip active"
            onClick={() => setPickingCategory(true)}
          >
            <CategoryMark category={selectedCategory} />
            <span className="category-chip-name">{selectedCategory.name}</span>
          </button>
          <button type="button" className="category-change" onClick={() => setPickingCategory(true)}>
            Изменить
          </button>
        </div>
      ) : (
        <>
          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  className={categoryId === category.id ? 'category-chip active' : 'category-chip'}
                  onClick={() => {
                    setCategoryId(category.id)
                    if (categoryKnown) setPickingCategory(false)
                  }}
                >
                  <CategoryMark category={category} />
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="button-secondary add-category" onClick={() => setAddingCategory(true)}>
            Новая категория
          </button>
        </>
      )}
      {onRemove ? (
        <button type="button" className="button-secondary add-category" onClick={onRemove}>
          Убрать
        </button>
      ) : null}
      {addingCategory ? (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (id) {
              setCategoryId(id)
              if (categoryKnown) setPickingCategory(false)
            }
            setAddingCategory(false)
          }}
        />
      ) : null}
    </>
  )
}

type Menu =
  | { kind: 'folder'; folder: TemplateFolder }
  | { kind: 'template'; folderId: string; template: { id: string; name: string; items: TemplateItem[] } }

type MyTemplatesPanelProps = {
  folders: TemplateFolder[]
  stores?: Store[]
  groups?: StoreGroup[]
  categories: Category[]
  catalog: CatalogEntry[]
  myId?: string
  editing: boolean
  adding: boolean
  createRequest?: number
  onEditingChange: (editing: boolean) => void
  onAddingChange: (adding: boolean) => void
  onTitleChange: (title: string | null) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
  onAddFolder: (name: string) => void
  onRenameFolder: (folderId: string, name: string) => void
  onDeleteFolder: (folderId: string) => void
  onSaveTemplate: (
    folderId: string,
    draft: { id?: string; name: string; items: TemplateItem[] },
  ) => boolean | void
  onDeleteTemplate: (folderId: string, templateId: string) => void
}

export function MyTemplatesPanel({
  folders,
  stores = [],
  groups = [],
  categories,
  catalog,
  myId,
  editing,
  adding,
  createRequest = 0,
  onEditingChange,
  onAddingChange,
  onTitleChange,
  onAddCategory,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onSaveTemplate,
  onDeleteTemplate,
}: MyTemplatesPanelProps) {
  const visible = foldersForUser(folders, myId)
  const categoryOptions = useMemo(() => {
    const options = categories.filter((category) => !category.storeId)
    const source = options.length > 0 ? options : categories
    return [...source].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [categories])
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<ParsedItem | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [naming, setNaming] = useState<{ id?: string; name: string } | null>(null)
  const [namingTemplate, setNamingTemplate] = useState<Draft | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const seenCreate = useRef(0)
  const [removing, setRemoving] = useState<
    { kind: 'folder'; id: string; name: string } | { kind: 'template'; folderId: string; id: string; name: string } | null
  >(null)

  const knownNames = useMemo(() => {
    const names = new Set<string>()
    for (const entry of catalog) names.add(entry.name)
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [catalog])
  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    return knownNames.filter((name) => includesRu(name, query)).slice(0, 8)
  }, [knownNames, query])

  useEffect(() => {
    if (!editing) {
      setDraft(null)
      setPending(null)
      setEditIndex(null)
      onTitleChange(null)
    }
  }, [editing, onTitleChange])

  useEffect(() => {
    onAddingChange(pending !== null)
  }, [onAddingChange, pending])

  useEffect(() => {
    if (!adding) setPending(null)
  }, [adding])

  useEffect(() => {
    if (createRequest <= seenCreate.current) return
    seenCreate.current = createRequest
    setNaming({ name: '' })
  }, [createRequest])

  function categoryFor(name: string) {
    const ids = categoryOptions.map((category) => category.id)
    const fromCatalog = catalogCategoryId(catalog, name, ids)
    return {
      id: fromCatalog ?? categoryOptions[0]?.id ?? '',
      known: Boolean(fromCatalog),
    }
  }

  function commitDraft(next: Draft) {
    const id = next.id ?? crypto.randomUUID()
    const saved = { ...next, id, name: next.name.trim() }
    setDraft(saved)
    onTitleChange(saved.name || null)
    if (!saved.name || (saved.items.length === 0 && !next.id)) return
    onSaveTemplate(saved.folderId, saved)
  }

  function openFill(next: Draft) {
    if (!next.name.trim()) {
      setNamingTemplate(next)
      return
    }
    setQuery('')
    setPending(null)
    setEditIndex(null)
    commitDraft(next)
    onEditingChange(true)
  }

  function startAdd(parsed: { name: string; qty: number; unit: string }) {
    setPending(parsed)
    setQuery('')
  }

  if (draft && pending) {
    const category = categoryFor(pending.name)
    return (
      <section className="settings-block">
        <ProductStep
          title={pending.name}
          initialQty={pending.qty}
          initialUnit={pending.unit}
          initialCategoryId={category.id}
          categoryKnown={category.known}
          categories={categoryOptions}
          onAddCategory={onAddCategory}
          onDone={({ qty, unit, categoryId }) => {
            commitDraft({
              ...draft,
              items: [...draft.items, { name: pending.name, qty, unit, categoryId }],
            })
            setPending(null)
          }}
        />
      </section>
    )
  }

  if (draft) {
    const rows = draft.items.map((item, index) => ({ item, index }))
    const grouped = categoryOptions
      .map((category) => ({
        category,
        items: rows.filter((row) => row.item.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0)
    const knownIds = new Set(categoryOptions.map((category) => category.id))
    const unmatched = rows.filter((row) => !knownIds.has(row.item.categoryId))
    const editing = editIndex !== null ? draft.items[editIndex] : undefined
    return (
      <section className="settings-block">
        <div className="search-panel">
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault()
              const parsed = parseItem(query)
              if (!parsed) return
              startAdd(parsed)
            }}
          >
            <input
              className="input search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название"
              aria-label="Поиск товара"
              autoComplete="off"
            />
            <button type="submit" className="search-submit" disabled={!query.trim()}>
              Далее
            </button>
          </form>
        </div>
        {suggestions.length > 0 ? (
          <ul className="suggestions">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="suggestion"
                  onClick={() => {
                    const parsed = parseItem(query)
                    startAdd({ name, qty: parsed?.qty ?? 1, unit: parsed?.unit ?? lastUnit() })
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {draft.items.length === 0 ? (
          <div className="empty empty-store">
            <p>Шаблон пуст</p>
            <p className="hint">Введите товар и нажмите «Далее». Можно сразу: Рис: 1 кг</p>
          </div>
        ) : (
          <div className="groups">
            {grouped.map(({ category, items }) => (
              <section key={category.id} className="group">
                <h2 className="group-title">
                  <CategoryMark category={category} />
                  {category.name}
                </h2>
                <ul className="item-list">
                  {items.map(({ item, index }) => (
                    <li key={`${item.name}-${index}`}>
                      <LongPressButton
                        className="item-row"
                        ariaLabel={item.name}
                        onClick={() => setEditIndex(index)}
                        onLongPress={() => setEditIndex(index)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {unmatched.length > 0 ? (
              <section className="group">
                <h2 className="group-title">Другое</h2>
                <ul className="item-list">
                  {unmatched.map(({ item, index }) => (
                    <li key={`${item.name}-${index}`}>
                      <LongPressButton
                        className="item-row"
                        ariaLabel={item.name}
                        onClick={() => setEditIndex(index)}
                        onLongPress={() => setEditIndex(index)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
        {draft.id ? (
          <button
            type="button"
            className="button-danger add-category"
            onClick={() => {
              const id = draft.id
              if (!id) return
              setRemoving({
                kind: 'template',
                folderId: draft.folderId,
                id,
                name: draft.name,
              })
            }}
          >
            Удалить шаблон
          </button>
        ) : null}
        {editing && editIndex !== null ? (
          <div className="overlay" role="presentation" onClick={() => setEditIndex(null)}>
            <div className="dialog" onClick={(event) => event.stopPropagation()}>
              <ProductStep
                title={editing.name}
                initialQty={editing.qty}
                initialUnit={editing.unit}
                initialCategoryId={editing.categoryId}
                categoryKnown
                categories={categoryOptions}
                onAddCategory={onAddCategory}
                onDone={({ qty, unit, categoryId }) => {
                  commitDraft({
                    ...draft,
                    items: draft.items.map((item, index) =>
                      index === editIndex ? { ...item, qty, unit, categoryId } : item,
                    ),
                  })
                  setEditIndex(null)
                }}
                onRemove={() => {
                  commitDraft({
                    ...draft,
                    items: draft.items.filter((_, index) => index !== editIndex),
                  })
                  setEditIndex(null)
                }}
              />
            </div>
          </div>
        ) : null}
        {removing?.kind === 'template' ? (
          <ConfirmDialog
            title="Удалить шаблон?"
            text={`Шаблон «${removing.name}» исчезнет.`}
            confirmLabel="Удалить"
            onClose={() => setRemoving(null)}
            onConfirm={() => {
              onDeleteTemplate(removing.folderId, removing.id)
              setRemoving(null)
              setDraft(null)
              setPending(null)
              onEditingChange(false)
            }}
          />
        ) : null}
      </section>
    )
  }

  return (
    <section className="settings-block">
      {visible.length === 0 ? (
        <p className="hint">
          Нет групп. Нажмите «+», чтобы добавить группу, например «Продукты для приготовления блюд».
          Внутри неё — шаблон, например «Продукты для плова на 8 человек».
        </p>
      ) : (
        <ul className="store-list">
          {visible.flatMap((folder) => {
            const open = openId === folder.id
            const rows = [
              <li key={folder.id} className="store-row-wrap">
                <button
                  type="button"
                  className="store-row store-row--group"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : folder.id)}
                >
                  <span className="store-name">
                    <span className="store-group-chevron" aria-hidden="true">
                      {open ? '▾' : '▸'}
                    </span>
                    <span className="store-name-text">{folder.name}</span>
                    <span className="store-local-mark">{folder.templates.length}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="qty-button store-menu"
                  aria-label={`Изменить группу ${folder.name}`}
                  onClick={() => setMenu({ kind: 'folder', folder })}
                >
                  ⋯
                </button>
              </li>,
            ]
            if (!open) return rows
            for (const template of folder.templates) {
              rows.push(
                <li key={template.id} className="store-row-wrap store-row-wrap--nested">
                  <button
                    type="button"
                    className="store-row store-row--nested"
                    onClick={() =>
                      openFill({
                        folderId: folder.id,
                        id: template.id,
                        name: template.name,
                        items: template.items.map((item) => ({ ...item })),
                      })
                    }
                  >
                    <span className="store-name">
                      <span className="store-name-text">{template.name}</span>
                      {template.items.length > 0 ? (
                        <span className="store-local-mark">{template.items.length}</span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="qty-button store-menu"
                    aria-label={`Изменить шаблон ${template.name}`}
                    onClick={() => setMenu({ kind: 'template', folderId: folder.id, template })}
                  >
                    ⋯
                  </button>
                </li>,
              )
            }
            return rows
          })}
        </ul>
      )}
      {menu?.kind === 'folder' ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setMenu(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title={menu.folder.name} onClose={() => setMenu(null)} />
            <div className="command-row">
              <CommandButton
                label="Имя"
                ariaLabel="Переименовать"
                onClick={() => {
                  setNaming({ id: menu.folder.id, name: menu.folder.name })
                  setMenu(null)
                }}
              />
              <CommandButton
                label="Шаблон"
                ariaLabel="Новый шаблон"
                onClick={() => {
                  const folderId = menu.folder.id
                  setOpenId(folderId)
                  setMenu(null)
                  openFill({ folderId, name: '', items: [] })
                }}
              />
              <CommandButton
                label="Удалить"
                ariaLabel="Удалить группу"
                danger
                onClick={() => {
                  setRemoving({ kind: 'folder', id: menu.folder.id, name: menu.folder.name })
                  setMenu(null)
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {menu?.kind === 'template' ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setMenu(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title={menu.template.name} onClose={() => setMenu(null)} />
            <div className="command-row">
              <CommandButton
                label="Имя"
                ariaLabel="Переименовать"
                onClick={() => {
                  const folderId = menu.folderId
                  const template = menu.template
                  setMenu(null)
                  setNamingTemplate({
                    folderId,
                    id: template.id,
                    name: template.name,
                    items: template.items.map((item) => ({ ...item })),
                  })
                }}
              />
              <CommandButton
                label="Изменить"
                onClick={() => {
                  const folderId = menu.folderId
                  const template = menu.template
                  setMenu(null)
                  openFill({
                    folderId,
                    id: template.id,
                    name: template.name,
                    items: template.items.map((item) => ({ ...item })),
                  })
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {namingTemplate ? (
        <NameDialog
          title={namingTemplate.name.trim() ? 'Шаблон' : 'Новый шаблон'}
          label="Название"
          placeholder="Продукты для плова на 8 человек"
          initial={namingTemplate.name}
          confirmLabel="Сохранить"
          validate={(name) => {
            const conflict = findTemplateNameConflict(
              name,
              { stores, groups, folders },
              namingTemplate.id,
            )
            return conflict ? templateNameConflictMessage(conflict) : null
          }}
          onClose={() => setNamingTemplate(null)}
          onConfirm={(name) => {
            const next = { ...namingTemplate, name }
            setNamingTemplate(null)
            if (namingTemplate.name.trim()) onSaveTemplate(next.folderId, next)
            else openFill(next)
          }}
        />
      ) : null}
      {naming ? (
        <NameDialog
          title={naming.id ? 'Группа шаблонов' : 'Новая группа шаблонов'}
          label="Название"
          placeholder="Продукты для приготовления блюд"
          initial={naming.name}
          confirmLabel="Сохранить"
          onClose={() => setNaming(null)}
          onConfirm={(name) => {
            if (naming.id) onRenameFolder(naming.id, name)
            else onAddFolder(name)
            setNaming(null)
          }}
        />
      ) : null}
      {removing ? (
        <ConfirmDialog
          title={removing.kind === 'folder' ? 'Удалить группу?' : 'Удалить шаблон?'}
          text={
            removing.kind === 'folder'
              ? `Группа «${removing.name}» и шаблоны внутри неё исчезнут.`
              : `Шаблон «${removing.name}» исчезнет из группы.`
          }
          confirmLabel="Удалить"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            if (removing.kind === 'folder') onDeleteFolder(removing.id)
            else onDeleteTemplate(removing.folderId, removing.id)
            setRemoving(null)
          }}
        />
      ) : null}
    </section>
  )
}
