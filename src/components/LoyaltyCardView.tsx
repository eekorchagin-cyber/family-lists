import { lazy, Suspense } from 'react'
import { loyaltyAppError, loyaltyAppHref, openLoyaltyApp, parseShortcutName } from '../data/loyaltyApps'
import { DialogHeading } from './DialogHeading'
import type { LoyaltyCard } from '../types'

const QrImage = lazy(() => import('./QrImage').then((module) => ({ default: module.QrImage })))
const BarcodeSvg = lazy(() =>
  import('./BarcodeSvg').then((module) => ({ default: module.BarcodeSvg })),
)

function CodeFallback() {
  return <p className="hint">Код рисуется…</p>
}

export function LoyaltyCardView({
  card,
  large = false,
  showOpen = true,
}: {
  card: LoyaltyCard
  large?: boolean
  showOpen?: boolean
}) {
  const shortcut = card.kind === 'app' ? parseShortcutName(card.value) : ''
  const label = card.label?.trim() || shortcut || card.value
  if (card.kind === 'app') {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {label ? <p className="loyalty-view-label">{label}</p> : null}
        {showOpen ? (
          <button
            type="button"
            className="button-primary loyalty-app-link"
            onClick={() => openLoyaltyApp(card.value)}
          >
            Открыть приложение
          </button>
        ) : null}
        <p className="hint loyalty-view-url">{card.value}</p>
        {loyaltyAppHref(card.value) ? null : (
          <p className="hint">{loyaltyAppError(card.value)}</p>
        )}
      </div>
    )
  }
  if (card.image && !card.value.trim()) {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <img className="loyalty-photo" src={card.image} alt={label || 'Штрихкод'} />
      </div>
    )
  }
  if (card.kind === 'qr' && card.value.trim()) {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <Suspense fallback={<CodeFallback />}>
          <QrImage value={card.value} label={label} size={large ? 280 : 180} />
        </Suspense>
      </div>
    )
  }
  if (card.value.trim()) {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <Suspense fallback={<CodeFallback />}>
          <BarcodeSvg value={card.value} format={card.format} label={label} />
        </Suspense>
      </div>
    )
  }
  return null
}

export function LoyaltyCardSheet({
  card,
  source,
  onClose,
}: {
  card: LoyaltyCard
  source?: 'store' | 'group'
  onClose: () => void
}) {
  return (
    <div className="overlay overlay--capture" role="presentation" onClick={onClose}>
      <div
        className="dialog loyalty-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeading title="Бонусная карта" onClose={onClose} />
        {source === 'group' ? (
          <p className="hint">Карта группы — у этого списка своей нет.</p>
        ) : null}
        <LoyaltyCardView card={card} large showOpen={false} />
        {card.kind === 'app' ? (
          <div className="dialog-actions dialog-actions-single">
            <button
              type="button"
              className="button-primary"
              onClick={() => openLoyaltyApp(card.value)}
            >
              Открыть приложение
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
