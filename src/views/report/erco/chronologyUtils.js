import { uid } from '../utils'

export const resolveResponderPriority = (row) => {
  const text = `${String(row?.role || '').trim()} ${String(row?.name || '').trim()}`.toLowerCase()
  if (text.includes('assistant incident commander') || /\baic\b/.test(text)) return 0
  if (text.includes('tactical response team') || /\btrt\b/.test(text)) return 1
  return 2
}

export const sortResponders = (rows) =>
  [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const priorityDiff = resolveResponderPriority(a) - resolveResponderPriority(b)
    if (priorityDiff !== 0) return priorityDiff
    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })

export const parseTimeToMinutes = (value) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hh = Number(match[1])
  const mm = Number(match[2])
  if (hh > 23 || mm > 59) return null
  return hh * 60 + mm
}

export const toDateFromTimeValue = (timeValue) => {
  const minutes = parseTimeToMinutes(timeValue)
  if (minutes === null) return null
  const date = new Date()
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date
}

export const toTimeValueFromDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const toTimeValue = (minutesInput) => {
  const minutes = Math.round(Number(minutesInput))
  if (!Number.isFinite(minutes)) return ''
  const safe = ((minutes % 1440) + 1440) % 1440
  const hh = String(Math.floor(safe / 60)).padStart(2, '0')
  const mm = String(safe % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export const addMinutesToTime = (timeValue, minutesToAdd) => {
  const base = parseTimeToMinutes(timeValue)
  if (base === null) return ''
  return toTimeValue(base + Number(minutesToAdd || 0))
}

export const resolveNextChronologyTime = (rows, incidentTime, stepMinutes = 5) => {
  const validRows = Array.isArray(rows) ? rows : []
  const lastWithTime = [...validRows]
    .reverse()
    .find((row) => parseTimeToMinutes(row?.time) !== null)
  const baseTime = String(lastWithTime?.time || incidentTime || '').trim()
  return addMinutesToTime(baseTime, stepMinutes)
}

export const PRESET_TYPES = {
  PREMOB: 'premob',
  DEMOB: 'demob',
  SPECIFIC: 'specific',
}

export const PREMOB_ACTIONS = [
  'VMECC received incident call/notification.',
  'Team deployed to location.',
  'Relevant stakeholders notified for coordination.',
]

export const DEMOB_ACTIONS = [
  'Situation controlled and operation standdown initiated.',
  'Debrief and handover completed.',
  'Team returned to base/station (RTB).',
]

export const reorderRows = (rows, fromIndex, toIndex) => {
  const safeRows = Array.isArray(rows) ? [...rows] : []
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= safeRows.length ||
    toIndex >= safeRows.length ||
    fromIndex === toIndex
  ) {
    return safeRows
  }
  const [moved] = safeRows.splice(fromIndex, 1)
  safeRows.splice(toIndex, 0, moved)
  return safeRows
}

export const buildPreMobRowsFromStart = (startTime) =>
  PREMOB_ACTIONS.map((action, index) => ({
    id: uid(),
    time: addMinutesToTime(startTime, index * 5),
    action,
    presetType: PRESET_TYPES.PREMOB,
  }))

export const buildManualRowFromStart = (startTime) => [{ id: uid(), time: startTime, action: '' }]
