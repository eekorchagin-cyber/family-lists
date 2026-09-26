import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrImage({
  value,
  label,
  size = 240,
}: {
  value: string
  label: string
  size?: number
}) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' }).then(
      (url) => {
        if (!cancelled) setSrc(url)
      },
    )
    return () => {
      cancelled = true
    }
  }, [size, value])

  if (!src) return <p className="hint">Код рисуется…</p>
  return <img className="qr-image" src={src} alt={label} />
}
