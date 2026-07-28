export const HSE_INSPECTION_TYPE = 'Health Safety Environment Inspection'

export const HSE_PAYLOAD_VERSION = 2

export const HSE_SELECTION_VALUES = ['unsafeAct', 'unsafeCondition']

export const HSE_FINDING_SELECTIONS = HSE_SELECTION_VALUES

export const HSE_SELECTION_OPTIONS = [
  {
    value: 'unsafeAct',
    label: 'Unsafe Act',
    description: 'Unsafe behavior or work practice observed.',
  },
  {
    value: 'unsafeCondition',
    label: 'Unsafe Condition',
    description: 'Unsafe workplace, equipment, access, or physical condition observed.',
  },
]

export const HSE_DETAIL_FIELDS = {
  unsafeAct: {
    key: 'hseUnsafeActDetails',
    label: 'Unsafe Act Details',
    placeholder: 'Describe the unsafe act, who/what was involved, and immediate concern.',
  },
  unsafeCondition: {
    key: 'hseUnsafeConditionDetails',
    label: 'Unsafe Condition Details',
    placeholder: 'Describe the unsafe condition, affected area/equipment, and risk.',
  },
}

export const HSE_FORM_DEFAULTS = {
  hsePayloadVersion: HSE_PAYLOAD_VERSION,
  hseInspectedBy: '',
  hseSelections: [],
  hseUnsafeActDetails: '',
  hseUnsafeConditionDetails: '',
  hseImmediateAction: '',
}

const text = (value) => String(value || '').trim()

const normalizeKey = (value) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const selectionAliases = new Map([
  ['unsafeact', 'unsafeAct'],
  ['act', 'unsafeAct'],
  ['unsafecondition', 'unsafeCondition'],
  ['condition', 'unsafeCondition'],
])

export const normalizeHseSelection = (value) => {
  const direct = HSE_SELECTION_VALUES.find((candidate) => candidate === value)
  if (direct) return direct
  return selectionAliases.get(normalizeKey(value)) || ''
}

export const normalizeHseSelections = (selections = []) => {
  const source = Array.isArray(selections) ? selections : [selections]
  const unique = []
  source.forEach((value) => {
    const normalized = normalizeHseSelection(value)
    if (normalized && !unique.includes(normalized)) unique.push(normalized)
  })

  return unique.filter((value) => HSE_FINDING_SELECTIONS.includes(value))
}

export const isHseInspectionType = (inspectionType) =>
  text(inspectionType).toLowerCase() === HSE_INSPECTION_TYPE.toLowerCase()

export const normalizeHseFormFields = (source = {}, options = {}) => {
  const normalizeText = options.preserveWhitespace
    ? (value) => String(value ?? '')
    : (value) => text(value)
  const fieldValue = (camelField, snakeField) => source[camelField] ?? source[snakeField] ?? ''

  return {
    hsePayloadVersion: Number(source.hsePayloadVersion || source.hse_payload_version || 0) || 0,
    hseInspectedBy: normalizeText(fieldValue('hseInspectedBy', 'hse_inspected_by')),
    hseSelections: normalizeHseSelections(source.hseSelections || source.hse_selections),
    hseUnsafeActDetails: normalizeText(fieldValue('hseUnsafeActDetails', 'hse_unsafe_act_details')),
    hseUnsafeConditionDetails: normalizeText(
      fieldValue('hseUnsafeConditionDetails', 'hse_unsafe_condition_details'),
    ),
    hseImmediateAction: normalizeText(fieldValue('hseImmediateAction', 'hse_immediate_action')),
  }
}

export const getHseCheckSummary = (form = {}) => {
  const selections = normalizeHseSelections(form.hseSelections)
  const findingSelections = selections
  const totalCount = selections.length
  const photoCount = (Array.isArray(form.photos) ? form.photos : []).filter(Boolean).length
  const visibleChecks = selections.map((selection) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    return {
      id: `hse:${selection}`,
      selection,
      label: option?.label || selection,
    }
  })
  return {
    totalCount,
    checkedCount: totalCount,
    selections,
    visibleChecks,
    findingSelections,
    hasFindings: findingSelections.length > 0,
    photoCount,
  }
}

export const getHseValidationDetails = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  const selection = normalized.hseSelections[0] || ''
  const hasSingleValidSelection =
    normalized.hseSelections.length === 1 && HSE_SELECTION_VALUES.includes(selection)
  const detailKey = selection === 'unsafeAct' ? 'hseUnsafeActDetails' : 'hseUnsafeConditionDetails'
  const hasEvidencePhotos =
    (Array.isArray(form.photos) ? form.photos : []).filter(Boolean).length > 0
  const missingFields = {
    ...(!hasSingleValidSelection ? { hseSelection: true } : {}),
    ...(hasSingleValidSelection && !text(normalized[detailKey]) ? { [detailKey]: true } : {}),
    ...(!hasEvidencePhotos ? { hsePhotoEvidence: true } : {}),
  }
  const firstField = ['hseSelection', detailKey, 'hsePhotoEvidence'].find(
    (field) => missingFields[field],
  )
  return {
    missingFields,
    firstTarget: firstField ? { field: 'hseDetails', detailKey: firstField } : null,
    errorCount: Object.keys(missingFields).length,
  }
}

export const getHseMissingFields = (form = {}) => {
  const details = getHseValidationDetails(form)
  return {
    hseSession: false,
    hseSelection: Boolean(details.missingFields.hseSelection),
    hseDetails: details.errorCount > 0,
  }
}

export const buildHseChecklist = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  return normalized.hseSelections.map((selection) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    return {
      id: `hse:${selection}`,
      inspectionType: HSE_INSPECTION_TYPE,
      label: option?.label || selection,
      selected: true,
      selectedAt: '',
    }
  })
}

export const buildHseDescription = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  const selection = normalized.hseSelections[0] || ''
  const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
  const detailKey = selection === 'unsafeAct' ? 'hseUnsafeActDetails' : 'hseUnsafeConditionDetails'
  const location = text(form.selectedLocation || form.location) || 'selected area'
  const lines = [
    `${option?.label || 'HSE observation'} observed at ${location}.`,
    text(normalized[detailKey]),
  ].filter(Boolean)
  if (normalized.hseImmediateAction) {
    lines.push(`Immediate corrective action: ${normalized.hseImmediateAction}`)
  }
  return lines.join('\n')
}
