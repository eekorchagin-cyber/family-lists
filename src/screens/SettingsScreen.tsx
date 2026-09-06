import { useEffect, useMemo, useState } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { CatalogDialog } from '../components/CatalogDialog'
import { CategoryMark } from '../components/CategoryMark'
import { CategoryStyleDialog } from '../components/CategoryStyleDialog'
import { Header } from '../components/Header'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { globalCategories, groupCatalog, sortCatalog } from '../data/catalog'
import type { CatalogEntry, Category, FontSize, Settings, Store, Theme } from '../types'

type SettingsSection = 'appearance' | 'categories' | 'catalog'

const SECTIONS: { id: SettingsSection; title: string; hint: string }[] = [
  { id: 'appearance', title: 'Оформление', hint: 'Тема и размер шрифта' },
  { id: 'categories', title: 'Категории', hint: 'Общие — добавить в любой список' },
  { id: 'catalog', title: 'Товары', hint: 'Справочник' },
]

const SECTION_TITLES: Record<SettingsSection, string> = {
  appearance: 'Оформление',
  categories: 'Категории',
  catalog: 'Товары',
}

type SettingsScreenProps = {
  settings: Settings
  categories: Category[]
  stores: Store[]
  catalog: CatalogEntry[]
  onBack: () => void
  onTheme: (theme: Theme) => void
  onFontSize: (fontSize: FontSize) => void
  onAddCategory: (name: string, color: string, icon?: string) => string
  onRenameCategory: (categoryId: string, name: string) => void
  onStyleCategory: (categoryId: string, color: string, icon: string) => void
  onDeleteCategory: (categoryId: string) => void
  onSaveCatalog: (name: string, categoryId: string, entryId?: string) => boolean
  onDeleteCatalog: (entryId: string) => void
}

export function SettingsScreen({
  settings,
  categories,
  stores,
  catalog,
  onBack,
  onTheme,
  onFontSize,
  onAddCategory,
  onRenameCategory,
  onStyleCategory,
  onDeleteCategory,
  onSaveCatalog,
  onDeleteCatalog,
}: SettingsScreenProps) {
  const [section, setSection] = useState<SettingsSection | null>(null)
  const globals = useMemo(() => {
    const listed = globalCategories(categories)
    const source = listed.length > 0 ? listed : categories
    const byId = new Map<string, Category>()
    for (const category of source) {
      if (!byId.has(category.id)) byId.set(category.id, category)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [categories])
  const categoryById = useMemo(() => {
    const map = new Map(categories.map((category) => [category.id, category]))
    return map
  }, [categories])
  const sortedCatalog = useMemo(() => sortCatalog(catalog), [catalog])

  const [names, setNames] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {}
    for (const category of globals) next[category.id] = category.name
    return next
  })

  useEffect(() => {
    setNames((current) => {
      let changed = false
      const next = { ...current }
      for (const category of globals) {
        if (next[category.id] === undefined) {
          next[category.id] = category.name
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [globals])
  const [query, setQuery] = useState('')
  const [catalogView, setCatalogView] = useState<'alpha' | 'category'>('alpha')
  const [editing, setEditing] = useState<CatalogEntry | null | 'new'>(null)
  const [addingCategory, setAddingCategory] = useState(false)
  const [styling, setStyling] = useState<Category | null>(null)

  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sortedCatalog
    return sortedCatalog.filter((entry) => {
      const category = categoryById.get(entry.categoryId)
      return (
        entry.name.toLowerCase().includes(needle) ||
        (category?.name.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [categoryById, query, sortedCatalog])

  const catalogCategories = useMemo(() => {
    const byId = new Map(globals.map((category) => [category.id, category]))
    for (const entry of catalog) {
      const category = categoryById.get(entry.categoryId)
      if (category?.storeId && !byId.has(category.id)) {
        byId.set(category.id, category)
      }
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [catalog, categoryById, globals])

  const groupedCatalog = useMemo(
    () => groupCatalog(filteredCatalog, catalogCategories),
    [filteredCatalog, catalogCategories],
  )

  function rememberCategory(id: string, name: string) {
    setNames((current) => ({ ...current, [id]: name.trim() }))
  }

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
        right={
          section === 'categories' ? (
            <AddIconButton ariaLabel="Новая категория" onClick={() => setAddingCategory(true)} />
          ) : section === 'catalog' ? (
            <AddIconButton ariaLabel="Новый товар" onClick={() => setEditing('new')} />
          ) : undefined
        }
        help={
          section === 'categories' ? (
              <p>Порядок отделов задаётся в каждом списке отдельно. Новая общая категория не появится в списках сама — её нужно добавить.</p>
          ) : section === 'catalog' ? (
            <p>
              Если выбрать товар из справочника, он попадёт в свою категорию в любом списке.
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

        {section === 'appearance' && (
          <>
            <section className="settings-block">
              <h2>Тема</h2>
              <div className="choice-row">
                <ChoiceButton
                  active={settings.theme === 'light'}
                  onClick={() => onTheme('light')}
                >
                  Светлая
                </ChoiceButton>
                <ChoiceButton
                  active={settings.theme === 'dark'}
                  onClick={() => onTheme('dark')}
                >
                  Тёмная
                </ChoiceButton>
              </div>
            </section>

            <section className="settings-block">
              <h2>Размер шрифта</h2>
              <div className="choice-row">
                <ChoiceButton
                  active={settings.fontSize === 's'}
                  onClick={() => onFontSize('s')}
                >
                  Мелкий
                </ChoiceButton>
                <ChoiceButton
                  active={settings.fontSize === 'm'}
                  onClick={() => onFontSize('m')}
                >
                  Обычный
                </ChoiceButton>
                <ChoiceButton
                  active={settings.fontSize === 'l'}
                  onClick={() => onFontSize('l')}
                >
                  Крупный
                </ChoiceButton>
              </div>
            </section>
          </>
        )}

        {section === 'categories' && (
          <section className="settings-block">
            <ul className="category-edit-list">
              {globals.map((category) => (
                <li key={category.id} className="category-edit-row">
                  <button
                    type="button"
                    className="category-mark-button"
                    aria-label={`Цвет и значок категории ${category.name}`}
                    onClick={() => setStyling(category)}
                  >
                    <CategoryMark category={category} />
                  </button>
                  <input
                    className="input category-name-input"
                    value={names[category.id] ?? category.name}
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
                          [category.id]: category.name,
                        }))
                        return
                      }
                      onRenameCategory(category.id, next)
                    }}
                  />
                  <button
                    type="button"
                    className="qty-button"
                    aria-label={`Удалить категорию ${category.name}`}
                    onClick={() => onDeleteCategory(category.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {section === 'catalog' && (
          <section className="settings-block">
            {(catalog ?? []).length > 0 && (
              <>
                <div className="choice-row">
                  <ChoiceButton
                    active={catalogView === 'alpha'}
                    onClick={() => setCatalogView('alpha')}
                  >
                    По алфавиту
                  </ChoiceButton>
                  <ChoiceButton
                    active={catalogView === 'category'}
                    onClick={() => setCatalogView('category')}
                  >
                    По категориям
                  </ChoiceButton>
                </div>
                <input
                  className="input catalog-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск"
                  aria-label="Поиск товара"
                />
              </>
            )}
            {filteredCatalog.length === 0 ? (
              <p className="hint">Пока нет товаров</p>
            ) : catalogView === 'category' ? (
              <div className="groups">
                {groupedCatalog.map(({ category, items }) => {
                  const ownerStore = category?.storeId
                    ? stores.find((store) => store.id === category.storeId)
                    : undefined
                  return (
                    <section key={category?.id ?? 'unknown'} className="group">
                      <h2
                        className={`group-title${ownerStore ? ' group-title--local' : ''}`}
                      >
                        <CategoryMark
                          category={
                            category ?? { name: 'Нет категории', color: '#6b7280', icon: 'other' }
                          }
                        />
                        {category?.name ?? 'Нет категории'}
                        {ownerStore ? (
                          <span className="category-chip-store">{ownerStore.name}</span>
                        ) : null}
                      </h2>
                      <ul className="catalog-list">
                        {items.map((entry) => (
                          <CatalogRow
                            key={entry.id}
                            entry={entry}
                            category={category ?? undefined}
                            stores={stores}
                            onEdit={() => setEditing(entry)}
                            onDelete={() => onDeleteCatalog(entry.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            ) : (
              <ul className="catalog-list">
                {filteredCatalog.map((entry) => {
                  const category = categoryById.get(entry.categoryId)
                  return (
                    <CatalogRow
                      key={entry.id}
                      entry={entry}
                      category={
                        category ?? {
                          id: '',
                          name: 'Нет категории',
                          color: '#6b7280',
                          icon: 'other',
                        }
                      }
                      stores={stores}
                      onEdit={() => setEditing(entry)}
                      onDelete={() => onDeleteCatalog(entry.id)}
                    />
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </main>

      {addingCategory && (
        <NewCategoryDialog
          onClose={() => setAddingCategory(false)}
          onAdd={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (id) rememberCategory(id, name)
            setAddingCategory(false)
          }}
        />
      )}
      {styling && (
        <CategoryStyleDialog
          category={styling}
          onClose={() => setStyling(null)}
          onSave={(color, icon) => {
            onStyleCategory(styling.id, color, icon)
            setStyling(null)
          }}
        />
      )}
      {editing && (
        <CatalogDialog
          entry={editing === 'new' ? null : editing}
          categories={catalogCategories}
          stores={stores}
          onClose={() => setEditing(null)}
          onSave={(name, categoryId) =>
            onSaveCatalog(
              name,
              categoryId,
              editing === 'new' ? undefined : editing.id,
            )
          }
          onAddCategory={(name, color, icon) => {
            const id = onAddCategory(name, color, icon)
            if (id) rememberCategory(id, name)
            return id
          }}
        />
      )}
    </div>
  )
}

function CatalogRow({
  entry,
  category,
  stores,
  onEdit,
  onDelete,
}: {
  entry: CatalogEntry
  category?: Category
  stores: Store[]
  onEdit: () => void
  onDelete: () => void
}) {
  const ownerStore = category?.storeId
    ? stores.find((store) => store.id === category.storeId)
    : undefined

  return (
    <li className="catalog-row">
      <button type="button" className="catalog-main" onClick={onEdit}>
        <span className="catalog-name">{entry.name}</span>
        {category ? (
          <span
            className={[
              'catalog-category',
              ownerStore ? 'catalog-category--local' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <CategoryMark category={category} className="category-mark-sm" />
            <span className="catalog-category-name">{category.name}</span>
            {ownerStore ? (
              <span className="category-chip-store">{ownerStore.name}</span>
            ) : null}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="qty-button"
        aria-label={`Удалить ${entry.name}`}
        onClick={onDelete}
      >
        ×
      </button>
    </li>
  )
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      className={active ? 'choice active' : 'choice'}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
