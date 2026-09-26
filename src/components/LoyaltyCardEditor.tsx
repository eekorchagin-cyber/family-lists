import { useRef, useState, type ChangeEvent } from 'react'
import {
  canDetectBarcode,
  detectCodeFromFile,
  looksLikeUrl,
  loyaltyKindFromFormat,
} from '../data/loyalty'
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
  const [scanError, setScanError] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canDetect = canDetectBarcode()

  const card: LoyaltyCard | undefined = value.trim()
    ? {
        kind,
        value: value.trim(),
        ...(format.trim() ? { format: format.trim() } : {}),
        ...(label.trim() ? { label: label.trim() } : {}),
      }
    : undefined

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setScanError('')
    try {
      const found = await detectCodeFromFile(file)
      if (!found) {
        setScanError(
          canDetect
            ? 'На фото не найден штрихкод или QR. Введите код вручную.'
            : 'Этот телефон не умеет разбирать код с фото. Введите его вручную.',
        )
        return
      }
      const nextKind = looksLikeUrl(found.value) ? 'app' : loyaltyKindFromFormat(found.format)
      setKind(nextKind)
      setValue(found.value)
      setFormat(found.format)
    } catch {
      setScanError('Не удалось прочитать фото.')
    }
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
        <label className="field-label" htmlFor="loyalty-value">
          {kind === 'app' ? 'Ссылка на приложение' : 'Код'}
        </label>
        <input
          id="loyalty-value"
          className="input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={kind === 'app' ? 'https://' : 'Номер с карты'}
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
        {!canDetect ? (
          <p className="hint" style={{ opacity: 0.75 }}>
            Разбор кода с фото есть не на всех телефонах. Код можно ввести руками.
          </p>
        ) : null}
        {card ? <LoyaltyCardView card={card} /> : null}
        <div className="dialog-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Отмена
          </button>
          {initial || card ? (
            <button type="button" className="button-danger" onClick={() => onSave(undefined)}>
              Убрать
            </button>
          ) : null}
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
        </div>
      </div>
    </div>
  )
}
