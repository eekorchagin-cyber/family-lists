import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isLocalHost } from './data/sync/codes'
import { activateTransferDemoFromUrl } from './data/transferDemo'

activateTransferDemoFromUrl()

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    const paths = payload.updates.map((update) => update.path)
    if (paths.some((path) => path.includes('/src/data/') || path.includes('useAppState'))) {
      location.reload()
    }
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      () => {
        window.clearTimeout(timer)
        resolve(undefined)
      },
    )
  })
}

/**
 * Старый SW с перехватом навигации вешал ярлык при VPN.
 * Только снимаем регистрации — заново SW не ставим (register/update сами зависают на VPN).
 */
async function dropServiceWorkers() {
  if (isLocalHost(location.hostname) || !('serviceWorker' in navigator)) return
  let hadController = false
  try {
    hadController = Boolean(navigator.serviceWorker.controller)
  } catch {
    /* ignore */
  }
  await withTimeout(
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      } catch {
        /* ignore */
      }
      try {
        if (window.caches?.keys) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
      } catch {
        /* ignore */
      }
    })(),
    2500,
  )
  try {
    if (hadController && !sessionStorage.getItem('pokupki-sw-drop')) {
      sessionStorage.setItem('pokupki-sw-drop', '1')
      location.reload()
    }
  } catch {
    /* ignore */
  }
}

void dropServiceWorkers()

/** iOS на ярлыке сам сдвигает документ (после клавиатуры, при смене высоты списка) — шапка уходит за край. */
function pinPage() {
  const typing = () => {
    const el = document.activeElement
    return (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement && el.isContentEditable)
    )
  }
  const reset = () => {
    if (typing()) return
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
    for (const el of [
      document.documentElement,
      document.body,
      document.getElementById('root'),
      ...document.querySelectorAll<HTMLElement>('.screen'),
    ]) {
      if (el && (el.scrollTop !== 0 || el.scrollLeft !== 0)) {
        el.scrollTop = 0
        el.scrollLeft = 0
      }
    }
  }
  window.addEventListener('scroll', reset, { passive: true })
  document.addEventListener('scroll', reset, { capture: true, passive: true })
  document.addEventListener('focusout', () => window.setTimeout(reset, 60))
  window.visualViewport?.addEventListener('resize', () => window.setTimeout(reset, 60))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reset()
  })
}

pinPage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

queueMicrotask(() => {
  window.dispatchEvent(new Event('pokupki-ready'))
})
