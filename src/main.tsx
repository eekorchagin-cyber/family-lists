import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { isLocalHost } from './data/sync/codes'

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    const paths = payload.updates.map((update) => update.path)
    if (paths.some((path) => path.includes('/src/data/') || path.includes('useAppState'))) {
      location.reload()
    }
  })
}

/** Старый SW с cache:reload блокировал открытие при VPN — снимаем контроль. */
async function dropServiceWorkers() {
  if (isLocalHost(location.hostname) || !('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    if (regs.length > 0) {
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch {
    /* ignore */
  }
  try {
    // Короткий «самоудаляющийся» SW снимает зависший controlling worker после обновления.
    const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    await reg.update()
  } catch {
    /* ignore */
  }
  try {
    if (!sessionStorage.getItem('pokupki-sw-drop') && navigator.serviceWorker.controller) {
      sessionStorage.setItem('pokupki-sw-drop', '1')
      location.reload()
    }
  } catch {
    /* ignore */
  }
}

navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type !== 'pokupki-sw-cleared') return
  try {
    if (sessionStorage.getItem('pokupki-sw-drop') === '2') return
    sessionStorage.setItem('pokupki-sw-drop', '2')
  } catch {
    /* ignore */
  }
  location.reload()
})

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
