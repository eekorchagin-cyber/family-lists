import type {
  Category,
  NamedTemplate,
  Store,
  StoreGroup,
  TemplateFolder,
  TemplateItem,
} from '../types'
import { knownCategoriesForStore } from './categories'
import { peekDeletes } from './sync/deletes'
import { sameRuText } from './text'

export type TemplateNameConflict = {
  level: 'list' | 'group' | 'personal'
  place: string
}

/** Одинаковые имена запрещены между списком, группой и «Мои шаблоны». */
export function findTemplateNameConflict(
  name: string,
  sources: {
    stores?: Store[]
    groups?: StoreGroup[]
    folders?: TemplateFolder[]
  },
  exceptId?: string,
): TemplateNameConflict | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  for (const store of sources.stores ?? []) {
    for (const template of store.templates ?? []) {
      if (exceptId && template.id === exceptId) continue
      if (sameRuText(template.name, trimmed)) {
        return { level: 'list', place: store.name }
      }
    }
  }
  for (const group of sources.groups ?? []) {
    for (const template of group.templates ?? []) {
      if (exceptId && template.id === exceptId) continue
      if (sameRuText(template.name, trimmed)) {
        return { level: 'group', place: group.name }
      }
    }
  }
  for (const folder of sources.folders ?? []) {
    for (const template of folder.templates ?? []) {
      if (exceptId && template.id === exceptId) continue
      if (sameRuText(template.name, trimmed)) {
        return { level: 'personal', place: folder.name }
      }
    }
  }
  return null
}

export function templateNameConflictMessage(conflict: TemplateNameConflict): string {
  if (conflict.level === 'list') {
    return `Имя уже занято шаблоном списка «${conflict.place}». Выберите другое.`
  }
  if (conflict.level === 'group') {
    return `Имя уже занято шаблоном группы «${conflict.place}». Выберите другое.`
  }
  return `Имя уже занято в «Мои шаблоны» («${conflict.place}»). Выберите другое.`
}

export type TemplateSaveTarget =
  | { kind: 'store' }
  | { kind: 'group'; groupId: string }
  | { kind: 'folder'; folderId: string }

/** Куда класть новый шаблон списка по умолчанию: в сам список (группу можно выбрать отдельно). */
export function placeTemplateTarget(_store: Pick<Store, 'groupId'>): TemplateSaveTarget {
  return { kind: 'store' }
}

export type TemplateSaveChoice = {
  target: TemplateSaveTarget
  label: string
}

export function templateSaveChoices(
  store: Pick<Store, 'groupId'>,
  groups: StoreGroup[],
  folders: { id: string; name: string }[],
): TemplateSaveChoice[] {
  const choices: TemplateSaveChoice[] = [
    { target: { kind: 'store' }, label: 'Шаблоны этого списка' },
  ]
  if (store.groupId) {
    const group = groups.find((item) => item.id === store.groupId)
    if (group) {
      choices.push({
        target: { kind: 'group', groupId: group.id },
        label: `Шаблоны группы «${group.name}»`,
      })
    }
  }
  const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  for (const folder of sorted) {
    choices.push({
      target: { kind: 'folder', folderId: folder.id },
      label: folder.name,
    })
  }
  return choices
}

export function sameSaveTarget(left: TemplateSaveTarget, right: TemplateSaveTarget): boolean {
  if (left.kind !== right.kind) return false
  if (left.kind === 'group' && right.kind === 'group') return left.groupId === right.groupId
  if (left.kind === 'folder' && right.kind === 'folder') return left.folderId === right.folderId
  return true
}

export type SharedTemplate = {
  storeId: string
  storeName: string
  template: NamedTemplate
  groupId?: string
}

function parseTemplate(value: unknown): NamedTemplate | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !Array.isArray(row.items)) {
    return null
  }
  const items: TemplateItem[] = []
  for (const entry of row.items) {
    if (!entry || typeof entry !== 'object') return null
    const item = entry as Record<string, unknown>
    if (
      typeof item.name !== 'string' ||
      typeof item.categoryId !== 'string' ||
      typeof item.qty !== 'number' ||
      !Number.isFinite(item.qty) ||
      typeof item.unit !== 'string'
    ) {
      return null
    }
    items.push({
      name: item.name,
      categoryId: item.categoryId,
      qty: item.qty,
      unit: item.unit,
    })
  }
  const visibility = row.visibility === 'private' || row.visibility === 'home' ? row.visibility : undefined
  const ownerId = typeof row.ownerId === 'string' && row.ownerId.trim() ? row.ownerId.trim() : undefined
  return {
    id: row.id,
    name: row.name,
    items,
    ...(visibility ? { visibility } : {}),
    ...(ownerId ? { ownerId } : {}),
  }
}

export function parseTemplateList(value: unknown): NamedTemplate[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map(parseTemplate)
    .filter((template): template is NamedTemplate => template !== null)
}

export function groupTemplatesForUser(group: StoreGroup, userId: string | undefined): StoreGroup {
  if (!group.templates) return group
  const templates = group.templates.filter((template) => templateVisible(template, userId))
  if (templates.length === group.templates.length) return group
  const next = { ...group, templates }
  if (templates.length === 0) delete next.templates
  return next
}

export function templateVisible(template: NamedTemplate, userId: string | undefined): boolean {
  if (template.visibility !== 'private') return true
  if (!userId || !template.ownerId) return true
  return template.ownerId === userId
}

/**
 * Сводим шаблоны списка/группы.
 * Одинаковый id — берём remote; локальные, которых нет в remote, сохраняем
 * (раньше «домашние» локальные затирались пустым/урезанным remote).
 * Явно удалённые (tombstone в pending.templates) не возвращаем из remote.
 */
export function mergeTemplates(
  local: NamedTemplate[] | undefined,
  remote: NamedTemplate[] | undefined,
  userId: string | undefined,
  deletedIds: Iterable<string> = peekDeletes().templates,
): NamedTemplate[] {
  const deleted = new Set(deletedIds)
  const byId = new Map<string, NamedTemplate>()
  for (const template of remote ?? []) {
    if (deleted.has(template.id)) continue
    if (templateVisible(template, userId)) byId.set(template.id, template)
  }
  for (const template of local ?? []) {
    if (deleted.has(template.id)) continue
    if (!templateVisible(template, userId)) continue
    if (!byId.has(template.id)) byId.set(template.id, template)
  }
  return [...byId.values()]
}

export function sharedTemplates(
  stores: Store[],
  userId?: string,
  groups: StoreGroup[] = [],
): SharedTemplate[] {
  const rows: SharedTemplate[] = []
  for (const store of stores) {
    for (const template of store.templates ?? []) {
      if (!templateVisible(template, userId)) continue
      rows.push({ storeId: store.id, storeName: store.name, template })
    }
  }
  for (const group of groups) {
    for (const template of group.templates ?? []) {
      if (!templateVisible(template, userId)) continue
      rows.push({
        storeId: '',
        storeName: group.name,
        template,
        groupId: group.id,
      })
    }
  }
  return rows
}

/** Шаблоны, которые можно подставить в этот список: его группа и он сам. */
export function templatesForList(
  store: Store,
  groups: StoreGroup[] = [],
  userId?: string,
): SharedTemplate[] {
  const group = store.groupId ? groups.filter((row) => row.id === store.groupId) : []
  return sharedTemplates([store], userId, group)
}

export function findSharedTemplate(
  stores: Store[],
  templateId: string,
  groups: StoreGroup[] = [],
  userId?: string,
): SharedTemplate | undefined {
  return sharedTemplates(stores, userId, groups).find((row) => row.template.id === templateId)
}

function sameCategoryName(left: string, right: string): boolean {
  return sameRuText(left, right)
}

export type TemplateFit = {
  ready: TemplateItem[]
  missing: TemplateItem[]
  missingCategoryNames: string[]
}

/** Какие товары шаблона уже попадают в отделы этого списка. */
export function classifyTemplateItems(
  store: Pick<Store, 'id' | 'categoryOrder'>,
  categories: Category[],
  items: TemplateItem[],
): TemplateFit {
  const enabledIds = new Set(store.categoryOrder ?? [])
  const enabled = categories.filter(
    (category) =>
      enabledIds.has(category.id) && (!category.storeId || category.storeId === store.id),
  )
  const ready: TemplateItem[] = []
  const missing: TemplateItem[] = []
  const names = new Set<string>()
  for (const entry of items) {
    const direct = enabled.find((category) => category.id === entry.categoryId)
    if (direct) {
      ready.push(entry)
      continue
    }
    const source = categories.find((category) => category.id === entry.categoryId)
    const byName = source
      ? enabled.find((category) => sameCategoryName(category.name, source.name))
      : undefined
    if (byName) {
      ready.push({ ...entry, categoryId: byName.id })
      continue
    }
    missing.push(entry)
    names.add(source?.name?.trim() || 'Без отдела')
  }
  return {
    ready,
    missing,
    missingCategoryNames: [...names].sort((left, right) => left.localeCompare(right, 'ru')),
  }
}

export function mapTemplateCategoryId(
  entry: TemplateItem,
  store: Store,
  categories: Category[],
): string {
  const known = knownCategoriesForStore(categories, store.id)
  if (known.some((category) => category.id === entry.categoryId)) return entry.categoryId
  const source = categories.find((category) => category.id === entry.categoryId)
  if (!source) return known[0]?.id ?? entry.categoryId
  const byName = known.find(
    (category) => category.name.trim().toLowerCase() === source.name.trim().toLowerCase(),
  )
  return byName?.id ?? known[0]?.id ?? entry.categoryId
}
