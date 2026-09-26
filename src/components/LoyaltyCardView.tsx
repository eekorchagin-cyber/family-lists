import { BarcodeSvg } from './BarcodeSvg'
import { QrImage } from './QrImage'
import { openLoyaltyApp } from '../data/loyaltyApps'
import type { LoyaltyCard } from '../types'

export function LoyaltyCardView({
  card,
  large = false,
}: {
  card: LoyaltyCard
  large?: boolean
}) {
  const label = card.label?.trim() || card.value
  if (card.kind === 'app') {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <button
          type="button"
          className="button-primary loyalty-app-link"
          onClick={() => openLoyaltyApp(card.value)}
        >
          Открыть приложение
        </button>
        <p className="hint loyalty-view-url">{card.value}</p>
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
        <QrImage value={card.value} label={label} size={large ? 280 : 180} />
      </div>
    )
  }
  if (card.value.trim()) {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <BarcodeSvg value={card.value} format={card.format} label={label} />
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
        <h2>Бонусная карта</h2>
        {source === 'group' ? (
          <p className="hint">Карта группы — у этого списка своей нет.</p>
        ) : null}
        <LoyaltyCardView card={card} large />
        <div className="dialog-actions">
          <button type="button" className="button-primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
