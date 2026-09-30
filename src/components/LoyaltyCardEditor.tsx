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
  isCustomAppScheme,
  isLatinShortcutName,
  loyaltyAppError,
  loyaltyAppHref,
  openInstalledAppsList,
  openLoyaltyApp,
  parseShortcutName,
  readClipboardLink,
  shortcutOpenHref,
  takeSharedAppLink,
} from '../data/loyaltyApps'
import type { LoyaltyCard, LoyaltyKind } from '../types'
import { DialogTitle } from './DialogTitle'
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

function sameCard(a: LoyaltyCard | undefined, b: LoyaltyCard | undefined): boolean {
  if (!a || !b) return false
  return (
    a.kind === b.kind &&
    a.value === b.value &&
    (a.label ?? '') === (b.label ?? '') &&
    (a.format ?? '') === (b.format ?? '') &&
    (a.image ?? '') === (b.image ?? '')
  )
}

export function LoyaltyCardEditor({
  title = 'Бонусная карта',
  initial,
  inherited,
  inheritedLabel,
  onClose,
  onSave,
}: LoyaltyCardEditorProps) {
  const shown = initial ?? inherited
  const [kind, setKind] = useState<LoyaltyKind>(shown?.kind ?? 'barcode')
  const [value, setValue] = useState(shown?.value ?? '')
  const [label, setLabel] = useState(shown?.label ?? '')
  const [format, setFormat] = useState(shown?.format ?? '')
  const [image, setImage] = useState(shown?.image ?? '')
  const [scanError, setScanError] = useState('')
  const initialShortcut = parseShortcutName(shown?.value ?? '')
  const [shortcutName, setShortcutName] = useState(initialShortcut)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canDetect = canDetectBarcode()

  function applyAppValue(raw: string) {
    const href = loyaltyAppHref(raw)
    if (isCustomAppScheme(raw) || (href && isCustomAppScheme(href))) {
      setShortcutName('')
      setValue(href || raw.trim())
      setScanError('')
      return
    }
    const shortcut = parseShortcutName(raw) || parseShortcutName(href) || (isLatinShortcutName(raw) ? raw.trim() : '')
    if (shortcut) {
      setShortcutName(shortcut)
      setValue(shortcutOpenHref(shortcut))
      return
    }
    setShortcutName('')
    setValue(href || raw)
  }

  function setShortcutNameFromInput(name: string) {
    setShortcutName(name)
    const trimmed = name.trim()
    if (!trimmed) {
      setScanError('')
      return
    }
    if (trimmed.includes(':')) {
      applyAppValue(name)
      return
    }
    if (!isLatinShortcutName(name)) {
      setScanError('Имя команды — латиницей, без русских букв. Например: Kopilka')
      return
    }
    setScanError('')
    setValue(shortcutOpenHref(trimmed))
  }

  function setUrlFromInput(raw: string) {
    setValue(raw)
    const shortcut = parseShortcutName(raw)
    if (shortcut) setShortcutName(shortcut)
    else if (raw.includes(':')) setShortcutName('')
    setScanError('')
  }

  useEffect(() => {
    const shared = takeSharedAppLink()
    if (!shared) return
    setKind('app')
    applyAppValue(shared.url)
    if (shared.title) setLabel((current) => current.trim() || shared.title)
    setScanError('Взяли ссылку из приложения на телефоне.')
  }, [])

  const appValue = kind === 'app' ? loyaltyAppHref(value) || value.trim() : value.trim()
  const card: LoyaltyCard | undefined =
    appValue || (kind !== 'app' && image)
      ? {
          kind,
          value: appValue,
          ...(format.trim() ? { format: format.trim() } : {}),
          ...(label.trim() ? { label: label.trim() } : {}),
          ...(kind !== 'app' && image ? { image } : {}),
        }
      : undefined
  const inheritedOnly = !initial && sameCard(card, inherited)

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
        <DialogTitle title={title} onBack={onClose} />
        {inherited && !initial ? (
          <p className="hint">
            {inherited.kind === 'app' && parseShortcutName(inherited.value)
              ? `Это карта ${inheritedLabel ?? 'группы'}, команда ${parseShortcutName(inherited.value)}. Она на месте. `
              : `Это карта ${inheritedLabel ?? 'группы'}. Она на месте. `}
            «Сохранить» закрепит копию только за этим списком.
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
            <label className="field-label" htmlFor="loyalty-shortcut">
              Имя быстрой команды
            </label>
            <input
              id="loyalty-shortcut"
              className="input"
              value={shortcutName}
              onChange={(event) => setShortcutNameFromInput(event.target.value)}
              placeholder="Kopilka — если открываете через «Команды»"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <label className="field-label" htmlFor="loyalty-value">
              Ссылка приложения
            </label>
            <input
              id="loyalty-value"
              className="input"
              value={value}
              onChange={(event) => setUrlFromInput(event.target.value)}
              placeholder="OZON:// или https://…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="choice-row">
              <button type="button" className="button-secondary" onClick={pickOnPhone}>
                {isAppleMobile() ? 'Открыть «Команды»' : 'Выбрать приложение на телефоне'}
              </button>
              <button type="button" className="button-secondary" onClick={() => void pasteLink()}>
                Вставить ссылку
              </button>
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
              Для OZON и похожих программ вставьте схему в ссылку, например OZON://. Поле «Имя
              команды» не трогайте. Если открываете через «Команды», впишите только латинское имя —
              ссылка shortcuts:// подставится сама.
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
            initial || (card && !inheritedOnly)
              ? 'dialog-actions dialog-actions-single dialog-actions--loyalty'
              : 'dialog-actions dialog-actions-single'
          }
        >
          <button
            type="button"
            className="button-primary"
            disabled={!card || inheritedOnly}
            onClick={() => {
              if (card) onSave(card)
            }}
          >
            Сохранить
          </button>
          {initial || (card && !inheritedOnly) ? (
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
