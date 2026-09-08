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

export function SettingsIcon() {
  return (
    <svg {...icon}>
      <circle cx="5.5" cy="12" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.45" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.45" fill="currentColor" stroke="none" />
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
