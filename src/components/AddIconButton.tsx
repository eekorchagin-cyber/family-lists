type AddIconButtonProps = {
  ariaLabel: string
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function AddIconButton({
  ariaLabel,
  disabled,
  type = 'button',
  onClick,
}: AddIconButtonProps) {
  return (
    <button
      type={type}
      className="icon-button add-icon-button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      +
    </button>
  )
}
