import { BarcodeSvg } from './BarcodeSvg'
import { QrImage } from './QrImage'
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
        <a className="button-primary loyalty-app-link" href={card.value} target="_blank" rel="noreferrer">
          Открыть приложение магазина
        </a>
        <p className="hint loyalty-view-url">{card.value}</p>
      </div>
    )
  }
  if (card.kind === 'qr') {
    return (
      <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
        {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
        <QrImage value={card.value} label={label} size={large ? 280 : 180} />
      </div>
    )
  }
  return (
    <div className={large ? 'loyalty-view loyalty-view--large' : 'loyalty-view'}>
      {card.label ? <p className="loyalty-view-label">{card.label}</p> : null}
      <BarcodeSvg value={card.value} format={card.format} label={label} />
    </div>
  )
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
