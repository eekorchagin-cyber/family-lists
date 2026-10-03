/** Поиск и сравнение по-русски: «е» и «ё» считаются одной буквой. */
export function foldRu(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е')
}

export function sameRuText(left: string, right: string): boolean {
  return foldRu(left) === foldRu(right)
}

export function includesRu(haystack: string, needle: string): boolean {
  const n = foldRu(needle)
  if (!n) return true
  return foldRu(haystack).includes(n)
}
