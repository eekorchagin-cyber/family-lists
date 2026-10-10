import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { ApplyTemplateDialog } from '../components/ApplyTemplateDialog'
import { TemplateFitDialog } from '../components/TemplateFitDialog'
import { DialogHeading } from '../components/DialogHeading'
import { DoneButton } from '../components/DoneButton'
import { Header } from '../components/Header'
import { LongPressButton } from '../components/LongPressButton'
import { LoyaltyCardSheet } from '../components/LoyaltyCardView'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { QtyRow } from '../components/QtyRow'
import { BackIcon, CardIcon, ClearBoughtIcon, SettingsIcon, TransferIcon } from '../components/NavIcons'
import { ImportListDialog, type ImportAction } from '../components/ImportListDialog'
import { TransferDialog } from '../components/TransferDialog'
import { categoryName, isLocalToStore } from '../data/categories'
import { playConfirmSound } from '../data/sounds'
import { foldersForUser } from '../data/myTemplates'
import { parseItem } from '../data/parseItem'
import { formatQty, lastUnit, parseQty, rememberUnit } from '../data/qty'
import { includesRu } from '../data/text'
import { resolveLoyaltyCard } from '../data/loyalty'
import {
  classifyTemplateItems,
  findTemplateNameConflict,
  placeTemplateTarget,
  templateNameConflictMessage,
  templatesForList,
  type TemplateSaveTarget,
} from '../data/templates'
import { TemplateSaveFields } from '../components/TemplateSaveFields'
import type { HomeMember } from '../data/sync/session'
import type { TransferSummary } from '../data/listTransfer'
import type {
  CatalogEntry,
  Category,
  Item,
  ParsedItem,
  Store,
  StoreGroup,
  StoreVisibility,
  TemplateFolder,
} from '../types'

type StoreScreenProps = {
  store: Store
  items: Item[]
  categories: Category[]
  knownCategories?: Category[]
  allNames: string[]
  catalog?: CatalogEntry[]
  onBack: () => void
  onOpenSettings: () => void
  onRenameStore: (name: string) => void
  onMarkBought: (itemId: string) => void
  onUnmarkBought: (itemId: string) => void
  onChangeCategory: (itemId: string, categoryId: string) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
  onStartAdd: (draft: ParsedItem) => void
  onUpdateItem: (itemId: string, patch: Partial<Pick<Item, 'name' | 'qty' | 'unit' | 'categoryId'>>) => void
  onClearBought: () => void
  completedEmpty?: boolean
  onSaveTemplate: (
    name: string,
    items?: Item[],
    visibility?: StoreVisibility,
    target?: TemplateSaveTarget,
  ) => void
  syncEnabled?: boolean
  members?: HomeMember[]
  myId?: string
  thisListUpdated?: boolean
  onDismissStoreUpdate?: () => void
  otherStores?: Store[]
  groups?: StoreGroup[]
  templateFolders?: TemplateFolder[]
  onApplyTemplate?: (templateId: string, mode?: 'all' | 'matching') => void
  onTransferToStore?: (
    storeId: string,
    mode: 'copy' | 'move',
    onlyItemIds?: string[],
  ) => TransferSummary
  onCreateStoreFromItems?: (
    name: string,
    items: Item[],
    removeFromSource?: boolean,
  ) => void
  onMarkItemsBought?: (itemIds: string[]) => void
  onImportLines?: (actions: ImportAction[]) => void
}

export function StoreScreen({
  store,
  items,
  categories,
  knownCategories = [],
  allNames,
  catalog = [],
  onBack,
  onOpenSettings,
  onRenameStore,
  onMarkBought,
  onUnmarkBought,
  onChangeCategory,
  onAddCategory,
  onStartAdd,
  onUpdateItem,
  onClearBought,
  completedEmpty = false,
  onSaveTemplate,
  syncEnabled = false,
  members = [],
  myId,
  thisListUpdated = false,
  onDismissStoreUpdate,
  otherStores = [],
  groups = [],
  templateFolders = [],
  onApplyTemplate,
  onTransferToStore,
  onCreateStoreFromItems,
  onMarkItemsBought,
  onImportLines,
}: StoreScreenProps) {
  const [query, setQuery] = useState('')
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState('')
  const [pickingCategory, setPickingCategory] = useState(false)
  const [qtyText, setQtyText] = useState('1')
  const [unit, setUnit] = useState('шт')
  const [addingCategory, setAddingCategory] = useState(false)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [templateVisibility, setTemplateVisibility] = useState<StoreVisibility>('home')
  const [saveTarget, setSaveTarget] = useState<TemplateSaveTarget>({ kind: 'store' })
  const [renamingStore, setRenamingStore] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showingCard, setShowingCard] = useState(false)
  const [pickingTemplate, setPickingTemplate] = useState(false)
  const [templateFit, setTemplateFit] = useState<{ id: string; names: string[] } | null>(null)
  const [transferring, setTransferring] = useState(false)
  const [importing, setImporting] = useState(false)
  const [completionArmed, setCompletionArmed] = useState(false)
  const completionHandled = useRef(false)
  const templateSnapshot = useRef<Item[] | null>(null)
  const completionKey = `pokupki-completion:${store.id}`

  const activeItems = useMemo(
    () => items.filter((item) => !item.bought),
    [items],
  )
  const boughtItems = useMemo(
    () => items.filter((item) => item.bought),
    [items],
  )
  const allDone = items.length > 0 && activeItems.length === 0
  const boughtFingerprint = useMemo(
    () =>
      boughtItems
        .map((item) => item.id)
        .sort()
        .join(','),
    [boughtItems],
  )
  const loyalty = useMemo(() => resolveLoyaltyCard(store, groups), [groups, store])
  const shared = useMemo(
    () => templatesForList(store, groups, myId),
    [groups, myId, store],
  )
  const myTemplateRows = useMemo(
    () =>
      foldersForUser(templateFolders, myId).flatMap((folder) =>
        folder.templates.map((template) => ({ folder, template })),
      ),
    [myId, templateFolders],
  )

  useEffect(() => {
    if (activeItems.length > 0) {
      completionHandled.current = false
      try {
        sessionStorage.removeItem(completionKey)
      } catch {
        /* ignore */
      }
    }
    if (!allDone) {
      setShowCompletion(false)
      setCompletionArmed(false)
      return
    }
    let dismissed = ''
    try {
      dismissed = sessionStorage.getItem(completionKey) ?? ''
    } catch {
      dismissed = ''
    }
    if (dismissed && dismissed === boughtFingerprint) {
      completionHandled.current = true
      setShowCompletion(false)
      return
    }
    if (!completionHandled.current) setShowCompletion(true)
  }, [allDone, activeItems.length, boughtFingerprint, completionKey])

  useEffect(() => {
    if (!showCompletion) {
      setCompletionArmed(false)
      return
    }
    setCompletionArmed(false)
    const timer = window.setTimeout(() => setCompletionArmed(true), 450)
    return () => window.clearTimeout(timer)
  }, [showCompletion])

  function blurActive() {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  }

  function rememberDismiss() {
    completionHandled.current = true
    try {
      sessionStorage.setItem(completionKey, boughtFingerprint)
    } catch {
      /* ignore */
    }
    setShowCompletion(false)
    setCompletionArmed(false)
    blurActive()
  }

  function dismissCompletion() {
    rememberDismiss()
  }

  const { grouped, unmatched } = useMemo(() => {
    const enabled = new Set(categories.map((category) => category.id))
    const known = new Map(knownCategories.map((category) => [category.id, category]))
    const groups = new Map<string, { category: Category; items: Item[] }>()
    const loose: Item[] = []
    for (const item of activeItems) {
      const category = known.get(item.categoryId)
      if (!category) {
        loose.push(item)
        continue
      }
      const group = groups.get(category.id)
      if (group) group.items.push(item)
      else groups.set(category.id, { category, items: [item] })
    }
    const ordered = [
      ...categories.flatMap((category) => {
        const group = groups.get(category.id)
        return group ? [group] : []
      }),
      ...[...groups.values()].filter((group) => !enabled.has(group.category.id)),
    ]
    return { grouped: ordered, unmatched: loose }
  }, [activeItems, categories, knownCategories])

  const suggestions = useMemo(() => {
    const needle = query.trim()
    if (!needle) return []
    return allNames.filter((name) => includesRu(name, needle)).slice(0, 8)
  }, [allNames, query])

  function openEdit(item: Item) {
    setEditItem(item)
    setEditName(item.name)
    setPickingCategory(false)
    setQtyText(formatQty(item.qty))
    setUnit(item.unit)
  }

  function commitQty() {
    if (!editItem) return
    const qty = parseQty(qtyText)
    if (qty === null) {
      setQtyText(formatQty(editItem.qty))
      setUnit(editItem.unit)
      return
    }
    const nextUnit = unit.trim() || lastUnit()
    rememberUnit(nextUnit)
    const nextName = editName.trim()
    if (!nextName) {
      setEditName(editItem.name)
      onUpdateItem(editItem.id, { qty, unit: nextUnit })
      setEditItem({ ...editItem, qty, unit: nextUnit })
      return
    }
    onUpdateItem(editItem.id, {
      qty,
      unit: nextUnit,
      ...(nextName !== editItem.name ? { name: nextName } : {}),
    })
    setEditItem({ ...editItem, name: nextName, qty, unit: nextUnit })
  }

  function closeEdit() {
    commitQty()
    setEditItem(null)
    setPickingCategory(false)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const draft = parseItem(query)
    if (!draft) return
    onStartAdd(draft)
    setQuery('')
  }

  return (
    <div className="screen">
      <Header
        title={store.name}
        updated={thisListUpdated}
        onTitleLongPress={() => setRenamingStore(true)}
        helpGuideIds={['guide-shopping', 'guide-categories', 'guide-transfer']}
        helpTitle="Покупки и распределение"
        left={
          <button
            type="button"
            className="icon-button header-back"
            onClick={() => {
              onDismissStoreUpdate?.()
              onBack()
            }}
            aria-label="К списку магазинов"
          >
            <BackIcon />
          </button>
        }
        right={
          <>
            {loyalty ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Бонусная карта"
                onClick={() => setShowingCard(true)}
              >
                <CardIcon />
              </button>
            ) : null}
            {otherStores.length > 0 && onTransferToStore ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Перенести некупленные в другой список"
                onClick={() => setTransferring(true)}
              >
                <TransferIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="icon-button icon-button--accent"
              aria-label="Удалить купленные из списка"
              disabled={boughtItems.length === 0}
              onClick={() => {
                const leave = allDone
                playConfirmSound('clear')
                onClearBought()
                if (leave) {
                  rememberDismiss()
                  onDismissStoreUpdate?.()
                  onBack()
                }
              }}
            >
              <ClearBoughtIcon />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Настройки списка"
              onClick={onOpenSettings}
            >
              <SettingsIcon />
            </button>
          </>
        }
      />

      <main className="content">
        <div className="search-panel">
          <form className="search-form" onSubmit={submitSearch}>
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
          <div className="store-extra-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setPickingTemplate(true)}
            >
              Из шаблона
            </button>
            {onImportLines ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => setImporting(true)}
              >
                Вставить список
              </button>
            ) : null}
          </div>
        </div>

        {loyalty ? (
          <button
            type="button"
            className="button-secondary loyalty-checkout"
            onClick={() => setShowingCard(true)}
          >
            Карта
          </button>
        ) : null}

        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="suggestion"
                  onClick={() => {
                    const draft = parseItem(query)
                    onStartAdd({
                      name,
                      qty: draft?.qty ?? 1,
                      unit: draft?.unit ?? lastUnit(),
                    })
                    setQuery('')
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          <div className="empty empty-store">
            {completedEmpty ? (
              <>
                <p className="empty-complete">Все исполнено</p>
                <p className="empty-thumb" aria-hidden="true">
                  👍
                </p>
              </>
            ) : null}
            <p>Список пуст</p>
          </div>
        ) : (
          <div className="groups">
            {grouped.map(({ category, items: categoryItems }) => (
              <section key={category.id} className="group">
                <h2 className={`group-title${isLocalToStore(category, store) ? ' group-title--local' : ''}`}>
                  <CategoryMark category={category} />
                  {categoryName(category, store)}
                </h2>
                <ul className="item-list">
                  {categoryItems.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row"
                        onClick={() => {
                          playConfirmSound('bought')
                          onMarkBought(item.id)
                        }}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
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

            {unmatched.length > 0 && (
              <section className="group">
                <h2 className="group-title">
                  <CategoryMark
                    category={{ name: 'Другое', color: '#6b7280', icon: 'other' }}
                  />
                  Другое
                </h2>
                <ul className="item-list">
                  {unmatched.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row"
                        onClick={() => {
                          playConfirmSound('bought')
                          onMarkBought(item.id)
                        }}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {boughtItems.length > 0 && (
              <section className="group">
                <h2 className="group-title">Купленные</h2>
                <ul className="item-list">
                  {boughtItems.map((item) => (
                    <li key={item.id}>
                      <LongPressButton
                        className="item-row bought"
                        onClick={() => onUnmarkBought(item.id)}
                        onLongPress={() => openEdit(item)}
                      >
                        <span className="item-main">
                          <span className="item-name">{item.name}</span>
                          <ItemMeta item={item} members={members} myId={myId} />
                        </span>
                        <span className="item-qty">
                          {formatQty(item.qty)} {item.unit}
                        </span>
                      </LongPressButton>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      {editItem && !addingCategory && (
        <div className="overlay" role="presentation" onClick={closeEdit}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading
              title="Товар"
              onClose={closeEdit}
              right={<DoneButton onClick={closeEdit} disabled={!editName.trim()} />}
            />
            <label className="field-label" htmlFor="edit-item-name">
              Название
            </label>
            <input
              id="edit-item-name"
              className="input"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onBlur={commitQty}
              autoComplete="off"
              autoCorrect="off"
            />
            <p className="field-label">Количество</p>
            <QtyRow
              qtyText={qtyText}
              unit={unit}
              onQtyText={setQtyText}
              onUnit={setUnit}
              onCommit={commitQty}
            />
            <p className="field-label">Категория</p>
            {(() => {
              const current = items.find((item) => item.id === editItem.id) ?? editItem
              const selected = categories.find((category) => category.id === current.categoryId)
              if (!pickingCategory && selected) {
                return (
                  <div className="category-chosen">
                    <button
                      type="button"
                      className="category-chip active"
                      onClick={() => setPickingCategory(true)}
                    >
                      <CategoryMark category={selected} />
                      <span className="category-chip-name">{categoryName(selected, store)}</span>
                    </button>
                    <button
                      type="button"
                      className="category-change"
                      onClick={() => setPickingCategory(true)}
                    >
                      Изменить
                    </button>
                  </div>
                )
              }
              return (
                <>
                  <ul className="category-list sheet-list">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <button
                          type="button"
                          className={
                            current.categoryId === category.id
                              ? 'category-chip active'
                              : 'category-chip'
                          }
                          onClick={() => {
                            onChangeCategory(editItem.id, category.id)
                            setPickingCategory(false)
                          }}
                        >
                          <CategoryMark category={category} />
                          {categoryName(category, store)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="button-secondary sheet-extra"
                    onClick={() => setAddingCategory(true)}
                  >
                    Новая категория
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {addingCategory && (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (editItem && id) onChangeCategory(editItem.id, id)
            setAddingCategory(false)
            setPickingCategory(false)
          }}
        />
      )}

      {showCompletion && allDone && !editItem && !addingCategory && !namingTemplate && !showingCard && (
        <div className="overlay overlay--capture" role="presentation">
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading
              title="Все товары куплены"
              onClose={() => {
                dismissCompletion()
                onDismissStoreUpdate?.()
                onBack()
              }}
            />
            <p className="hint">Что сделать со списком?</p>
            <div className="choice-row">
              {loyalty ? (
                <button
                  type="button"
                  className="button-primary"
                  disabled={!completionArmed}
                  onClick={() => {
                    if (!completionArmed) return
                    setShowingCard(true)
                  }}
                >
                  Бонусная карта
                </button>
              ) : null}
              <button
                type="button"
                className={loyalty ? 'button-secondary' : 'button-primary'}
                disabled={!completionArmed}
                onClick={() => {
                  if (!completionArmed) return
                  rememberDismiss()
                  playConfirmSound('clear')
                  onClearBought()
                  onDismissStoreUpdate?.()
                  onBack()
                }}
              >
                Стереть исполненное
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={!completionArmed}
                onClick={() => {
                  if (!completionArmed) return
                  dismissCompletion()
                }}
              >
                Оставить список
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={!completionArmed}
                onClick={() => {
                  if (!completionArmed) return
                  templateSnapshot.current = items.map((item) => ({ ...item }))
                  setTemplateVisibility('home')
                  setSaveTarget(placeTemplateTarget(store))
                  setShowCompletion(false)
                  setNamingTemplate(true)
                }}
              >
                Сохранить как шаблон
              </button>
            </div>
          </div>
        </div>
      )}

      {namingTemplate && (
        <NameDialog
          title="Новый шаблон"
          label="Название"
          placeholder="Например, На неделю"
          initial={`Шаблон ${(store.templates?.length ?? 0) + 1}`}
          confirmLabel="Сохранить"
          inputId="store-template-name"
          validate={(name) => {
            const conflict = findTemplateNameConflict(name, {
              stores: [store, ...otherStores],
              groups,
              folders: templateFolders,
            })
            return conflict ? templateNameConflictMessage(conflict) : null
          }}
          extra={
            <TemplateSaveFields
              store={store}
              groups={groups}
              folders={templateFolders}
              myId={myId}
              target={saveTarget}
              onTarget={setSaveTarget}
              syncEnabled={syncEnabled}
              visibility={templateVisibility}
              onVisibility={setTemplateVisibility}
            />
          }
          onClose={() => {
            setNamingTemplate(false)
            templateSnapshot.current = null
            if (allDone && !completionHandled.current) setShowCompletion(true)
          }}
          onConfirm={(name) => {
            onSaveTemplate(name, templateSnapshot.current ?? items, templateVisibility, saveTarget)
            templateSnapshot.current = null
            setNamingTemplate(false)
            rememberDismiss()
          }}
        />
      )}
      {renamingStore && (
        <NameDialog
          title="Название списка"
          label="Название"
          initial={store.name}
          confirmLabel="Сохранить"
          inputId="store-rename"
          onClose={() => setRenamingStore(false)}
          onConfirm={(name) => {
            onRenameStore(name)
            setRenamingStore(false)
          }}
        />
      )}
      {transferring && onTransferToStore && onCreateStoreFromItems && onMarkItemsBought && (
        <TransferDialog
          stores={otherStores}
          activeCount={activeItems.length}
          onClose={() => setTransferring(false)}
          onTransfer={onTransferToStore}
          onCreateStore={(name, leftover, mode) => {
            onCreateStoreFromItems(name, leftover, mode === 'move')
          }}
          onMarkLeftoverHave={(leftover) => {
            onMarkItemsBought(leftover.map((item) => item.id))
          }}
        />
      )}
      {importing && onImportLines ? (
        <ImportListDialog
          store={store}
          items={items}
          categories={knownCategories.length > 0 ? knownCategories : categories}
          catalog={catalog}
          onClose={() => setImporting(false)}
          onImport={(actions) => {
            onImportLines(actions)
            setImporting(false)
          }}
        />
      ) : null}
      {showingCard && loyalty ? (
        <LoyaltyCardSheet
          card={loyalty.card}
          source={loyalty.source}
          onClose={() => setShowingCard(false)}
        />
      ) : null}
      {templateFit ? (
        <TemplateFitDialog
          missingNames={templateFit.names}
          onMatching={() => {
            onApplyTemplate?.(templateFit.id, 'matching')
            setTemplateFit(null)
          }}
          onAll={() => {
            onApplyTemplate?.(templateFit.id, 'all')
            setTemplateFit(null)
          }}
          onClose={() => setTemplateFit(null)}
        />
      ) : null}
      {pickingTemplate ? (
        <ApplyTemplateDialog
          templates={shared}
          myRows={myTemplateRows}
          onApply={(templateId) => {
            const items =
              myTemplateRows.find((row) => row.template.id === templateId)?.template.items ??
              shared.find((row) => row.template.id === templateId)?.template.items
            setPickingTemplate(false)
            if (!items || !onApplyTemplate) return
            const fit = classifyTemplateItems(store, knownCategories, items)
            if (fit.missingCategoryNames.length === 0) {
              onApplyTemplate(templateId, 'all')
              return
            }
            setTemplateFit({ id: templateId, names: fit.missingCategoryNames })
          }}
          onClose={() => setPickingTemplate(false)}
        />
      ) : null}
    </div>
  )
}

function ItemMeta({
  item,
  members,
  myId,
}: {
  item: Item
  members: HomeMember[]
  myId?: string
}) {
  if (members.length === 0) return null
  const nameOf = (id?: string) => members.find((member) => member.id === id)?.displayName
  let text: string | null = null
  if (item.bought) {
    const name = nameOf(item.boughtBy)
    if (name) text = `куплено · ${name}`
  }
  if (!text) {
    const name = nameOf(item.addedBy)
    if (name && (members.length > 1 || item.addedBy !== myId)) {
      text = `добавлено · ${name}`
    }
  }
  if (!text) return null
  return <span className="item-meta">{text}</span>
}
