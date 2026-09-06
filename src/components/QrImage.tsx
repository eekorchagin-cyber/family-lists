import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrImage({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(value, { width: 240, margin: 1, errorCorrectionLevel: 'M' }).then(
      (url) => {
        if (!cancelled) setSrc(url)
      },
    )
    return () => {
      cancelled = true
    }
  }, [value])

  if (!src) return <p className="hint">Код рисуется…</p>
  return <img className="qr-image" src={src} alt={label} />
}
