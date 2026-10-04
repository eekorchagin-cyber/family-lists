import { isTransferDemo } from '../transferDemo'

export const DIRTY_EVENT = 'pokupki-sync-dirty'

export function markDirty(): void {
  if (isTransferDemo()) return
  window.dispatchEvent(new Event(DIRTY_EVENT))
}
