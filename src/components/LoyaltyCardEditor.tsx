import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  canDetectBarcode,
  detectCodeFromFile,
  fileToLoyaltyImage,
  looksLikeUrl,
  loyaltyKindFromFormat,
} from '../data/loyalty'
import { isAppleMobile } from '../data/sync/codes'
import {
  isLatinShortcutName,
  loyaltyAppError,
  openInstalledAppsList,
  openLoyaltyApp,
  parseShortcutName,
  readClipboardLink,
  shortcutOpenHref,
  takeSharedAppLink,
} from '../data/loyaltyApps'
import type { LoyaltyCard, LoyaltyKind } from '../types'
import { LoyaltyCardView } from './LoyaltyCardView'

type LoyaltyCardEditorProps = {
  title?: string
  initial?: LoyaltyCard
  inherited?: LoyaltyCard
  inheritedLabel?: string
  onClose: () => void
  onSave: (card: LoyaltyCard | undefined) => void
}

const KINDS: { id: LoyaltyKind; title: string }[] = [
  { id: 'barcode', title: 'Штрихкод' },
  { id: 'app', title: 'Приложение' },
]

export function LoyaltyCardEditor({
  title = 'Бонусная карта',
  initial,
  inherited,
  inheritedLabel,
  onClose,
  onSave,
}: LoyaltyCardEditorProps) {
  const [kind, setKind] = useState<LoyaltyKind>(initial?.kind ?? 'barcode')
  const [value, setValue] = useState(initial?.value ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [format, setFormat] = useState(initial?.format ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [scanError, setScanError] = useState('')
  const initialShortcut = parseShortcutName(initial?.value ?? '')
  const [linkMode, setLinkMode] = useState<'shortcut' | 'url'>(
    initialShortcut || (!initial?.value && isAppleMobile()) ? 'shortcut' : 'url',
  )
  const [shortcutName, setShortcutName] = useState(initialShortcut)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canDetect = canDetectBarcode()

  function applyAppValue(raw: string) {
    const shortcut = parseShortcutName(raw) || (isLatinShortcutName(raw) ? raw.trim() : '')
    if (shortcut) {
      setLinkMode('shortcut')
      setShortcutName(shortcut)
      setValue(shortcutOpenHref(shortcut))
      return
    }
    setLinkMode('url')
    setShortcutName('')
    setValue(raw)
  }

  function setShortcutNameFromInput(name: string) {
    setShortcutName(name)
    const trimmed = name.trim()
    if (!trimmed) {
      setValue('')
      setScanError('')
      return
    }
    if (!isLatinShortcutName(name)) {
      setValue('')
      setScanError('Имя команды — латиницей, без русских букв. Например: Kopilka')
      return
    }
    setScanError('')
    setValue(shortcutOpenHref(trimmed))
  }

  useEffect(() => {
    const shared = takeSharedAppLink()
    if (!shared) return
    setKind('app')
    applyAppValue(shared.url)
    if (shared.title) setLabel((current) => current.trim() || shared.title)
    setScanError('Взяли ссылку из приложения на телефоне.')
  }, [])

  const card: LoyaltyCard | undefined =
    value.trim() || (kind !== 'app' && image)
      ? {
          kind,
          value: value.trim(),
          ...(format.trim() ? { format: format.trim() } : {}),
          ...(label.trim() ? { label: label.trim() } : {}),
          ...(kind !== 'app' && image ? { image } : {}),
        }
      : undefined

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setScanError('')
    const snapshot = await fileToLoyaltyImage(file)
    try {
      const found = canDetect ? await detectCodeFromFile(file) : null
      if (found) {
        const nextKind = looksLikeUrl(found.value) ? 'app' : loyaltyKindFromFormat(found.format)
        setKind(nextKind)
        setValue(found.value)
        setFormat(found.format)
        setImage('')
        return
      }
      if (snapshot) {
        if (kind === 'app') setKind('barcode')
        setImage(snapshot)
        setScanError(
          canDetect
            ? 'Код с фото не разобрали — сохраним снимок карты.'
            : 'Этот телефон не разбирает код с фото — сохраним снимок штрих-кода.',
        )
        return
      }
      setScanError(
        canDetect
          ? 'На фото не найден штрихкод. Введите код вручную.'
          : 'Не удалось сохранить снимок. Введите код вручную.',
      )
    } catch {
      if (snapshot) {
        if (kind === 'app') setKind('barcode')
        setImage(snapshot)
        setScanError('Код не разобрали — сохраним снимок карты.')
        return
      }
      setScanError('Не удалось прочитать фото.')
    }
  }

  async function pasteLink() {
    try {
      const text = await readClipboardLink()
      if (!text) {
        setScanError('В буфере нет ссылки. Скопируйте её из приложения магазина.')
        return
      }
      applyAppValue(text)
      setScanError('')
    } catch {
      setScanError('Не удалось прочитать буфер. Вставьте ссылку вручную.')
    }
  }

  function pickOnPhone() {
    const ios = isAppleMobile()
    const opened = openInstalledAppsList()
    setScanError(
      ios
        ? 'Откроется «Команды». Новая команда → «Открыть приложение» → выберите программу. Назовите команду латиницей, например Kopilka, и введите это имя сюда — остальная ссылка подставится сама.'
        : opened
          ? 'Откройте нужную программу из списка установленных, скопируйте из неё ссылку (Поделиться) и вернитесь сюда — «Вставить ссылку».'
          : 'Откройте нужную программу на телефоне и скопируйте ссылку (Поделиться). Затем «Вставить ссылку». Имя программы может быть любым.',
    )
  }

  return (
    <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        {inherited && !initial ? (
          <p className="hint">
            Сейчас действует карта {inheritedLabel ?? 'группы'}. Своя карта списка её заменит.
          </p>
        ) : null}
        <p className="field-label">Вид</p>
        <div className="choice-row">
          {KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                item.id === 'barcode'
                  ? kind === 'barcode' || kind === 'qr'
                    ? 'choice active'
                    : 'choice'
                  : kind === item.id
                    ? 'choice active'
                    : 'choice'
              }
              onClick={() => {
                if (item.id === 'barcode') {
                  setKind(kind === 'qr' ? 'qr' : 'barcode')
                  return
                }
                setKind(item.id)
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
        {kind === 'app' ? (
          <>
            <label className="field-label" htmlFor="loyalty-label">
              Название программы
            </label>
            <input
              id="loyalty-label"
              className="input"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Как в телефоне — не обязательно как список"
            />
            <p className="field-label">Как открывать</p>
            <div className="choice-row">
              <button
                type="button"
                className={linkMode === 'shortcut' ? 'choice active' : 'choice'}
                onClick={() => {
                  setLinkMode('shortcut')
                  if (shortcutName.trim()) setShortcutNameFromInput(shortcutName)
                }}
              >
                Команда
              </button>
              <button
                type="button"
                className={linkMode === 'url' ? 'choice active' : 'choice'}
                onClick={() => setLinkMode('url')}
              >
                Ссылка
              </button>
            </div>
            {linkMode === 'shortcut' ? (
              <>
                <label className="field-label" htmlFor="loyalty-shortcut">
                  Имя быстрой команды
                </label>
                <input
                  id="loyalty-shortcut"
                  className="input"
                  value={shortcutName}
                  onChange={(event) => setShortcutNameFromInput(event.target.value)}
                  placeholder="Kopilka"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {value ? <p className="hint loyalty-view-url">{value}</p> : null}
              </>
            ) : (
              <>
                <label className="field-label" htmlFor="loyalty-value">
                  Ссылка, чтобы открыть её
                </label>
                <input
                  id="loyalty-value"
                  className="input"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="https://…"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </>
            )}
            <div className="choice-row">
              <button type="button" className="button-secondary" onClick={pickOnPhone}>
                {isAppleMobile() ? 'Открыть «Команды»' : 'Выбрать приложение на телефоне'}
              </button>
              {linkMode === 'url' ? (
                <button type="button" className="button-secondary" onClick={() => void pasteLink()}>
                  Вставить ссылку
                </button>
              ) : null}
              {value.trim() ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    if (!openLoyaltyApp(value)) setScanError(loyaltyAppError(value))
                  }}
                >
                  Проверить открытие
                </button>
              ) : null}
            </div>
            <p className="hint">
              {linkMode === 'shortcut'
                ? 'В «Командах» назовите быструю команду латиницей. Сюда впишите только это имя — строка shortcuts://run-shortcut?name= подставится сама.'
                : 'Либо вставьте https:// из «Поделиться», если программа его отдаёт.'}
            </p>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="loyalty-value">
              Код
            </label>
            <input
              id="loyalty-value"
              className="input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Номер с карты"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <label className="field-label" htmlFor="loyalty-label">
              Подпись
            </label>
            <input
              id="loyalty-label"
              className="input"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Например, Пятёрочка"
            />
          </>
        )}
        {kind !== 'app' ? (
          <div className="choice-row">
            <button
              type="button"
              className="button-secondary"
              onClick={() => cameraRef.current?.click()}
            >
              Сфотографировать
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => fileRef.current?.click()}
            >
              Из фото
            </button>
          </div>
        ) : null}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onPick}
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
        {scanError ? <p className="hint">{scanError}</p> : null}
        {card ? <LoyaltyCardView card={card} /> : null}
        <div
          className={
            initial || card ? 'dialog-actions dialog-actions--loyalty' : 'dialog-actions'
          }
        >
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={!card}
            onClick={() => {
              if (card) onSave(card)
            }}
          >
            Сохранить
          </button>
          {initial || card ? (
            <button
              type="button"
              className="button-danger dialog-actions-remove"
              onClick={() => onSave(undefined)}
            >
              Убрать
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
