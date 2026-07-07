const padDatePart = (value) => String(value).padStart(2, '0')

export const getDefaultInspectionDateTime = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return (
    [
      safeDate.getFullYear(),
      padDatePart(safeDate.getMonth() + 1),
      padDatePart(safeDate.getDate()),
    ].join('-') + `T${padDatePart(safeDate.getHours())}:${padDatePart(safeDate.getMinutes())}`
  )
}

export const normalizeInspectionDateTime = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  return getDefaultInspectionDateTime(parsed)
}

export const getInspectionDateFromDateTime = (value = '') => {
  const normalized = normalizeInspectionDateTime(value)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) ? normalized.slice(0, 10) : ''
}

export const deriveInspectedAt = (source = {}) => {
  const direct = normalizeInspectionDateTime(
    source.inspectedAt ||
      source.inspected_at ||
      source.inspectionDateTime ||
      source.inspection_date_time ||
      '',
  )
  if (direct) return direct

  return normalizeInspectionDateTime(
    source.erAuxInspectionDate ||
      source.er_aux_inspection_date ||
      source.fireExtinguisherInspectionDate ||
      source.fire_extinguisher_inspection_date ||
      source.frtInspectionDate ||
      source.frt_inspection_date ||
      source.highAngleInspectionDate ||
      source.high_angle_inspection_date ||
      source.scbaInspectionDate ||
      source.scba_inspection_date ||
      source.hseInspectionDate ||
      source.hse_inspection_date ||
      '',
  )
}
