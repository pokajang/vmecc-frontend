import { formatDuration, getOvertimeTypeLabel, normalizeOvertimeType } from 'src/views/overtime/utils'

export const OVERTIME_TYPE_SUMMARY_ORDER = ['weekday', 'weekend', 'publicHoliday']

const buildOrderIndex = () =>
  OVERTIME_TYPE_SUMMARY_ORDER.reduce((acc, value, index) => {
    acc[value] = index
    return acc
  }, {})

const KNOWN_ORDER_INDEX = buildOrderIndex()
const KNOWN_TYPE_SET = new Set(OVERTIME_TYPE_SUMMARY_ORDER)

const normalizeMinutes = (value) => {
  const minutes = Number(value || 0)
  if (!Number.isFinite(minutes)) return 0
  return minutes
}

const sortSummaryItems = (items = []) =>
  [...items].sort((left, right) => {
    const leftOrder = KNOWN_ORDER_INDEX[left.overtimeType]
    const rightOrder = KNOWN_ORDER_INDEX[right.overtimeType]
    const leftKnown = Number.isInteger(leftOrder)
    const rightKnown = Number.isInteger(rightOrder)
    if (leftKnown && rightKnown) return leftOrder - rightOrder
    if (leftKnown) return -1
    if (rightKnown) return 1
    return String(left.label || '').localeCompare(String(right.label || ''))
  })

const toTitleLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeSummaryType = (value) => {
  const raw = String(value || '').trim()
  const normalized = normalizeOvertimeType(raw)
  if (KNOWN_TYPE_SET.has(raw) || raw === '') return normalized
  return raw
}

const getSummaryTypeLabel = (overtimeType) =>
  KNOWN_TYPE_SET.has(overtimeType)
    ? getOvertimeTypeLabel(overtimeType, { short: true })
    : toTitleLabel(overtimeType) || 'Other'

export const buildTypeDurationSummaryItems = ({ typeDurationMinutes = {}, items = [] } = {}) => {
  const nextItems = Array.isArray(items)
    ? items
        .map((item, index) => {
          const overtimeType = normalizeSummaryType(item?.overtimeType || item?.type)
          const minutes = normalizeMinutes(item?.minutes)
          return {
            key: String(item?.key || `${overtimeType}-${index}`),
            overtimeType,
            label: String(item?.label || '').trim() || getSummaryTypeLabel(overtimeType),
            minutes,
            formattedDuration:
              String(item?.formattedDuration || '').trim() || formatDuration(minutes),
          }
        })
        .filter((item) => item.minutes > 0)
    : []

  const derivedItems =
    nextItems.length > 0
      ? nextItems
      : Object.entries(typeDurationMinutes || {}).map(([overtimeType, minutes]) => {
          const normalizedType = normalizeSummaryType(overtimeType)
          const normalizedMinutes = normalizeMinutes(minutes)
          return {
            key: `type-${normalizedType}`,
            overtimeType: normalizedType,
            label: getSummaryTypeLabel(normalizedType),
            minutes: normalizedMinutes,
            formattedDuration: formatDuration(normalizedMinutes),
          }
        })

  return sortSummaryItems(derivedItems.filter((item) => item.minutes > 0))
}
