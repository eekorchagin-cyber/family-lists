import { useState } from 'react'
import { FILE_CATEGORY_ICONS, fileCategoryIcon, fileIconSrc } from '../data/categoryIconFiles'
import { CATEGORY_COLORS, CATEGORY_ICONS, GROUP_ICONS } from '../data/categories'
import {
  CategorySpecialIcon,
  hasCategorySpecialIcon,
} from './CategorySpecialIcons'

const ICON_LABELS: Record<string, string> = {
  westie: 'Вест-хайленд-уайт-терьер',
  cheese: 'Сыр',
  sausage: 'Колбаса',
  eggs: 'Яйца',
  bakery: 'Выпечка',
  pasta: 'Макароны',
  cereal: 'Каши',
  oil: 'Масло',
  spices: 'Специи',
  sauce: 'Соусы',
  nuts: 'Орехи',
  cake: 'Торты',
  snacks: 'Снеки',
  coffee: 'Кофе и чай',
  water: 'Вода',
  icecream: 'Мороженое',
  baby: 'Детское',
  pet: 'Питомцы',
  pharmacy: 'Аптека',
  beauty: 'Косметика',
  soap: 'Мыло',
  paper: 'Бумага',
  books: 'Книги',
  toys: 'Игрушки',
  battery: 'Батарейки',
  auto: 'Авто',
  sports: 'Спорт',
  flowers: 'Цветы',
  gift: 'Подарки',
  fan: 'Вентилятор',
  faucet: 'Водопроводный кран',
  painting: 'Картина',
  carpet: 'Ковёр',
  paintbrush: 'Малярная кисть',
  tile: 'Кафель',
  wallpaper: 'Обои',
  chandelier: 'Люстра',
  hinge: 'Дверная петля',
  door: 'Дверь',
  insulation: 'Утеплитель',
  shelf: 'Стеллаж',
  bed: 'Кровать',
  shower: 'Душ',
  sink: 'Раковина',
  computer: 'Компьютер',
  deskLamp: 'Настольная лампа',
  lenta: 'Лента',
  perekrestok: 'Перекрёсток',
  krasnoeBeloe: 'Красное и Белое',
  auchan: 'Ашан',
  metro: 'METRO',
  komandor: 'Командор',
  pyaterochka: 'Пятёрочка',
  lemanapro: 'Лемана ПРО',
  baton: 'Батон',
  ozon: 'OZON',
  redsale: 'RedSale',
  kumtigey: 'Кум-Тигей',
  gubernskie: 'Губернские Аптеки',
  businessTrip: 'Командировка',
  seaVacation: 'Отпуск на море',
  mountainVacation: 'Отпуск в горах',
}

type CategoryMarkPickerProps = {
  color: string
  icon: string
  onColor: (color: string) => void
  onIcon: (icon: string) => void
  iconsOnly?: boolean
}

export function CategoryMarkPicker({
  color,
  icon,
  onColor,
  onIcon,
  iconsOnly = false,
}: CategoryMarkPickerProps) {
  const [tab, setTab] = useState<'marks' | 'library'>(fileCategoryIcon(icon) ? 'library' : 'marks')
  const marks = iconsOnly ? [...GROUP_ICONS, ...CATEGORY_ICONS] : CATEGORY_ICONS

  return (
    <>
      {iconsOnly ? null : (
        <>
          <p className="field-label">Цвет</p>
          <div className="color-pick">
            {CATEGORY_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                className={[
                  'color-swatch',
                  color === value ? 'active' : '',
                  value === 'none' ? 'color-swatch--none' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={value === 'none' ? undefined : { background: value }}
                aria-label={value === 'none' ? 'Без цвета' : `Цвет ${value}`}
                onClick={() => onColor(value)}
              />
            ))}
          </div>
        </>
      )}
      <p className="field-label">Значок</p>
      <div className="scope-toggle icon-tabs" role="tablist" aria-label="Группы значков">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'marks'}
          className={`scope-option${tab === 'marks' ? ' scope-option--active' : ''}`}
          onClick={() => setTab('marks')}
        >
          Цветные
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'library'}
          className={`scope-option${tab === 'library' ? ' scope-option--active' : ''}`}
          onClick={() => setTab('library')}
        >
          Контурные
        </button>
      </div>
      <div className="icon-pick">
        {tab === 'marks'
          ? marks.map((item) => (
              <button
                key={item.id}
                type="button"
                className={icon === item.id ? 'icon-swatch active' : 'icon-swatch'}
                aria-label={ICON_LABELS[item.id] ?? `Значок ${item.id}`}
                onClick={() => onIcon(item.id)}
              >
                {hasCategorySpecialIcon(item.id) ? (
                  <CategorySpecialIcon id={item.id} />
                ) : (
                  item.glyph
                )}
              </button>
            ))
          : FILE_CATEGORY_ICONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={icon === item.id ? 'icon-swatch icon-swatch--file active' : 'icon-swatch icon-swatch--file'}
                aria-label={item.name}
                onClick={() => onIcon(item.id)}
              >
                <img src={fileIconSrc(item.file)} alt="" />
              </button>
            ))}
      </div>
    </>
  )
}
