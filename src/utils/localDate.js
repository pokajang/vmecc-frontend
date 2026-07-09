const padDatePart = (value) => String(value).padStart(2, '0')

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const getLocalDateInputValue = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed

  return [
    safeDate.getFullYear(),
    padDatePart(safeDate.getMonth() + 1),
    padDatePart(safeDate.getDate()),
  ].join('-')
}

export const parseLocalDateValue = (value) => {
  const text = String(value || '').trim()
  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(text)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatLocalDate = (
  value,
  fallback = '-',
  options = { day: '2-digit', month: 'short', year: 'numeric' },
) => {
  if (!value) return fallback
  const parsed = parseLocalDateValue(value)
  if (!parsed) return String(value)
  return parsed.toLocaleDateString('en-MY', options)
}
