import { useEffect, useState } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { AddListCategoryDialog } from '../components/AddListCategoryDialog'
import { CategoryMark } from '../components/CategoryMark'
import { CategoryScopeDialog } from '../components/CategoryScopeDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { BackIcon } from '../components/NavIcons'
import { TransferDialog } from '../components/TransferDialog'
import { categoryName, isLocalToStore } from '../data/categories'
import type { Category, CategorySort, Item, Store, StoreVisibility } from '../types'

type ListSettingsSection = 'list' | 'categories' | 'templates' | 'transfer'

const SECTIONS: { id: ListSettingsSection; title: string; hint: string }[] = [
  { id: 'list', title: 'Список', hint: 'Название, кто видит и удаление' },
  { id: 'categories', title: 'Категории', hint: 'Отделы этого списка' },
  { id: 'templates', title: 'Шаблоны', hint: 'Заполнить список' },
  { id: 'transfer', title: 'В другой список', hint: 'Копирование и перенос' },
]

const SECTION_TITLES: Record<ListSettingsSection, string> = {
  list: 'Список',
  categories: 'Категории',
  templates: 'Шаблоны',
  transfer: 'В другой список',
}

function leftoverItemsHint(count: number): string {
  if (count === 0) return ''
  if (count === 1) return ' Товар останется в списке без категории.'
  return ` ${count} товаров останутся в списке без категории.`
}

function removeCategoryText(category: Category, store: Store, items: Item[]): string {
  const leftover = leftoverItemsHint(
    items.filter((item) => item.categoryId === category.id).length,
  )
  if (category.storeId === store.id) {
    return `Категория будет удалена.${leftover}`
  }
  return `Категория исчезнет из этого списка. В других списках она сохранится.${leftover}`
}

type ListSettingsScreenProps = {
  store: Store
  categories: Category[]
  unusedCategories: Category[]
  items: Item[]
  otherStores: Store[]
  activeCount: number
  onBack: () => void
  onRenameStore: (name: string) => void
  onDeleteStore: () => void
  onSort: (sort: CategorySort) => void
  onSetScope: (categoryId: string, name: string, global: boolean) => void
  onMove: (categoryId: string, direction: -1 | 1) => void
  onAddCategory: (name: string, color: string, icon?: string, global?: boolean) => string
  onEnableCategory: (categoryIds: string[]) => void
  onRemoveCategory: (categoryId: string) => void
  onApplyTemplate: (templateId: string) => void
  onRenameTemplate: (templateId: string, name: string) => void
  onDeleteTemplate: (templateId: string) => void
  onSaveTemplate: (name: string) => void
  onCopyToStore: (storeId: string) => void
  onMoveToStore: (storeId: string) => void
  syncEnabled?: boolean
  onVisibility?: (visibility: StoreVisibility) => void
}

export function ListSettingsScreen({
  store,
  categories,
  unusedCategories,
  items,
  otherStores,
  activeCount,
  onBack,
  onRenameStore,
  onDeleteStore,
  onSort,
  onSetScope,
  onMove,
  onAddCategory,
  onEnableCategory,
  onRemoveCategory,
  onApplyTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onCopyToStore,
  onMoveToStore,
  syncEnabled = false,
  onVisibility,
}: ListSettingsScreenProps) {
  const [section, setSection] = useState<ListSettingsSection | null>(null)
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingScope, setEditingScope] = useState<Category | null>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [storeName, setStoreName] = useState(store.name)
  const [names, setNames] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const category of categories) {
      next[category.id] = categoryName(category, store)
    }
    return next
  })

  useEffect(() => {
    setStoreName(store.name)
  }, [store.name])

  useEffect(() => {
    setNames((current) => {
      let changed = false
      const next = { ...current }
      for (const category of categories) {
        if (next[category.id] === undefined) {
          next[category.id] = categoryName(category, store)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [categories, store])

  const custom = store.categorySort === 'custom'
  const title = section ? SECTION_TITLES[section] : 'Настройки'
  const goBack = section ? () => setSection(null) : onBack

  return (
    <div className="screen">
      <Header
        title={title}
        subtitle={
          section === 'list' || section === 'transfer' ? undefined : store.name
        }
        left={
          <button type="button" className="icon-button" onClick={goBack} aria-label="Назад">
            <BackIcon />
          </button>
        }
        right={
          section === 'categories' ? (
            <AddIconButton
              ariaLabel="Добавить категорию"
              onClick={() => {
                if (unusedCategories.length > 0) setPicking(true)
                else setAdding(true)
              }}
            />
          ) : undefined
        }
        help={
          section === 'categories' ? (
            <>
              <p>
                В списке только те категории, которые вы добавили. «+» — взять общую или
                создать новую. Крестик убирает категорию из этого списка.
              </p>
              <p>
                Нажмите название, чтобы сделать категорию только для этого списка или общей.
                Заштрихованные названия — только здесь.
              </p>
              <p>
                Названия из общего справочника товаров подставляют категорию сами, только
                если этот отдел уже есть в списке. Сначала добавьте категорию кнопкой «+»,
                потом выбирайте товар. Если подходящего отдела нет и товару поставить другой,
                в справочнике останется последняя присвоенная товару вами категория, а не две
                сразу.
              </p>
            </>
          ) : section === 'transfer' && otherStores.length > 0 ? (
            <p>
              Скопировать или перенести можно некупленные товары. Купленные остаются на
              месте. Порядок категорий в другом списке не меняется.
            </p>
          ) : undefined
        }
      />

      <main className="content">
        {section === null && (
          <ul className="store-list">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="settings-nav-row"
                  onClick={() => setSection(item.id)}
                >
                  <span className="settings-nav-text">
                    <span className="settings-nav-title">{item.title}</span>
                    <span className="settings-nav-hint">{item.hint}</span>
                  </span>
                  <span className="settings-nav-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {section === 'list' && (
          <section className="settings-block">
            <label className="field-label" htmlFor="store-title">
              Название
            </label>
            <input
              id="store-title"
              className="input"
              value={storeName}
              aria-label="Название списка"
              onChange={(event) => setStoreName(event.target.value)}
              onBlur={() => {
                const next = storeName.trim()
                if (!next) {
                  setStoreName(store.name)
                  return
                }
                onRenameStore(next)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
            {syncEnabled && onVisibility ? (
              <>
                <p className="field-label">Кто видит</p>
                <div className="choice-row">
                  <button
                    type="button"
                    className={store.visibility !== 'home' ? 'choice active' : 'choice'}
                    onClick={() => onVisibility('private')}
                  >
                    Только я
                  </button>
                  <button
                    type="button"
                    className={store.visibility === 'home' ? 'choice active' : 'choice'}
                    onClick={() => onVisibility('home')}
                  >
                    Весь дом
                  </button>
                </div>
              </>
            ) : null}
            <button
              type="button"
              className="button-danger add-category"
              onClick={() => setDeleting(true)}
            >
              Удалить список
            </button>
          </section>
        )}

        {section === 'categories' && (
          <>
            <section className="settings-block">
              <h2>Порядок</h2>
              <div className="choice-row">
                <button
                  type="button"
                  className={store.categorySort === 'alpha' ? 'choice active' : 'choice'}
                  onClick={() => onSort('alpha')}
                >
                  По алфавиту
                </button>
                <button
                  type="button"
                  className={custom ? 'choice active' : 'choice'}
                  onClick={() => onSort('custom')}
                >
                  По ходу отделов
                </button>
              </div>
            </section>

            <section className="settings-block">
              <h2>В этом списке</h2>
              {categories.length === 0 ? (
                <p className="hint">Нажмите «+», чтобы добавить категории в этот список.</p>
              ) : (
                <ul className="category-edit-list">
                  {categories.map((category, index) => (
                    <li key={category.id} className="category-edit-row">
                      <CategoryMark category={category} />
                      <button
                        type="button"
                        className={`input category-name-input${isLocalToStore(category, store) ? ' category-name-input--custom' : ''}`}
                        aria-label={`Тип категории ${categoryName(category, store)}`}
                        onClick={() => setEditingScope(category)}
                      >
                        {names[category.id] ?? categoryName(category, store)}
                      </button>
                      {custom && (
                        <div className="reorder-buttons">
                          <button
                            type="button"
                            className="qty-button"
                            disabled={index === 0}
                            aria-label="Выше"
                            onClick={() => onMove(category.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="qty-button"
                            disabled={index === categories.length - 1}
                            aria-label="Ниже"
                            onClick={() => onMove(category.id, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className="qty-button"
                        aria-label={`Убрать категорию ${categoryName(category, store)}`}
                        onClick={() => setRemoving(category)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {section === 'templates' && (
          <section className="settings-block">
            {(store.templates ?? []).length === 0 ? (
              <p className="hint">Пока нет шаблонов</p>
            ) : (
              <ul className="template-list">
                {(store.templates ?? []).map((template) => (
                  <li key={template.id} className="template-row">
                    <input
                      className="input category-name-input"
                      defaultValue={template.name}
                      aria-label={`Название шаблона ${template.name}`}
                      onBlur={(event) => {
                        const next = event.target.value.trim()
                        if (!next) {
                          event.target.value = template.name
                          return
                        }
                        onRenameTemplate(template.id, next)
                      }}
                    />
                    <button
                      type="button"
                      className="button-secondary template-action"
                      onClick={() => onApplyTemplate(template.id)}
                    >
                      Заполнить
                    </button>
                    <button
                      type="button"
                      className="qty-button"
                      aria-label={`Удалить шаблон ${template.name}`}
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="button-secondary add-category"
              onClick={() => setNamingTemplate(true)}
            >
              Сохранить текущий список
            </button>
          </section>
        )}

        {section === 'transfer' && (
          <section className="settings-block">
            {otherStores.length === 0 ? (
              <p className="hint">
                Добавьте ещё один магазин на главном экране — тогда можно будет
                скопировать или перенести товары.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="button-secondary add-category"
                  onClick={() => setTransferring(true)}
                >
                  Перенести в другой список
                </button>
              </>
            )}
          </section>
        )}
      </main>

      {picking && (
        <AddListCategoryDialog
          categories={unusedCategories}
          onClose={() => setPicking(false)}
          onPick={(categoryIds) => {
            onEnableCategory(categoryIds)
            setPicking(false)
          }}
          onCreate={() => {
            setPicking(false)
            setAdding(true)
          }}
        />
      )}
      {adding && (
        <NewCategoryDialog
          showScopeToggle
          onClose={() => setAdding(false)}
          onAdd={(name, color, icon, global) => {
            onAddCategory(name, color, icon, global)
            setAdding(false)
          }}
        />
      )}
      {editingScope && (
        <CategoryScopeDialog
          category={editingScope}
          displayName={names[editingScope.id] ?? categoryName(editingScope, store)}
          isLocal={isLocalToStore(editingScope, store)}
          onClose={() => setEditingScope(null)}
          onSave={(name, global) => {
            onSetScope(editingScope.id, name, global)
            setNames((current) => ({ ...current, [editingScope.id]: name }))
            setEditingScope(null)
          }}
        />
      )}
      {namingTemplate && (
        <NameDialog
          title="Новый шаблон"
          label="Название"
          placeholder="Например, На неделю"
          initial={`Шаблон ${(store.templates?.length ?? 0) + 1}`}
          confirmLabel="Сохранить"
          onClose={() => setNamingTemplate(false)}
          onConfirm={(name) => {
            onSaveTemplate(name)
            setNamingTemplate(false)
          }}
        />
      )}
      {transferring && (
        <TransferDialog
          stores={otherStores}
          activeCount={activeCount}
          onClose={() => setTransferring(false)}
          onCopy={(storeId) => {
            onCopyToStore(storeId)
            setTransferring(false)
          }}
          onMove={(storeId) => {
            onMoveToStore(storeId)
            setTransferring(false)
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Убрать категорию?"
          text={removeCategoryText(removing, store, items)}
          confirmLabel="Убрать"
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            onRemoveCategory(removing.id)
            setRemoving(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Удалить список?"
          text={`«${store.name}» и все его товары будут удалены.`}
          confirmLabel="Удалить"
          onClose={() => setDeleting(false)}
          onConfirm={onDeleteStore}
        />
      )}
    </div>
  )
}
