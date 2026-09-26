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
  loyaltyAppError,
  openInstalledAppsList,
  openLoyaltyApp,
  readClipboardLink,
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
  { id: 'qr', title: 'QR' },
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
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canDetect = canDetectBarcode()

  useEffect(() => {
    const shared = takeSharedAppLink()
    if (!shared) return
    setKind('app')
    setValue(shared.url)
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
          ? 'На фото не найден штрихкод или QR. Введите код вручную.'
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
      setValue(text)
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
        ? 'Откроется «Команды». Новая команда → «Открыть приложение» → выберите программу. Назовите команду латиницей, например Kopilka. Сюда вставьте: shortcuts://run-shortcut?name=Kopilka'
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
              className={kind === item.id ? 'choice active' : 'choice'}
              onClick={() => setKind(item.id)}
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
            <label className="field-label" htmlFor="loyalty-value">
              Ссылка, чтобы открыть её
            </label>
            <input
              id="loyalty-value"
              className="input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://… или shortcuts://run-shortcut?name=Kopilka"
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
              Название программы и ссылка — разные поля. Русское имя в ссылку ставить нельзя:
              Safari примет его за страницу сайта. На iPhone: «Команды» → действие «Открыть
              приложение» → ссылка shortcuts://run-shortcut?name=ИмяКоманды. Либо https:// из
              «Поделиться», если программа его отдаёт.
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
