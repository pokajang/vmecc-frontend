const ensureArray = (value) => (Array.isArray(value) ? value : [])

const normalizeCell = (value) => {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
}

const escapeCsvCell = (value) => {
  const text = normalizeCell(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const escaped = text.replace(/"/g, '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

const toCsvLine = (values) => ensureArray(values).map(escapeCsvCell).join(',')

const normalizeCsvFilename = (filename) => {
  const fallback = `export-${new Date().toISOString().slice(0, 10)}.csv`
  const safeName = String(filename || fallback).trim() || fallback
  return safeName.replace(/\.xlsx$/i, '.csv')
}

export const exportWorkbook = ({ sheets, filename }) => {
  const safeSheets = ensureArray(sheets)
  if (!safeSheets.length) return

  const lines = []

  safeSheets.forEach((sheet, index) => {
    if (safeSheets.length > 1) {
      if (lines.length) lines.push('')
      lines.push(toCsvLine([sheet.name || `Sheet ${index + 1}`]))
    }
    const headers = ensureArray(sheet.headers).map(normalizeCell)
    const rows = ensureArray(sheet.rows).map((row) => ensureArray(row).map(normalizeCell))
    if (headers.length) lines.push(toCsvLine(headers))
    rows.forEach((row) => lines.push(toCsvLine(row)))
  })

  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = normalizeCsvFilename(filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default exportWorkbook
