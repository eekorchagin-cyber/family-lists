import type { ReactNode } from 'react'
import type { CategoryIconId } from '../data/categories'

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      {children}
    </svg>
  )
}

/** Лента: жёлтый квадрат и красная лента */
export function LentaIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#f5c518" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M6.2 7.2c4.4 1.2 7.4 1.2 11.6 0v2.1c-2.1.7-4.4 1.1-5.8 2.8 1.4 1.7 3.7 2.1 5.8 2.8v2.1c-4.4-1.2-7.4-1.2-11.6 0V7.2z"
        fill="#e31b23"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Перекрёсток: зелёный круг и перекрестье дорог */
export function PerekrestokIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="9.2" fill="#2e7d32" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M12 5.2v13.6M5.2 12h13.6"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M12 5.2v13.6M5.2 12h13.6"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** Красное и Белое: круг красный/белый и бутылка */
export function KrasnoeBeloeIcon() {
  return (
    <IconSvg>
      <path d="M12 2.8a9.2 9.2 0 0 1 0 18.4Z" fill="#e11d2e" stroke="#1c1917" strokeWidth="1.2" />
      <path d="M12 2.8a9.2 9.2 0 0 0 0 18.4Z" fill="#f8fafc" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M10.4 6.2h3.2l.7 2.2v8.4c0 .9-.7 1.6-1.6 1.6h-1.4c-.9 0-1.6-.7-1.6-1.6V8.4z"
        fill="#f8fafc"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <rect x="10.7" y="4.4" width="2.6" height="2.2" rx="0.5" fill="#e11d2e" stroke="#1c1917" strokeWidth="0.9" />
    </IconSvg>
  )
}

/** Ашан: красная птица */
export function AuchanIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="9.2" fill="#e4002b" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M6.4 13.6c2.6-1 4.2-3.8 4.8-6.6 2.2 1.6 4.8 3.4 7.4 3.2-1.8 1.4-3.1 2.2-4.2 4.4 1.8.2 3.6.4 5.2 1.4-3.4.6-6.2.2-8.8-.6-1.2 1.6-2.2 2.8-4.4 3.6 1-1.8 1.2-3.6 0-5.4z"
        fill="#f8fafc"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** METRO: синий квадрат и жёлтая M */
export function MetroIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#003d7c" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M5.6 16.8V7.4h3.1l3.3 6.4 3.3-6.4H18.4v9.4h-2.6V11L12.6 17h-1.2L8.2 11v5.8z"
        fill="#f6c915"
        stroke="#1c1917"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Командор: зелёная K */
export function KomandorIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5" fill="#1b7a3d" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M8.2 6.2h3.1v4.3L16.4 6.2h3.4l-6.1 5.9 6.3 5.7h-3.5l-5.2-4.7v4.7H8.2z"
        fill="#f8fafc"
        stroke="#14532d"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Пятёрочка: красный круг и пятёрка */
export function PyaterochkaIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="12" r="9.2" fill="#e30613" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M8.4 8.1h6.6v2H10.6v1.5h3.4c1.3 0 2.3 1 2.3 2.4 0 1.6-1.2 2.8-3 2.8H8.6v-2h4.4c.5 0 1-.3 1-.8s-.4-.8-1-.8H8.4z"
        fill="#f8fafc"
        stroke="#1c1917"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M16.6 6.2c.8 1.1.6 2.4-.4 3"
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** Лемана ПРО: жёлтый дом */
export function LemanaProIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#f5c400" stroke="#1c1917" strokeWidth="1.2" />
      <path
        d="M4.8 12.4 12 5.4l7.2 7"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M7.1 12.1h9.8V18.6H7.1z" fill="#fff7cc" stroke="#1c1917" strokeWidth="1.1" />
      <rect x="10.4" y="13.8" width="3.2" height="4.8" fill="#1c1917" />
    </IconSvg>
  )
}

/** Батон: батон хлеба */
export function BatonIcon() {
  return (
    <IconSvg>
      <path
        d="M4.2 14.2c0-4.4 3.4-8 7.8-8s7.8 3.6 7.8 8c0 2.2-1.6 3.6-3.8 3.6H8c-2.2 0-3.8-1.4-3.8-3.6z"
        fill="#f59e0b"
        stroke="#1c1917"
        strokeWidth="1.2"
      />
      <path
        d="M8.2 9.4c.8.6 1.6.6 2.4 0M11.6 8.8c.8.6 1.6.6 2.4 0M15 9.4c.8.6 1.5.6 2.2 0"
        fill="none"
        stroke="#b45309"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** OZON: синий овал */
export function OzonIcon() {
  return (
    <IconSvg>
      <rect x="2.2" y="5.2" width="19.6" height="13.6" rx="6.8" fill="#005bff" stroke="#1c1917" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="#f8fafc" strokeWidth="2.1" />
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="#1c1917" strokeWidth="0.8" />
    </IconSvg>
  )
}

/** RedSale: красный парус */
export function RedSaleIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#f8fafc" stroke="#1c1917" strokeWidth="1.2" />
      <path d="M7.2 18.4h9.6" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11.2 18.2V5.4" stroke="#1c1917" strokeWidth="1.25" strokeLinecap="round" />
      <path
        d="M11.4 5.6 18 12.2l-6.6 1.4z"
        fill="#dc2626"
        stroke="#1c1917"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Кум-Тигей: песчаный холм */
export function KumTigeyIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#7dd3fc" stroke="#1c1917" strokeWidth="1.2" />
      <path d="M3.4 16.8 8.6 9.4 12.2 13l3.2-3.8 5.2 7.6z" fill="#d6a35c" stroke="#1c1917" strokeWidth="1.1" />
      <path d="M11.2 9.4h1.8v3.2h-1.8z" fill="#b45309" stroke="#1c1917" strokeWidth="0.85" />
      <path d="M10.2 9.6 12.1 7.4 14 9.6z" fill="#f8fafc" stroke="#1c1917" strokeWidth="0.9" />
    </IconSvg>
  )
}

/** Командировка: летящий самолёт */
export function BusinessTripIcon() {
  return (
    <IconSvg>
      <path
        d="M2.8 14.6 13.6 9.8 20.4 6.4c.75-.4 1.5.35 1.05 1.05L17 14.6l-4.6 2.05 1.85 4.15c.22.5-.4.95-.82.62L10.7 18.7 7.15 20.3 5.9 17.35 3.05 16.1c-.55-.22-.5-.95-.25-1.5z"
        fill="#64748b"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 13.8 15.1 9.2"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** Отпуск на море: солнце и волны */
export function SeaVacationIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="8.2" r="3.4" fill="#fbbf24" stroke="#1c1917" strokeWidth="1.15" />
      <path
        d="M12 3.2v1.1M12 12.1v1.1M7.1 8.2H6M18 8.2h-1.1M8.5 4.7l-.8-.8M16.3 12.5l-.8-.8M16.3 3.9l-.8.8M8.5 11.7l-.8.8"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M3.4 16.2c1.6 1.6 3.2 1.6 4.8 0s3.2-1.6 4.8 0 3.2 1.6 4.8 0 3.2-1.6 4.8 0"
        fill="none"
        stroke="#0284c7"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M3.4 19.2c1.6 1.6 3.2 1.6 4.8 0s3.2-1.6 4.8 0 3.2 1.6 4.8 0 3.2-1.6 4.8 0"
        fill="none"
        stroke="#0369a1"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

/** Губернские Аптеки: зелёный квадрат и белый крест */
export function GubernskieAptekiIcon() {
  return (
    <IconSvg>
      <rect x="2.3" y="2.3" width="19.4" height="19.4" rx="5.4" fill="#1f8f4a" stroke="#1c1917" strokeWidth="1.2" />
      <rect x="9.55" y="5.15" width="4.9" height="13.7" rx="1.55" fill="#f8fafc" />
      <rect x="5.15" y="9.55" width="13.7" height="4.9" rx="1.55" fill="#f8fafc" />
    </IconSvg>
  )
}

/** Отпуск в горах */
export function MountainVacationIcon() {
  return (
    <IconSvg>
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4.2" fill="#bae6fd" stroke="#1c1917" strokeWidth="1.2" />
      <path d="M3.6 18.4 9.2 8.6 13 14.2 15.2 11.2 20.4 18.4z" fill="#64748b" stroke="#1c1917" strokeWidth="1.1" />
      <path d="M7.8 11.2 9.2 8.6l1.5 2.1z" fill="#f8fafc" stroke="#1c1917" strokeWidth="0.85" />
      <path d="M14.2 12.8 15.2 11.2l1.3 1.8z" fill="#f8fafc" stroke="#1c1917" strokeWidth="0.85" />
    </IconSvg>
  )
}

export const GROUP_SPECIAL_ICONS: Partial<Record<CategoryIconId, () => ReactNode>> = {
  lenta: () => <LentaIcon />,
  perekrestok: () => <PerekrestokIcon />,
  krasnoeBeloe: () => <KrasnoeBeloeIcon />,
  auchan: () => <AuchanIcon />,
  metro: () => <MetroIcon />,
  komandor: () => <KomandorIcon />,
  pyaterochka: () => <PyaterochkaIcon />,
  lemanapro: () => <LemanaProIcon />,
  baton: () => <BatonIcon />,
  ozon: () => <OzonIcon />,
  redsale: () => <RedSaleIcon />,
  kumtigey: () => <KumTigeyIcon />,
  gubernskie: () => <GubernskieAptekiIcon />,
  businessTrip: () => <BusinessTripIcon />,
  seaVacation: () => <SeaVacationIcon />,
  mountainVacation: () => <MountainVacationIcon />,
}
