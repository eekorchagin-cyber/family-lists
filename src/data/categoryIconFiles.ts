export const FILE_CATEGORY_ICONS = [
  { id: 'file01', name: 'Алкогольные напитки', file: '01.svg' },
  { id: 'file02', name: 'Бакалея', file: '02.svg' },
  { id: 'file03', name: 'Белье', file: '03.svg' },
  { id: 'file04', name: 'Бытовая техника', file: '04.svg' },
  { id: 'file05', name: 'Бытовая химия', file: '05.svg' },
  { id: 'file06', name: 'Вентиляция', file: '06.svg' },
  { id: 'file07', name: 'Вещи в дорогу', file: '07.svg' },
  { id: 'file08', name: 'Водоснабжение', file: '08.svg' },
  { id: 'file09', name: 'Выпечка', file: '09.svg' },
  { id: 'file10', name: 'Декор', file: '10.svg' },
  { id: 'file11', name: 'Для собаки', file: '11.svg' },
  { id: 'file12', name: 'Документы', file: '12.svg' },
  { id: 'file13', name: 'Другое', file: '13.svg' },
  { id: 'file14', name: 'Заморозка', file: '14.svg' },
  { id: 'file15', name: 'Игрушки', file: '15.svg' },
  { id: 'file16', name: 'Инструменты', file: '16.svg' },
  { id: 'file17', name: 'Ковры', file: '17.svg' },
  { id: 'file18', name: 'Кондитерские изделия', file: '18.svg' },
  { id: 'file19', name: 'Краски', file: '19.svg' },
  { id: 'file20', name: 'Красота и уход', file: '20.svg' },
  { id: 'file21', name: 'Кухонные аксессуары', file: '21.svg' },
  { id: 'file22', name: 'Молочные продукты', file: '22.svg' },
  { id: 'file23', name: 'Мясные продукты (колбасы)', file: '23.svg' },
  { id: 'file24', name: 'Мясо', file: '24.svg' },
  { id: 'file25', name: 'Напитки', file: '25.svg' },
  { id: 'file26', name: 'Напольные покрытия', file: '26.svg' },
  { id: 'file27', name: 'Обои', file: '27.svg' },
  { id: 'file28', name: 'Обувь', file: '28.svg' },
  { id: 'file29', name: 'Овощи', file: '29.svg' },
  { id: 'file30', name: 'Одежда', file: '30.svg' },
  { id: 'file31', name: 'Освещение', file: '31.svg' },
  { id: 'file32', name: 'Посуда', file: '32.svg' },
  { id: 'file33', name: 'Рыба', file: '33.svg' },
  { id: 'file34', name: 'Сад-огород', file: '34.svg' },
  { id: 'file35', name: 'Сантехника', file: '35.svg' },
  { id: 'file36', name: 'Скобяные изделия', file: '36.png' },
  { id: 'file37', name: 'Снаряжение', file: '37.svg' },
  { id: 'file38', name: 'Столярка', file: '38.svg' },
  { id: 'file39', name: 'Строительные материалы', file: '39.svg' },
  { id: 'file40', name: 'Ткани', file: '40.svg' },
  { id: 'file41', name: 'Товары для дома', file: '41.svg' },
  { id: 'file42', name: 'Утеплители', file: '42.svg' },
  { id: 'file43', name: 'Фрукты', file: '43.svg' },
  { id: 'file44', name: 'Хлебобулочные изделия', file: '44.png' },
  { id: 'file45', name: 'Хозтовары', file: '45.svg' },
  { id: 'file46', name: 'Хранение', file: '46.svg' },
  { id: 'file47', name: 'Чай, кофе, сладости', file: '47.svg' },
  { id: 'file48', name: 'Электроника', file: '48.svg' },
  { id: 'file49', name: 'Электротовары', file: '49.svg' },
  { id: 'file50', name: 'Отпуск', file: '50.svg' },
  { id: 'file51', name: 'Море', file: '51.svg' },
  { id: 'file52', name: 'Горы', file: '52.svg' },
  { id: 'file53', name: 'Велосипед', file: '53.svg' },
  { id: 'file54', name: 'Горные лыжи', file: '54.svg' },
  { id: 'file55', name: 'Самолет', file: '55.svg' },
  { id: 'file56', name: 'Канцелярия', file: '56.svg' },
  { id: 'file57', name: 'Цветы', file: '57.svg' },
  { id: 'file58', name: 'Косметика', file: '58.svg' },
  { id: 'file59', name: 'Здоровое питание', file: '59.svg' },
  { id: 'file60', name: 'Лекарства', file: '60.svg' },
  { id: 'file61', name: 'Яйцо', file: '61.svg' },
  { id: 'file62', name: 'Сыр', file: '62.png' },
] as const

export type FileCategoryIconId = (typeof FILE_CATEGORY_ICONS)[number]['id']

export function fileCategoryIcon(id: string) {
  return FILE_CATEGORY_ICONS.find((icon) => icon.id === id)
}

export function fileIconIdForName(name: string): FileCategoryIconId | undefined {
  const needle = name.trim().toLowerCase().replace(/ё/g, 'е')
  return FILE_CATEGORY_ICONS.find(
    (icon) => icon.name.trim().toLowerCase().replace(/ё/g, 'е') === needle,
  )?.id
}

export function fileIconSrc(file: string): string {
  const base = import.meta.env.BASE_URL
  return `${base.endsWith('/') ? base : `${base}/`}category-icons/${file}`
}
