export function canAutofocus(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
