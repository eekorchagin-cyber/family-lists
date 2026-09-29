import { Component, type ErrorInfo, type ReactNode } from 'react'

const CRASH_SEEN_KEY = 'pokupki-crash-seen'

const REPEAT_HELP = [
  'Что-то сломалось',
  '',
  'Кнопка «Обновить приложение» уже не помогла. Списки в облаке останутся. Ярлык на экране «Домой» не удаляйте.',
  '',
  '1. Полностью закройте «Возьми»: смахните вверх от нижнего края экрана, на карточке программы смахните вверх.',
  '2. Откройте снова с ярлыка на экране «Домой». Вкладку Safari не открывайте — там другая копия.',
  '3. Если после этого снова видно «Что-то сломалось», очистите данные сайта: «Настройки» → «Приложения» → Safari → «Дополнения» → «Данные сайтов». Найдите family-lists, смахните влево и нажмите «Удалить». На старых iPhone: «Настройки» → Safari → «Дополнения» → «Данные сайтов».',
  '4. После удаления ещё раз откройте программу с ярлыка.',
].join('\n')

let crashNoted = false
let crashRepeat = false

export function clearCrashSeen(): void {
  try {
    localStorage.removeItem(CRASH_SEEN_KEY)
  } catch {
    /* ignore */
  }
}

function crashIsRepeat(): boolean {
  if (crashNoted) return crashRepeat
  crashNoted = true
  try {
    crashRepeat = localStorage.getItem(CRASH_SEEN_KEY) === '1'
    localStorage.setItem(CRASH_SEEN_KEY, '1')
  } catch {
    crashRepeat = false
  }
  return crashRepeat
}

type Props = { children: ReactNode }
type State = { error: Error | null; copied: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('app crash', error, info.componentStack)
  }

  private async recover() {
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch {
      /* ignore */
    }
    const url = new URL(location.href)
    url.searchParams.set('v', String(Date.now()))
    location.replace(url.toString())
  }

  private async copyHelp() {
    let ok = false
    try {
      await navigator.clipboard.writeText(REPEAT_HELP)
      ok = true
    } catch {
      try {
        const area = document.createElement('textarea')
        area.value = REPEAT_HELP
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.select()
        ok = document.execCommand('copy')
        area.remove()
      } catch {
        ok = false
      }
    }
    if (ok) this.setState({ copied: true })
  }

  render() {
    if (!this.state.error) return this.props.children
    const repeat = crashIsRepeat()
    return (
      <div
        style={{
          height: '100%',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          padding: '32px 24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f4f7f5',
          color: '#1a2e24',
        }}
      >
        <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>Что-то сломалось</h1>
        <p style={{ margin: '0 0 12px', lineHeight: 1.45, color: '#3d5a4c' }}>
          {repeat
            ? 'Кнопка «Обновить приложение» уже не помогла. Списки в облаке останутся. Ярлык на экране «Домой» не удаляйте.'
            : 'На этом телефоне программа упала при запуске. Нажмите «Обновить приложение»: кнопка сотрёт сохранённую копию файлов и откроет программу заново. Списки в облаке останутся. Ярлык на экране «Домой» не удаляйте.'}
        </p>
        {repeat ? (
          <>
            <p style={{ margin: '0 0 8px', lineHeight: 1.45, color: '#3d5a4c' }}>
              Скопируйте текст в Заметки и сделайте так. Пока вы в Настройках, этот экран не виден.
            </p>
            <ol style={{ margin: '0 0 20px', paddingLeft: 22, lineHeight: 1.45, color: '#3d5a4c' }}>
              <li style={{ marginBottom: 8 }}>
                Полностью закройте «Возьми»: смахните вверх от нижнего края экрана, на карточке
                программы смахните вверх.
              </li>
              <li style={{ marginBottom: 8 }}>
                Откройте снова с ярлыка на экране «Домой». Вкладку Safari не открывайте — там
                другая копия.
              </li>
              <li style={{ marginBottom: 8 }}>
                Если после этого снова видно «Что-то сломалось», очистите данные сайта:
                «Настройки» → «Приложения» → Safari → «Дополнения» → «Данные сайтов». Найдите
                family-lists, смахните влево и нажмите «Удалить». На старых iPhone: «Настройки» →
                Safari → «Дополнения» → «Данные сайтов».
              </li>
              <li>После удаления ещё раз откройте программу с ярлыка.</li>
            </ol>
          </>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        {repeat ? (
          <button
            type="button"
            onClick={() => {
              void this.copyHelp()
            }}
            style={{
              appearance: 'none',
              border: '1px solid #c5d5cb',
              borderRadius: 12,
              padding: '14px 18px',
              fontSize: 16,
              fontWeight: 600,
              background: '#fff',
              color: '#1a2e24',
            }}
          >
            {this.state.copied ? 'Скопировано' : 'Скопировать текст'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void this.recover()
          }}
          style={{
            appearance: 'none',
            border: 0,
            borderRadius: 12,
            padding: '14px 18px',
            fontSize: 16,
            fontWeight: 600,
            background: '#2a7a4f',
            color: '#fff',
          }}
        >
          Обновить приложение
        </button>
        </div>
      </div>
    )
  }
}
