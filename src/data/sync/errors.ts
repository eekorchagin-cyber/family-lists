export function syncErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/user limit/i.test(text)) {
    return 'Набор новых людей закрыт: лимит заполнен.'
  }
  if (/need name/i.test(text)) return 'Укажите имя'
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
  if (/creator cannot leave/i.test(text)) {
    return 'Организатор не может выйти из семьи. Сначала исключите остальных или останьтесь в доме.'
  }
  if (/not in a home/i.test(text)) {
    return 'Вы сейчас не в семье.'
  }
  if (/last admin/i.test(text)) {
    return 'Нельзя удалить последний аккаунт администратора: иначе никто не выдаст код P.'
  }
  if (/Failed to fetch|NetworkError|network/i.test(text)) {
    return 'Нет сети. Списки на этом телефоне уже можно вести — они уедут в облако, когда сеть появится.'
  }
  if (/Supabase не настроен/i.test(text)) return 'Облако на сайте ещё не включено'
  if (/row-level security|JWT|not signed in|invalid claim|Auth session/i.test(text)) {
    return 'Вход ещё чуть-чуть не дошёл. Нажмите «Обновить» через пару секунд.'
  }
  return 'Облако пока не ответило. Списки на этом телефоне уже можно вести. Нажмите «Обновить».'
}
