import { encodeBarcode } from '../data/barcode'

export function BarcodeSvg({
  value,
  format,
  label,
}: {
  value: string
  format?: string
  label?: string
}) {
  const encoded = encodeBarcode(value, format)
  if (!encoded) {
    return <p className="hint">Не удалось нарисовать штрихкод. Проверьте символы в коде.</p>
  }
  const width = encoded.bits.length
  const barHeight = 72
  const textH = 18
  const paths: string[] = []
  let x = 0
  while (x < encoded.bits.length) {
    if (encoded.bits[x] !== '1') {
      x += 1
      continue
    }
    const start = x
    while (x < encoded.bits.length && encoded.bits[x] === '1') x += 1
    const run = x - start
    paths.push(`M${start} 0h${run}v${barHeight}h-${run}z`)
  }
  return (
    <svg
      className="barcode-svg"
      viewBox={`0 0 ${width} ${barHeight + textH}`}
      role="img"
      aria-label={label ?? encoded.label}
    >
      <rect width={width} height={barHeight + textH} fill="#fff" />
      <path d={paths.join('')} fill="#111" />
      <text
        x={width / 2}
        y={barHeight + 14}
        textAnchor="middle"
        fontSize="12"
        fill="#111"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {encoded.label}
      </text>
    </svg>
  )
}
