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

if (!isLocalHost(location.hostname) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
