import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function cellRef(column: number, row: number): string {
  let n = column + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return `${letters}${row}`
}

function inlineCell(ref: string, value: string): string {
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
}

export function rowsToXlsx(sheetName: string, rows: string[][]): Uint8Array {
  const safeName = sheetName.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Лист1'
  const sheetRows = rows
    .map((row, index) => {
      const r = index + 1
      const cells = row
        .map((value, column) => inlineCell(cellRef(column, r), value))
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(safeName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`),
    'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="36" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`),
  }

  return zipSync(files, { level: 6 })
}

export function xlsxBlob(rows: string[][], sheetName = 'Товары'): Blob {
  const bytes = rowsToXlsx(sheetName, rows)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: XLSX_TYPE })
}

function byLocalName(root: ParentNode, name: string): Element[] {
  return [...root.querySelectorAll('*')].filter((node) => node.localName === name)
}

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? 'A'
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function cellText(cell: Element, shared: string[]): string {
  const type = cell.getAttribute('t') ?? ''
  if (type === 'inlineStr') {
    return byLocalName(cell, 't')
      .map((node) => node.textContent ?? '')
      .join('')
  }
  const value = byLocalName(cell, 'v')[0]?.textContent ?? ''
  if (type === 's') {
    const index = Number(value)
    return Number.isFinite(index) ? (shared[index] ?? '') : ''
  }
  return value
}

function sharedStrings(doc: Document): string[] {
  return byLocalName(doc, 'si').map((item) =>
    byLocalName(item, 't')
      .map((node) => node.textContent ?? '')
      .join(''),
  )
}

function unzipEntries(data: Uint8Array): Record<string, Uint8Array> {
  const entries = unzipSync(data)
  const normalized: Record<string, Uint8Array> = {}
  for (const [key, value] of Object.entries(entries)) {
    normalized[key.replaceAll('\\', '/')] = value
  }
  return normalized
}

function findSheetPath(files: Record<string, Uint8Array>): string {
  const direct = Object.keys(files).find((name) => /xl\/worksheets\/sheet1\.xml$/i.test(name))
  if (direct) return direct
  const any = Object.keys(files).find((name) => /xl\/worksheets\/.+\.xml$/i.test(name))
  if (any) return any
  throw new Error('В файле Excel нет таблицы')
}

export function xlsxToRows(data: Uint8Array): string[][] {
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) {
    throw new Error('Нужен файл Excel (.xlsx)')
  }
  let files: Record<string, Uint8Array>
  try {
    files = unzipEntries(data)
  } catch {
    throw new Error('Нужен файл Excel (.xlsx)')
  }
  const sheetPath = findSheetPath(files)
  const sheetXml = strFromU8(files[sheetPath] ?? new Uint8Array())
  const sharedPath = Object.keys(files).find((name) => /xl\/sharedStrings\.xml$/i.test(name))
  const sharedXml = sharedPath ? strFromU8(files[sharedPath] ?? new Uint8Array()) : ''
  const sheetDoc = new DOMParser().parseFromString(sheetXml, 'application/xml')
  const shared = sharedXml
    ? sharedStrings(new DOMParser().parseFromString(sharedXml, 'application/xml'))
    : []
  const table = new Map<number, string[]>()
  for (const row of byLocalName(sheetDoc, 'row')) {
    const rowNumber = Number(row.getAttribute('r') || '0')
    const cells: string[] = table.get(rowNumber) ?? []
    for (const cell of byLocalName(row, 'c')) {
      const ref = cell.getAttribute('r') ?? ''
      const index = ref ? columnIndex(ref) : cells.length
      cells[index] = cellText(cell, shared)
    }
    table.set(rowNumber || table.size + 1, cells)
  }
  return [...table.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, cells]) => [cells[0] ?? '', cells[1] ?? ''])
}

export { XLSX_TYPE }
