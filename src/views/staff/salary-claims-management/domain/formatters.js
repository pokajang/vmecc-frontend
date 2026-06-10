import { parseAmount } from './money'

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(parseAmount(value))

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const resolveStaffIcNumber = (row = {}) => {
  const keys = ['icNumber', 'ic_number', 'icNo', 'ic_no', 'nric', 'nricNumber']
  for (const key of keys) {
    const value = row?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

export const formatMonth = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value || '-'
  const [yearRaw, monthRaw] = value.split('-')
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

export const toSortableDate = (value) => {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? -Infinity : parsed
}
