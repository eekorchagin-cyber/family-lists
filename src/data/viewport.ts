export function canAutofocus(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function syncVisualViewport() {
  const viewport = window.visualViewport
  const height = Math.round(viewport?.height ?? window.innerHeight)
  const offsetTop = Math.round(viewport?.offsetTop ?? 0)
  const root = document.documentElement
  root.style.setProperty('--app-height', `${height}px`)
  root.style.setProperty('--app-offset-top', `${offsetTop}px`)
}
