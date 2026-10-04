import { useEffect, useMemo, useState } from 'react'
import { AddIconButton } from '../components/AddIconButton'
import { AddListCategoryDialog } from '../components/AddListCategoryDialog'
import { CategoryMark } from '../components/CategoryMark'
import { CategoryScopeDialog } from '../components/CategoryScopeDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { LoyaltyCardEditor } from '../components/LoyaltyCardEditor'
import { NameDialog } from '../components/NameDialog'
import { NewCategoryDialog } from '../components/NewCategoryDialog'
import { BackIcon } from '../components/NavIcons'
import { DialogHeading } from '../components/DialogHeading'
import { categoryName, isLocalToStore } from '../data/categories'
import { resolveLoyaltyCard } from '../data/loyalty'
import { playConfirmSound } from '../data/sounds'
import {
  findTemplateNameConflict,
  placeTemplateTarget,
  templateNameConflictMessage,
  templatesForList,
  type TemplateSaveTarget,
} from '../data/templates'
import { TemplateDraftDialog } from '../components/TemplateDraftDialog'
import { TemplateSaveFields } from '../components/TemplateSaveFields'
import type {
  Category,
  CategorySort,
  Item,
  LoyaltyCard,
  NamedTemplate,
  Store,
  StoreGroup,
  StoreVisibility,
  TemplateFolder,
} from '../types'

type ListSettingsSection = 'list' | 'categories' | 'templates'

const SECTIONS: { id: ListSettingsSection; title: string; hint: string }[] = [
  { id: 'list', title: 'Список', hint: 'Название, кто видит и удаление' },
  { id: 'categories', title: 'Категории', hint: 'Отделы этого списка' },
  { id: 'templates', title: 'Шаблоны', hint: 'Править, как в «Мои шаблоны»' },
]

const SECTION_TITLES: Record<ListSettingsSection, string> = {
  list: 'Список',
  categories: 'Категории',
  templates: 'Шаблоны',
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
  onBack: () => void
  initialSection?: ListSettingsSection | null
  onRenameStore: (name: string) => void
  onDeleteStore: () => void
  onSort: (sort: CategorySort) => void
  onSetScope: (categoryId: string, name: string, global: boolean) => void
  onMove: (categoryId: string, direction: -1 | 1) => void
  onAddCategory: (name: string, color: string, icon?: string, global?: boolean) => string
  onEnableCategory: (categoryIds: string[]) => void
  onRemoveCategory: (categoryId: string) => void
  onSaveTemplate: (name: string, visibility: StoreVisibility, target: TemplateSaveTarget) => void
  onUpdatePlaceTemplate: (
    draft: {
      id?: string
      name: string
      items: NamedTemplate['items']
      visibility: StoreVisibility
    },
    groupId?: string,
  ) => boolean | void
  onDeleteListTemplate: (templateId: string) => void
  myId?: string
  stores?: Store[]
  groups?: StoreGroup[]
  templateFolders?: TemplateFolder[]
  onSetLoyalty?: (card: LoyaltyCard | undefined) => void
  syncEnabled?: boolean
  onVisibility?: (visibility: StoreVisibility) => void
  inBadge?: boolean
  onBadge?: (included: boolean) => void
}

export function ListSettingsScreen({
  store,
  categories,
  unusedCategories,
  items,
  onBack,
  initialSection = null,
  onRenameStore,
  onDeleteStore,
  onSort,
  onSetScope,
  onMove,
  onAddCategory,
  onEnableCategory,
  onRemoveCategory,
  onSaveTemplate,
  onUpdatePlaceTemplate,
  onDeleteListTemplate,
  myId,
  stores,
  groups = [],
  templateFolders = [],
  onSetLoyalty,
  syncEnabled = false,
  onVisibility,
  inBadge = true,
  onBadge,
}: ListSettingsScreenProps) {
  const [section, setSection] = useState<ListSettingsSection | null>(initialSection)
  const [editingCard, setEditingCard] = useState(false)
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingScope, setEditingScope] = useState<Category | null>(null)
  const [removing, setRemoving] = useState<Category | null>(null)
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [templateVisibility, setTemplateVisibility] = useState<StoreVisibility>('home')
  const [saveTarget, setSaveTarget] = useState<TemplateSaveTarget>({ kind: 'store' })
  const [editingTemplate, setEditingTemplate] = useState<{
    template: NamedTemplate
    groupId?: string
  } | null>(null)
  const [templateMenu, setTemplateMenu] = useState<{
    template: NamedTemplate
    groupId?: string
  } | null>(null)
  const [renamingTemplate, setRenamingTemplate] = useState<{
    template: NamedTemplate
    groupId?: string
  } | null>(null)
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
  const templates = useMemo(
    () => templatesForList(store, groups, myId),
    [groups, myId, store],
  )


  return (
    <div className="screen">
      <Header
        title={title}
        subtitle={
          section === 'list' ? undefined : store.name
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
        helpGuideIds={section === 'categories' ? ['guide-categories'] : undefined}
        help={
          section === 'templates' ? (
            <>
              <p>
                Как в «Мои шаблоны»: нажмите название, чтобы править, или «⋯» — имя и содержимое.
              </p>
              <p>Удаление внутри правки.</p>
              <p>Подставить товары в список — кнопкой «Из шаблона» на странице списка.</p>
              <p>«Сохранить текущий список» спрашивает, на какой уровень положить шаблон.</p>
            </>
          ) : undefined
        }
        helpTitle={section === 'categories' ? 'Категории' : 'Подсказка'}
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
            {syncEnabled && onVisibility && !store.incomingFrom ? (
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
                <p className="hint" style={{ opacity: 0.75 }}>
                  «Только я» — список виден лишь вам (и на ваших телефонах с кодом T). «Весь дом» —
                  всем участникам семьи.
                </p>
              </>
            ) : store.incomingFrom ? (
              <p className="hint">
                Этот список вам переслали. Он только ваш и не входит в списки семьи.
              </p>
            ) : null}
            {!store.incomingFrom && onBadge ? (
              <>
                <p className="field-label">Число на ярлыке</p>
                <button
                  type="button"
                  className={inBadge ? 'choice active' : 'choice'}
                  aria-pressed={inBadge}
                  onClick={() => onBadge(!inBadge)}
                >
                  Считать некупленные этого списка
                </button>
              </>
            ) : null}
            {onSetLoyalty ? (
              <>
                <p className="field-label">Бонусная карта</p>
                <p className="hint">
                  {store.loyaltyCard
                    ? store.loyaltyCard.label || 'Своя карта этого списка'
                    : resolveLoyaltyCard(store, groups)?.source === 'group'
                      ? 'Как у группы — можно задать отдельную для списка'
                      : 'Нет карты. Добавьте штрихкод с фото или приложение с телефона (на iPhone — через «Команды»).'}
                </p>
                <button
                  type="button"
                  className="button-secondary add-category"
                  onClick={() => setEditingCard(true)}
                >
                  {store.loyaltyCard ? 'Изменить карту' : 'Добавить карту'}
                </button>
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
            {templates.length === 0 ? (
              <p className="hint">Пока нет шаблонов этого списка.</p>
            ) : (
              <ul className="template-list template-list--nested">
                {templates.map(({ groupId, template }) => (
                  <li key={template.id} className="template-pick-row">
                    <button
                      type="button"
                      className="template-pick-name"
                      aria-label={`Изменить шаблон ${template.name}`}
                      onClick={() => setEditingTemplate({ template, groupId })}
                    >
                      {template.name}
                      {groupId ? (
                        <span className="hint" style={{ display: 'block', margin: 0 }}>
                          из группы
                        </span>
                      ) : null}
                    </button>
                    {template.visibility === 'private' ? (
                      <span className="store-local-mark store-local-mark--icon" title="личное">
                        <span aria-hidden="true">🔒</span>
                        <span className="visually-hidden">личное</span>
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="qty-button store-menu"
                      aria-label={`Меню шаблона ${template.name}`}
                      onClick={() => setTemplateMenu({ template, groupId })}
                    >
                      ⋯
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="button-secondary add-category"
              onClick={() => {
                setTemplateVisibility('home')
                setSaveTarget(placeTemplateTarget(store))
                setNamingTemplate(true)
              }}
            >
              Сохранить текущий список
            </button>
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
          inputId="list-template-name"
          validate={(name) => {
            const conflict = findTemplateNameConflict(name, {
              stores: stores ?? [store],
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
          onClose={() => setNamingTemplate(false)}
          onConfirm={(name) => {
            onSaveTemplate(name, templateVisibility, saveTarget)
            setNamingTemplate(false)
          }}
        />
      )}
      {renamingTemplate ? (
        <NameDialog
          title="Шаблон"
          label="Название"
          placeholder="Например, На неделю"
          initial={renamingTemplate.template.name}
          confirmLabel="Сохранить"
          validate={(name) => {
            const conflict = findTemplateNameConflict(
              name,
              {
                stores: stores ?? [store],
                groups,
                folders: templateFolders,
              },
              renamingTemplate.template.id,
            )
            return conflict ? templateNameConflictMessage(conflict) : null
          }}
          onClose={() => setRenamingTemplate(null)}
          onConfirm={(name) => {
            onUpdatePlaceTemplate(
              {
                id: renamingTemplate.template.id,
                name,
                items: renamingTemplate.template.items,
                visibility: renamingTemplate.template.visibility === 'private' ? 'private' : 'home',
              },
              renamingTemplate.groupId,
            )
            setRenamingTemplate(null)
          }}
        />
      ) : null}
      {editingCard && onSetLoyalty ? (
        <LoyaltyCardEditor
          initial={store.loyaltyCard}
          inherited={resolveLoyaltyCard(store, groups)?.source === 'group' ? resolveLoyaltyCard(store, groups)?.card : undefined}
          inheritedLabel="группы"
          onClose={() => setEditingCard(false)}
          onSave={(card) => {
            onSetLoyalty(card)
            setEditingCard(false)
          }}
        />
      ) : null}
      {templateMenu ? (
        <div className="overlay overlay--capture" role="presentation" onClick={() => setTemplateMenu(null)}>
          <div className="dialog" onClick={(event) => event.stopPropagation()}>
            <DialogHeading title={templateMenu.template.name} onClose={() => setTemplateMenu(null)} />
            <div className="command-row">
              <button
                type="button"
                className="command-button command-button--text"
                onClick={() => {
                  setRenamingTemplate(templateMenu)
                  setTemplateMenu(null)
                }}
              >
                <span className="command-label">Имя</span>
              </button>
              <button
                type="button"
                className="command-button command-button--text"
                onClick={() => {
                  setEditingTemplate(templateMenu)
                  setTemplateMenu(null)
                }}
              >
                <span className="command-label">Изменить</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
      {editingTemplate ? (
        <TemplateDraftDialog
          template={editingTemplate.template}
          categories={[...categories, ...unusedCategories]}
          syncEnabled={syncEnabled}
          validateName={(name) => {
            const conflict = findTemplateNameConflict(
              name,
              {
                stores: stores ?? [store],
                groups,
                folders: templateFolders,
              },
              editingTemplate.template.id,
            )
            return conflict ? templateNameConflictMessage(conflict) : null
          }}
          onClose={() => setEditingTemplate(null)}
          onSave={(draft) => {
            const ok = onUpdatePlaceTemplate(draft, editingTemplate.groupId)
            if (ok === false) return
            setEditingTemplate(null)
          }}
          onDelete={(templateId) => {
            onDeleteListTemplate(templateId)
            setEditingTemplate(null)
          }}
        />
      ) : null}
      {deleting && (
        <ConfirmDialog
          title="Удалить список?"
          text={`«${store.name}» и все его товары будут удалены.`}
          confirmLabel="Удалить"
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            playConfirmSound('delete')
            onDeleteStore()
          }}
        />
      )}
    </div>
  )
}
