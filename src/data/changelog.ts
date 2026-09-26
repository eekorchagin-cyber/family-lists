import { APP_VERSION, parseAppVersion } from './version'

export type ChangelogEntry = {
  version: string
  date: string
  notes: string
}

const CURRENT_NOTES =
  'На iPhone бонусную программу открывают через «Команды» (shortcuts://), а не русским именем вроде КопилкаДоставка:// — так больше нет ошибки GitHub Pages «File not found».'

const HISTORY: ChangelogEntry[] = [
  {
    version: '0.3.0+20260926-2233',
    date: '26.09.2026, 22:33',
    notes:
      'Привязка бонусной карты к программе с телефона без заранее прописанного списка. Штрихкод карты на 4/5 ширины экрана. Значок командировки — самолёт. Контурный бейдж группы, если вложенные списки не входят в сумму ярлыка. Значки на плашках списков. Журнал обновлений в «О программе».',
  },
  {
    version: '0.3.0+20260926-2034',
    date: '26.09.2026, 20:34',
    notes:
      'Значки групп магазинов и поездок. Шаблоны товаров из любого списка. Если телефон не читает штрихкод с фото, сохраняется снимок карты.',
  },
  {
    version: '0.3.0+20260926-1857',
    date: '26.09.2026, 18:57',
    notes: 'После обновления телефон сам возвращается в семью, если человек сам не выходил.',
  },
  {
    version: '0.3.0+20260926-1824',
    date: '26.09.2026, 18:24',
    notes: 'Исправлено открытие с ярлыка iPhone (ошибка Safari FetchEvent.respondWith / Load failed).',
  },
  {
    version: '0.3.0',
    date: '26.09.2026',
    notes:
      'Бонусные карты у списка и группы. Контурные счётчики у списков вне суммы ярлыка. Раздел «О программе». Значки групп по картинкам. Исправлено меню после «Стереть исполненное».',
  },
  {
    version: '0.2.0',
    date: '14.09.2026',
    notes:
      'Число некупленных на ярлыке и выбор списков в оформлении. Передача дома без телефона организатора. Вход по коду, выход из семьи, удаление аккаунта. Программа переименована в «Возьми».',
  },
]

export function changelogEntries(): ChangelogEntry[] {
  const { stamp, builtLabel } = parseAppVersion()
  const version = APP_VERSION
  const date = builtLabel || stamp || 'эта сборка'
  const current: ChangelogEntry = { version, date, notes: CURRENT_NOTES }
  return [current, ...HISTORY.filter((entry) => entry.version !== version)]
}
