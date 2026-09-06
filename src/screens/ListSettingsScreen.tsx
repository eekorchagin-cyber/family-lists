import { useEffect, useState } from 'react'
import { CategoryMark } from '../components/CategoryMark'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { TransferDialog } from '../components/TransferDialog'
import { categoryName } from '../data/categories'
import type { Category, CategorySort, Store } from '../types'

type ListSettingsSection = 'list' | 'categories' | 'templates' | 'transfer'

const SECTIONS: { id: ListSettingsSection; title: string; hint: string }[] = [
  { id: 'list', title: 'Список', hint: 'Название и удаление' },
  { id: 'categories', title: 'Категории', hint: 'Порядок отделов и названия' },
  { id: 'templates', title: 'Шаблоны', hint: 'Заполнить список' },
  { id: 'transfer', title: 'В другой список', hint: 'Копирование и перенос' },
]

const SECTION_TITLES: Record<ListSettingsSection, string> = {
  list: 'Список',
  categories: 'Категории',
  templates: 'Шаблоны',
  transfer: 'В другой список',
}

type ListSettingsScreenProps = {
  store: Store
  categories: Category[]
  otherStores: Store[]
  activeCount: number
  onBack: () => void
  onRenameStore: (name: string) => void
  onDeleteStore: () => void
  onSort: (sort: CategorySort) => void
  onRename: (categoryId: string, name: string) => void
  onMove: (categoryId: string, direction: -1 | 1) => void
  onAddCategory: (name: string, color: string, icon?: string, global?: boolean) => string
  onApplyTemplate: (templateId: string) => void
  onRenameTemplate: (templateId: string, name: string) => void
  onDeleteTemplate: (templateId: string) => void
  onSaveTemplate: (name: string) => void
  onCopyToStore: (storeId: string) => void
  onMoveToStore: (storeId: string) => void
}

export function ListSettingsScreen({
  store,
  categories,
  otherStores,
  activeCount,
  onBack,
  onRenameStore,
  onDeleteStore,
  onSort,
  onRename,
  onMove,
  onAddCategory,
  onApplyTemplate,
  onRenameTemplate,
  onDeleteTemplate,
  onSaveTemplate,
  onCopyToStore,
  onMoveToStore,
}: ListSettingsScreenProps) {
  const [section, setSection] = useState<ListSettingsSection | null>(null)
  const [adding, setAdding] = useState(false)
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
        left={
          <button type="button" className="icon-button" onClick={goBack} aria-label="Назад">
            ←
          </button>
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
              <p className="hint">Названия действуют только здесь. Порядок отделов — если выбран «По ходу отделов».</p>
              <ul className="category-edit-list">
                {categories.map((category, index) => (
                  <li key={category.id} className="category-edit-row">
                    <CategoryMark category={category} />
                    <input
                      className={`input category-name-input${(category.storeId === store.id || (names[category.id] ?? '').trim() !== category.name.trim()) ? ' category-name-input--custom' : ''}`}
                      value={names[category.id] ?? categoryName(category, store)}
                      aria-label={`Название категории ${category.name}`}
                      onChange={(event) =>
                        setNames((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                      onBlur={() => {
                        const next = (names[category.id] ?? '').trim()
                        if (!next) {
                          setNames((current) => ({
                            ...current,
                            [category.id]: categoryName(category, store),
                          }))
                          return
                        }
                        onRename(category.id, next)
                      }}
                    />
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
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="button-secondary add-category"
                onClick={() => setAdding(true)}
              >
                Новая категория
              </button>
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
                <p className="hint">
                  Скопировать или перенести некупленные товары в другой магазин.
                  Купленные остаются на месте. Порядок категорий там не меняется.
                </p>
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
