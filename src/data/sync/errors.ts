export function syncErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/invalid code|Неверный/i.test(text)) return 'Неверный или устаревший код'
  if (/already in a home/i.test(text)) return 'Этот человек уже в другом доме'
  if (/forbidden/i.test(text)) return 'Это может сделать только организатор дома'
  if (/no home/i.test(text)) {
    return 'Вернуться в дом может только организатор. Остальным нужен код.'
  }
  if (/Failed to fetch|NetworkError|network/i.test(text)) {
    return 'Нет сети. Изменения останутся на этом телефоне.'
  }
  if (/Supabase не настроен/i.test(text)) return 'Синхронизация на сайте ещё не включена'
  return 'Не получилось. Попробуйте ещё раз.'
}
