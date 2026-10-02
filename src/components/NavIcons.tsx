const icon = {
  viewBox: '0 0 24 24',
  width: 26,
  height: 26,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.85,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

export function BackIcon() {
  return (
    <svg {...icon}>
      <path d="M14.5 5.5 7.5 12l7 6.5" />
      <path d="M8 12h10" />
    </svg>
  )
}

export function TransferIcon() {
  return (
    <svg {...icon}>
      <path d="M5 8h11" />
      <path d="M13.5 5 18 8l-4.5 3" />
      <path d="M19 16H8" />
      <path d="M10.5 13 6 16l4.5 3" />
    </svg>
  )
}

/** Стереть купленные из текущего списка */
export function ClearBoughtIcon() {
  return (
    <svg {...icon}>
      <path d="M14.2 3.8 8.4 14.2" />
      <path d="M6.2 12.4 4.4 17.2c2 .9 4.1 1.2 6 .1l1.8-4.9" />
      <path d="M5.4 14.3c1.3.35 2.7.4 4 .05" />
      <path d="M6.6 16c1.1.25 2.3.25 3.4 0" />
      <path d="M16.2 7.2 18.5 5" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg {...icon}>
      <circle cx="5.5" cy="12" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.45" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CardIcon() {
  return (
    <svg {...icon}>
      <rect x="3.2" y="6.2" width="17.6" height="12.2" rx="2" />
      <path d="M3.2 10.2h17.6" />
      <path d="M7 15.2h4" />
    </svg>
  )
}

export function HelpIcon() {
  return (
    <svg {...icon}>
      <path d="M9 9a3 3 0 1 1 3.8 2.9c-.9.4-1.4 1.1-1.4 2.1" />
      <path d="M12 17.6v.2" strokeWidth="2.2" />
    </svg>
  )
}
