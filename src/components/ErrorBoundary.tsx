import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

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

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          boxSizing: 'border-box',
          padding: '32px 24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f4f7f5',
          color: '#1a2e24',
        }}
      >
        <h1 style={{ margin: '0 0 12px', fontSize: 22 }}>Что-то сломалось</h1>
        <p style={{ margin: '0 0 20px', lineHeight: 1.45, color: '#3d5a4c' }}>
          На этом телефоне приложение упало при запуске. Обычно помогает очистка кэша
          и повторная загрузка.
        </p>
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
    )
  }
}
