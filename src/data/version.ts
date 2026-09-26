export const APP_VERSION = __APP_VERSION__
export const APP_AUTHOR = 'Egor Korchagin'
export const APP_CREATED_YEAR = 2026

export function parseAppVersion(raw = APP_VERSION): {
  version: string
  stamp: string
  builtLabel: string
  year: number
} {
  const plus = raw.indexOf('+')
  const version = plus === -1 ? raw : raw.slice(0, plus)
  const stamp = plus === -1 ? '' : raw.slice(plus + 1)
  const match = stamp.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/)
  if (!match) {
    return { version, stamp, builtLabel: stamp, year: APP_CREATED_YEAR }
  }
  const year = Number(match[1])
  return {
    version,
    stamp,
    builtLabel: `${match[3]}.${match[2]}.${match[1]}, ${match[4]}:${match[5]}`,
    year,
  }
}

export function copyrightLine(): string {
  const { year } = parseAppVersion()
  const last = Number.isFinite(year) && year > APP_CREATED_YEAR ? year : APP_CREATED_YEAR
  const years =
    last > APP_CREATED_YEAR ? `${APP_CREATED_YEAR}–${last}` : String(APP_CREATED_YEAR)
  return `© ${years} ${APP_AUTHOR}`
}
