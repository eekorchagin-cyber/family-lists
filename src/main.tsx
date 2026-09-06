import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    const paths = payload.updates.map((update) => update.path)
    if (paths.some((path) => path.includes('/src/data/') || path.includes('useAppState'))) {
      location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
