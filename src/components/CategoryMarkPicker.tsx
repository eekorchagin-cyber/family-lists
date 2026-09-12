import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/categories'
import { WestieIcon } from './WestieIcon'

type CategoryMarkPickerProps = {
  color: string
  icon: string
  onColor: (color: string) => void
  onIcon: (icon: string) => void
}

export function CategoryMarkPicker({
  color,
  icon,
  onColor,
  onIcon,
}: CategoryMarkPickerProps) {
  return (
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
            ].filter(Boolean).join(' ')}
            style={value === 'none' ? undefined : { background: value }}
            aria-label={value === 'none' ? 'Без цвета' : `Цвет ${value}`}
            onClick={() => onColor(value)}
          />
        ))}
      </div>
      <p className="field-label">Значок</p>
      <div className="icon-pick">
        {CATEGORY_ICONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={icon === item.id ? 'icon-swatch active' : 'icon-swatch'}
            aria-label={
              (
                {
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
                } as Record<string, string>
              )[item.id] ?? `Значок ${item.id}`
            }
            onClick={() => onIcon(item.id)}
          >
            {item.id === 'westie' ? <WestieIcon /> : item.glyph}
          </button>
        ))}
      </div>
    </>
  )
}
