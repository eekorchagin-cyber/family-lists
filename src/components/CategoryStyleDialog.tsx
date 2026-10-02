import { useState } from 'react'
import { iconIdFromName } from '../data/categories'
import type { Category } from '../types'
import { CategoryMarkPicker } from './CategoryMarkPicker'
import { DialogHeading } from './DialogHeading'

type CategoryStyleDialogProps = {
  category: Category
  onClose: () => void
  onSave: (color: string, icon: string) => void
}

export function CategoryStyleDialog({
  category,
  onClose,
  onSave,
}: CategoryStyleDialogProps) {
  const [color, setColor] = useState(category.color)
  const [icon, setIcon] = useState<string>(category.icon ?? iconIdFromName(category.name))

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <DialogHeading title={category.name} onClose={onClose} />
        <CategoryMarkPicker color={color} icon={icon} onColor={setColor} onIcon={setIcon} />
        <div className="dialog-actions dialog-actions-single">
          <button type="button" className="button-primary" onClick={() => onSave(color, icon)}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
