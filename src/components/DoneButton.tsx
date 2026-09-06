type DoneButtonProps = {
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function DoneButton({ disabled, type = 'button', onClick }: DoneButtonProps) {
  return (
    <button
      type={type}
      className="header-done"
      disabled={disabled}
      onClick={onClick}
    >
      Готово
    </button>
  )
}
