export function syncErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/invalid code|Неверный/i.test(text)) return 'Неверный или устаревший код'
  if (/already in a home/i.test(text)) return 'Этот человек уже в другом доме'
  if (/name taken/i.test(text)) {
    return 'Это имя уже в семье. Для своего телефона нужен код на T, не приглашение на D.'
  }
  if (/need pairing/i.test(text)) {
    return 'Этот телефон уже был в семье. Нужен код на T (Мой второй телефон), а не приглашение на D.'
  }
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
