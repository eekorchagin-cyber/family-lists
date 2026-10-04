import { useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogEntry, Category, Item, Store } from '../types'
import {
  findSimilarItem,
  parseImportText,
  resolveImportCategoryId,
  type ImportedLine,
} from '../data/importLines'
import { canAutofocus } from '../data/viewport'
import { DialogHeading } from './DialogHeading'

export type ImportAction =
  | {
      kind: 'add'
      name: string
      qty: number
      unit: string
      bought: boolean
      categoryId: string
    }
  | {
      kind: 'replace'
      itemId: string
      name: string
      qty: number
      unit: string
      bought: boolean
      categoryId: string
    }

type ImportListDialogProps = {
  store: Store
  items: Item[]
  categories: Category[]
  catalog: CatalogEntry[]
  onClose: () => void
  onImport: (actions: ImportAction[]) => void
}

type Conflict = {
  incoming: ImportedLine
  existing: Item
  categoryId: string
}

type Phase = 'choose' | 'paste'

export function ImportListDialog({
  store,
  items,
  categories,
  catalog,
  onClose,
  onImport,
}: ImportListDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('choose')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clipboardHint, setClipboardHint] = useState<string | null>(null)
  const [ready, setReady] = useState<ImportAction[]>([])
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [queue, setQueue] = useState<ImportedLine[]>([])

  const preview = useMemo(() => parseImportText(text), [text])

  useEffect(() => {
    if (phase !== 'paste') return
    let cancelled = false
    void (async () => {
      try {
        const value = await navigator.clipboard.readText()
        if (cancelled || !value.trim()) return
        setText((current) => (current.trim() ? current : value))
        setClipboardHint('Текст из буфера подставлен. Проверьте и нажмите «Импортировать».')
      } catch {
        if (!cancelled) {
          setClipboardHint('Вставьте список сюда (удерживайте → Вставить) и нажмите «Импортировать».')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase])

  function resolveCategory(name: string): string {
    return resolveImportCategoryId(name, store, categories, catalog)
  }

  function continueWith(
    remaining: ImportedLine[],
    accumulated: ImportAction[],
  ) {
    let nextReady = [...accumulated]
    let rest = [...remaining]
    while (rest.length > 0) {
      const incoming = rest[0]!
      rest = rest.slice(1)
      const categoryId = resolveCategory(incoming.name)
      const existing = findSimilarItem(items, store.id, incoming.name)
      const alreadyReplacing = nextReady.some(
        (action) => action.kind === 'replace' && action.itemId === existing?.id,
      )
      if (existing && !alreadyReplacing) {
        setReady(nextReady)
        setQueue(rest)
        setConflict({ incoming, existing, categoryId })
        return
      }
      nextReady.push({
        kind: 'add',
        name: incoming.name,
        qty: incoming.qty,
        unit: incoming.unit,
        bought: incoming.bought,
        categoryId,
      })
    }
    onImport(nextReady)
    onClose()
  }

  function startImport(source: string) {
    const lines = parseImportText(source)
    if (lines.length === 0) {
      setError('Не нашли ни одной строки с названием товара.')
      return
    }
    setError(null)
    continueWith(lines, [])
  }

  function openPaste() {
    setError(null)
    setClipboardHint(null)
    setText('')
    setPhase('paste')
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      startImport(value)
    }
    reader.onerror = () => setError('Не удалось прочитать файл.')
    reader.readAsText(file)
  }

  if (conflict) {
    return (
      <div className="overlay overlay--capture" role="presentation">
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading title="Похожий товар" onClose={onClose} />
          <p className="hint">
            В списке уже есть «{conflict.existing.name}»
            {conflict.existing.qty !== 1 || conflict.existing.unit !== 'шт'
              ? ` (${conflict.existing.qty} ${conflict.existing.unit})`
              : ''}
            . В импорте — «{conflict.incoming.name}»
            {conflict.incoming.qty !== 1 || conflict.incoming.unit !== 'шт'
              ? ` (${conflict.incoming.qty} ${conflict.incoming.unit})`
              : ''}
            . Какой оставить?
          </p>
          <div className="choice-row">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setConflict(null)
                continueWith(queue, ready)
              }}
            >
              Оставить имеющийся
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                const action: ImportAction = {
                  kind: 'replace',
                  itemId: conflict.existing.id,
                  name: conflict.incoming.name,
                  qty: conflict.incoming.qty,
                  unit: conflict.incoming.unit,
                  bought: conflict.incoming.bought,
                  categoryId: conflict.existing.categoryId,
                }
                setConflict(null)
                continueWith(queue, [...ready, action])
              }}
            >
              Взять из импорта
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'paste') {
    return (
      <div className="overlay overlay--capture" role="presentation">
        <div className="dialog" onClick={(event) => event.stopPropagation()}>
          <DialogHeading
            title="Из буфера"
            onClose={() => {
              setPhase('choose')
              setError(null)
              setClipboardHint(null)
            }}
          />
          <p className="hint">
            {clipboardHint ??
              'Вставьте список: каждый товар с новой строки. Символы до названия пропустим.'}
          </p>
          <label className="field-label" htmlFor="import-list-text">
            Текст списка
          </label>
          <textarea
            id="import-list-text"
            className="input import-list-textarea"
            rows={10}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setError(null)
            }}
            placeholder={'- [ ] Кроссовки\n- [x] Шапка\nНоски 2 пары'}
            autoFocus={canAutofocus()}
          />
          {preview.length > 0 ? (
            <p className="hint">Строк к импорту: {preview.length}</p>
          ) : null}
          {error ? <p className="hint hint-warning">{error}</p> : null}
          <div className="dialog-actions dialog-actions-single">
            <button
              type="button"
              className="button-primary"
              disabled={preview.length === 0}
              onClick={() => startImport(text)}
            >
              Импортировать
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading title="Вставить список" onClose={onClose} />
        <p className="hint">
          Каждый товар с новой строки. Символы до названия (−, [ ], номера) пропустим. Без
          отдела будет «Другое»; количество можно уточнить потом.
        </p>
        <div className="choice-row">
          <button type="button" className="button-primary" onClick={openPaste}>
            Из буфера
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => fileRef.current?.click()}
          >
            Из файла
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.text,text/plain"
          hidden
          onChange={(event) => {
            onFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        {error ? <p className="hint hint-warning">{error}</p> : null}
      </div>
    </div>
  )
}
