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
