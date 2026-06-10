import * as XLSX from 'xlsx'

const INVALID_SHEET_CHARS = /[\\/?*:[\]]/g

const sanitizeSheetName = (name) => {
  if (!name) return 'Sheet1'
  const cleaned = String(name).replace(INVALID_SHEET_CHARS, ' ').trim()
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned
}

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const normalizeCell = (value) => {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
}

export const exportWorkbook = ({ sheets, filename }) => {
  const safeSheets = ensureArray(sheets)
  if (!safeSheets.length) return

  const workbook = XLSX.utils.book_new()

  safeSheets.forEach((sheet) => {
    const name = sanitizeSheetName(sheet.name || 'Sheet')
    const headers = ensureArray(sheet.headers).map(normalizeCell)
    const rows = ensureArray(sheet.rows).map((row) => ensureArray(row).map(normalizeCell))
    const data = [headers, ...rows]
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  })

  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `export-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default exportWorkbook
