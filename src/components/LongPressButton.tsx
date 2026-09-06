import { useRef, type PointerEvent, type ReactNode } from 'react'

type LongPressButtonProps = {
  className?: string
  ariaLabel?: string
  onClick: () => void
  onLongPress: () => void
  children: ReactNode
}

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 12

export function LongPressButton({
  className,
  ariaLabel,
  onClick,
  onLongPress,
  children,
}: LongPressButtonProps) {
  const timer = useRef(0)
  const longPress = useRef(false)
  const start = useRef({ x: 0, y: 0 })

  function clearTimer() {
    window.clearTimeout(timer.current)
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    longPress.current = false
    start.current = { x: event.clientX, y: event.clientY }
    timer.current = window.setTimeout(() => {
      longPress.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dx = event.clientX - start.current.x
    const dy = event.clientY - start.current.y
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clearTimer()
    }
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onClick={() => {
        if (longPress.current) return
        onClick()
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  )
}
