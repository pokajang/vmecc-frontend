export const GENERAL_INSPECTION_TYPE = 'General Inspection'

const text = (value) => String(value || '').trim()

const normalizeKey = (value) => text(value).toLowerCase().replace(/\s+/g, ' ')

const slugSegment = (value) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const formatLocation = (form = {}) => {
  const selectedLocation = text(form.selectedLocation || form.location)
  if (selectedLocation) return selectedLocation
  const mainLocation = text(form.mainLocation || form.main_location)
  const subLocation = text(form.subLocation || form.sub_location)
  return [mainLocation, subLocation].filter(Boolean).join(' > ')
}

const normalizeChecklistItem = (item = {}) => {
  const label = text(item?.label || item)
  if (!label) return null
  return {
    id: text(item?.id) || `${slugSegment(GENERAL_INSPECTION_TYPE)}:${slugSegment(label)}`,
    label,
    selected: item?.selected !== false,
    selectedAt: text(item?.selectedAt || item?.selected_at),
  }
}

const getSelectedChecklistItems = (checklist = []) =>
  (Array.isArray(checklist) ? checklist : [])
    .map(normalizeChecklistItem)
    .filter((item) => item && item.selected !== false)

export const isGeneralInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(GENERAL_INSPECTION_TYPE)

export const getGeneralCheckSummary = (form = {}) => {
  const visibleChecks = getSelectedChecklistItems(form.checklist)
  const description = text(form.description)

  return {
    totalCount: visibleChecks.length,
    visibleChecks,
    hasDescription: description !== '',
    hasContent: visibleChecks.length > 0 || description !== '',
    description,
  }
}

export const getGeneralMissingFields = (form = {}) => ({
  description: text(form.description) === '',
  photos: !Array.isArray(form.photos) || form.photos.length === 0,
})

export const getGeneralValidationDetails = (form = {}) => {
  const missing = getGeneralMissingFields(form)
  const orderedFields = ['description', 'photos']
  const missingFields = orderedFields.reduce((next, field) => {
    if (missing[field]) next[field] = true
    return next
  }, {})
  const firstField = orderedFields.find((field) => missing[field]) || ''

  return {
    missingFields,
    firstTarget: firstField ? { field: firstField } : null,
    errorCount: Object.keys(missingFields).length,
  }
}

export const buildGeneralChecklist = (form = {}) =>
  getSelectedChecklistItems(form.checklist).map((item) => ({
    id: item.id,
    inspectionType: GENERAL_INSPECTION_TYPE,
    label: item.label,
    selected: true,
    selectedAt: item.selectedAt || '',
  }))

export const buildGeneralDescription = (form = {}) => {
  const description = text(form.description)
  if (description) return description

  const location = formatLocation(form)
  const checklistLabels = getSelectedChecklistItems(form.checklist).map((item) => item.label)
  if (checklistLabels.length === 0) return ''

  return [
    `General inspection completed${location ? ` at ${location}` : ''}.`,
    `Quick checks recorded: ${checklistLabels.length}.`,
    ...checklistLabels.map((label) => `- ${label}`),
  ].join('\n')
}
