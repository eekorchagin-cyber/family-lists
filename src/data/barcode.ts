/** Ширины штрихов Code 128 (символы 0–106). */
const CODE128 = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212',
  '221213', '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221',
  '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221',
  '312212', '322112', '322211', '212123', '212321', '232121', '111323', '131123', '131321',
  '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131',
  '113123', '113321', '133121', '313121', '211331', '231131', '213113', '213311', '213131',
  '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111',
  '111224', '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', '111242',
  '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311',
  '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

const EAN_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011',
  '0110111', '0001011',
]
const EAN_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001',
  '0001001', '0010111',
]
const EAN_R = [
  '1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100',
  '1001000', '1110100',
]
const EAN_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL',
  'LGGLGL',
]

export type BarcodeModules = {
  bits: string
  label: string
}

function code128Symbol(text: string): number[] | null {
  const codes = [104]
  let checksum = 104
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i) - 32
    if (code < 0 || code > 94) return null
    codes.push(code)
    checksum += code * (i + 1)
  }
  codes.push(checksum % 103)
  codes.push(106)
  return codes
}

export function encodeCode128(text: string): BarcodeModules | null {
  const codes = code128Symbol(text)
  if (!codes) return null
  let bits = '0000000000'
  for (const code of codes) {
    const widths = CODE128[code]
    if (!widths) return null
    let bar = true
    for (const ch of widths) {
      bits += (bar ? '1' : '0').repeat(Number(ch))
      bar = !bar
    }
  }
  bits += '0000000000'
  return { bits, label: text }
}

function eanChecksum(digits: string): number {
  let sum = 0
  for (let i = 0; i < 12; i += 1) {
    const n = Number(digits[i])
    sum += i % 2 === 0 ? n : n * 3
  }
  return (10 - (sum % 10)) % 10
}

export function normalizeEan13(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12) return digits + String(eanChecksum(digits))
  if (digits.length === 13) return digits
  return null
}

export function encodeEan13(value: string): BarcodeModules | null {
  const digits = normalizeEan13(value)
  if (!digits) return null
  const parity = EAN_PARITY[Number(digits[0])]
  if (!parity) return null
  let bits = '0000000000101'
  for (let i = 0; i < 6; i += 1) {
    const n = Number(digits[i + 1])
    bits += parity[i] === 'L' ? EAN_L[n] : EAN_G[n]
  }
  bits += '01010'
  for (let i = 7; i < 13; i += 1) {
    bits += EAN_R[Number(digits[i])]
  }
  bits += '1010000000000'
  return { bits, label: digits }
}

export function encodeBarcode(value: string, format?: string): BarcodeModules | null {
  const needle = (format ?? '').toLowerCase().replace(/_/g, '')
  const digits = value.replace(/\s/g, '')
  if (needle.includes('ean13') || needle.includes('upca') || /^\d{12,13}$/.test(digits)) {
    const ean = encodeEan13(digits)
    if (ean) return ean
  }
  return encodeCode128(value)
}
