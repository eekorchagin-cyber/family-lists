import type { ReactNode } from 'react'
import type { CategoryIconId } from '../data/categories'
import { WestieIcon } from './WestieIcon'

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      {children}
    </svg>
  )
}

/** Вентилятор с лопастями (вид сверху) */
export function FanIcon() {
  return (
    <IconSvg>
      {/* 4 лопасти */}
      <path
        d="M12 12 C13.2 8.2 15.6 5.4 18.4 5.1 C20.4 6.8 19.6 10.2 16.2 12.2 Z"
        fill="#cbd5e1"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 C15.8 13.2 18.6 15.6 18.9 18.4 C17.2 20.4 13.8 19.6 11.8 16.2 Z"
        fill="#e2e8f0"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 C10.8 15.8 8.4 18.6 5.6 18.9 C3.6 17.2 4.4 13.8 7.8 11.8 Z"
        fill="#cbd5e1"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 C8.2 10.8 5.4 8.4 5.1 5.6 C6.8 3.6 10.2 4.4 12.2 7.8 Z"
        fill="#e2e8f0"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="#f8fafc" stroke="#1c1917" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="0.9" fill="#1c1917" />
    </IconSvg>
  )
}

/** Рулон утеплителя */
export function InsulationIcon() {
  return (
    <IconSvg>
      {/* тело рулона */}
      <path
        d="M5.5 5.2h9.6c2.8 0 5 3 5 6.8s-2.2 6.8-5 6.8H5.5C3.1 18.8 1.2 15.8 1.2 12s1.9-6.8 4.3-6.8z"
        fill="#fde68a"
        stroke="#1c1917"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* торец рулона */}
      <ellipse
        cx="15.1"
        cy="12"
        rx="5"
        ry="6.8"
        fill="#fef3c7"
        stroke="#1c1917"
        strokeWidth="1.2"
      />
      <ellipse
        cx="15.1"
        cy="12"
        rx="3.1"
        ry="4.4"
        fill="none"
        stroke="#b45309"
        strokeWidth="1"
        opacity="0.7"
      />
      <ellipse
        cx="15.1"
        cy="12"
        rx="1.35"
        ry="2.1"
        fill="#fef9c3"
        stroke="#1c1917"
        strokeWidth="1"
      />
      {/* слои на боку */}
      <path
        d="M4.6 8h7.2M4.6 12h7.2M4.6 16h7.2"
        fill="none"
        stroke="#b45309"
        strokeWidth="0.95"
        strokeLinecap="round"
        opacity="0.65"
      />
    </IconSvg>
  )
}

/** Кафельная плитка */
export function TileIcon() {
  return (
    <IconSvg>
      <rect
        x="2.8"
        y="2.8"
        width="18.4"
        height="18.4"
        rx="1.2"
        fill="#e0f2fe"
        stroke="#1c1917"
        strokeWidth="1.25"
      />
      {/* швы 2×2 */}
      <path
        d="M12 2.8v18.4M2.8 12h18.4"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.35"
      />
      <rect x="4" y="4" width="6.4" height="6.4" rx="0.45" fill="#bae6fd" />
      <rect x="13.6" y="4" width="6.4" height="6.4" rx="0.45" fill="#7dd3fc" />
      <rect x="4" y="13.6" width="6.4" height="6.4" rx="0.45" fill="#7dd3fc" />
      <rect x="13.6" y="13.6" width="6.4" height="6.4" rx="0.45" fill="#bae6fd" />
      {/* блики на плитке */}
      <path
        d="M5.2 5.6h3.6M14.8 5.6h3.6M5.2 15.2h3.6M14.8 15.2h3.6"
        fill="none"
        stroke="#0284c7"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.4"
      />
    </IconSvg>
  )
}

/** Широкая малярная кисть с каплей краски */
export function PaintbrushIcon() {
  return (
    <IconSvg>
      {/* широкая щетина */}
      <path
        d="M3.4 2.8h17.2c.7 0 1.2.5 1.2 1.15v3.4c0 1.2-.75 2.05-1.65 2.55l-1.15.65H6.2l-1.15-.65C4.15 9.4 3.4 8.55 3.4 7.35V3.95c0-.65.5-1.15 1.2-1.15z"
        fill="#fef3c7"
        stroke="#1c1917"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M4 4.7h16M4.3 6.6h15.4M5 8.3h14"
        fill="none"
        stroke="#1c1917"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* краска на щетине */}
      <path
        d="M4.2 8.6h15.6c0 .9-.5 1.5-1.2 1.9H5.4c-.7-.4-1.2-1-1.2-1.9z"
        fill="#3b82f6"
        stroke="#1c1917"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* обойма */}
      <path
        d="M6 10.5h12l.85 2H5.15z"
        fill="#a8a29e"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      {/* рукоятка */}
      <path
        d="M9.5 12.5h5L13.3 19.8h-2.6z"
        fill="#d6d3d1"
        stroke="#1c1917"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 19.8h3.4c.5 0 .95.35.95.85v.9c0 .4-.45.75-.95.75h-3.4c-.5 0-.95-.35-.95-.75v-.9c0-.5.45-.85.95-.85z"
        fill="#78716c"
        stroke="#1c1917"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* капля краски */}
      <path
        d="M18.2 11.2c0 0 .15 1.1.9 1.85.55.55 1.35.75 1.55 1.55-.15 1.45-1.55 2.35-2.85 2.15-1.2-.2-2-1.35-1.85-2.55.15-1.05.95-1.7 2.25-3z"
        fill="#2563eb"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </IconSvg>
  )
}

/** Люстра с несколькими лампами */
export function ChandelierIcon() {
  return (
    <IconSvg>
      <circle cx="12" cy="2.2" r="1" fill="#f8fafc" stroke="#1c1917" strokeWidth="1" />
      <path
        d="M12 3.2v2.6"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="12" cy="6.3" r="1.2" fill="#e7e5e4" stroke="#1c1917" strokeWidth="1.05" />
      {/* рожки на 3 плафона */}
      <path
        d="M12 6.3c-3.4.1-5.8 1.6-7 3.5M12 6.3c3.4.1 5.8 1.6 7 3.5M12 6.3v3.2"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* плафоны */}
      <path
        d="M3.1 9.6h4.6l-.6 3.5c-.2 1.05-1.05 1.75-1.7 1.75s-1.5-.7-1.7-1.75z"
        fill="#fef9c3"
        stroke="#1c1917"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M9.7 9.9h4.6l-.6 3.5c-.2 1.05-1.05 1.75-1.7 1.75s-1.5-.7-1.7-1.75z"
        fill="#fef9c3"
        stroke="#1c1917"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M16.3 9.6h4.6l-.6 3.5c-.2 1.05-1.05 1.75-1.7 1.75s-1.5-.7-1.7-1.75z"
        fill="#fef9c3"
        stroke="#1c1917"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {/* лампы */}
      <circle cx="5.4" cy="17" r="1.4" fill="#fde68a" stroke="#1c1917" strokeWidth="1.05" />
      <circle cx="12" cy="17.4" r="1.4" fill="#fde68a" stroke="#1c1917" strokeWidth="1.05" />
      <circle cx="18.6" cy="17" r="1.4" fill="#fde68a" stroke="#1c1917" strokeWidth="1.05" />
      <path
        d="M5.4 14.85v.75M12 15.25v.75M18.6 14.85v.75"
        fill="none"
        stroke="#1c1917"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </IconSvg>
  )
}

const SPECIAL_ICONS: Partial<Record<CategoryIconId, () => ReactNode>> = {
  westie: () => <WestieIcon />,
  fan: () => <FanIcon />,
  insulation: () => <InsulationIcon />,
  tile: () => <TileIcon />,
  paintbrush: () => <PaintbrushIcon />,
  chandelier: () => <ChandelierIcon />,
}

export function CategorySpecialIcon({ id }: { id: string }) {
  const render = SPECIAL_ICONS[id as CategoryIconId]
  return render ? <>{render()}</> : null
}

export function hasCategorySpecialIcon(id: string): boolean {
  return id in SPECIAL_ICONS
}
