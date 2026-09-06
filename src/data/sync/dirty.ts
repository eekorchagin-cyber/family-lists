export const DIRTY_EVENT = 'pokupki-sync-dirty'

export function markDirty(): void {
  window.dispatchEvent(new Event(DIRTY_EVENT))
}
