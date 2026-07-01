export const HSE_INSPECTION_TYPE = 'Health Safety Environment Inspection'

export const HSE_SELECTION_VALUES = [
  'areaSatisfactory',
  'unsafeAct',
  'unsafeCondition',
  'environmental',
]

export const HSE_FINDING_SELECTIONS = ['unsafeAct', 'unsafeCondition', 'environmental']

export const HSE_SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']

export const HSE_SELECTION_OPTIONS = [
  {
    value: 'areaSatisfactory',
    label: 'Area Satisfactory',
    description: 'No HSE finding observed. Record the current area condition.',
  },
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
  {
    value: 'environmental',
    label: 'Environmental',
    description: 'Spill, waste, emission, housekeeping, or environmental concern observed.',
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
  environmental: {
    key: 'hseEnvironmentalDetails',
    label: 'Environmental Details',
    placeholder: 'Describe the environmental finding, impact, and containment status.',
  },
}

export const HSE_FORM_DEFAULTS = {
  hseInspectedBy: '',
  hseInspectionDate: '',
  hseSelections: [],
  hseAreaConditionRemarks: '',
  hseUnsafeActDetails: '',
  hseUnsafeConditionDetails: '',
  hseEnvironmentalDetails: '',
  hseSeverity: '',
  hseImmediateAction: '',
  hseCorrectiveAction: '',
  hseResponsiblePerson: '',
  hseTargetDate: '',
  hseRemarks: '',
}

const text = (value) => String(value || '').trim()

const normalizeKey = (value) =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const selectionAliases = new Map([
  ['areasatisfactory', 'areaSatisfactory'],
  ['satisfactory', 'areaSatisfactory'],
  ['unsafeact', 'unsafeAct'],
  ['act', 'unsafeAct'],
  ['unsafecondition', 'unsafeCondition'],
  ['condition', 'unsafeCondition'],
  ['environmental', 'environmental'],
  ['environment', 'environmental'],
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

  if (unique.includes('areaSatisfactory')) return ['areaSatisfactory']
  return unique.filter((value) => HSE_FINDING_SELECTIONS.includes(value))
}

export const normalizeHseSeverity = (value) => {
  const raw = text(value)
  if (!raw) return ''
  return (
    HSE_SEVERITY_OPTIONS.find((candidate) => candidate.toLowerCase() === raw.toLowerCase()) || raw
  )
}

export const toggleHseSelection = (selections = [], value) => {
  const selection = normalizeHseSelection(value)
  if (!selection) return normalizeHseSelections(selections)

  if (selection === 'areaSatisfactory') {
    return normalizeHseSelections(selections).includes('areaSatisfactory')
      ? []
      : ['areaSatisfactory']
  }

  const current = normalizeHseSelections(selections).filter((item) => item !== 'areaSatisfactory')
  return current.includes(selection)
    ? current.filter((item) => item !== selection)
    : [...current, selection]
}

export const isHseInspectionType = (inspectionType) =>
  text(inspectionType).toLowerCase() === HSE_INSPECTION_TYPE.toLowerCase()

export const hasHseFinding = (form = {}) =>
  normalizeHseSelections(form.hseSelections).some((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )

export const normalizeHseFormFields = (source = {}) => ({
  hseInspectedBy: text(source.hseInspectedBy || source.hse_inspected_by),
  hseInspectionDate: text(source.hseInspectionDate || source.hse_inspection_date),
  hseSelections: normalizeHseSelections(source.hseSelections || source.hse_selections),
  hseAreaConditionRemarks: text(
    source.hseAreaConditionRemarks || source.hse_area_condition_remarks,
  ),
  hseUnsafeActDetails: text(source.hseUnsafeActDetails || source.hse_unsafe_act_details),
  hseUnsafeConditionDetails: text(
    source.hseUnsafeConditionDetails || source.hse_unsafe_condition_details,
  ),
  hseEnvironmentalDetails: text(source.hseEnvironmentalDetails || source.hse_environmental_details),
  hseSeverity: normalizeHseSeverity(source.hseSeverity || source.hse_severity),
  hseImmediateAction: text(source.hseImmediateAction || source.hse_immediate_action),
  hseCorrectiveAction: text(source.hseCorrectiveAction || source.hse_corrective_action),
  hseResponsiblePerson: text(source.hseResponsiblePerson || source.hse_responsible_person),
  hseTargetDate: text(source.hseTargetDate || source.hse_target_date),
  hseRemarks: text(source.hseRemarks || source.hse_remarks),
})

export const getHseCheckSummary = (form = {}) => {
  const selections = normalizeHseSelections(form.hseSelections)
  const findingSelections = selections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const visibleChecks = selections.map((selection) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    return {
      id: `hse:${selection}`,
      selection,
      label: option?.label || selection,
    }
  })
  return {
    selections,
    visibleChecks,
    findingSelections,
    isAreaSatisfactory: selections.includes('areaSatisfactory'),
    hasFindings: findingSelections.length > 0,
    severity: normalizeHseSeverity(form.hseSeverity),
  }
}

export const getHseValidationDetails = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  const selections = normalized.hseSelections
  const isAreaSatisfactory = selections.includes('areaSatisfactory')
  const findingSelections = selections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const missingFields = {}

  if (isAreaSatisfactory && !normalized.hseAreaConditionRemarks) {
    missingFields.hseAreaConditionRemarks = true
  }
  if (findingSelections.length > 0 && !normalized.hseSeverity) {
    missingFields.hseSeverity = true
  }
  findingSelections.forEach((selection) => {
    const key = HSE_DETAIL_FIELDS[selection]?.key
    if (key && !text(normalized[key])) missingFields[key] = true
  })

  const firstField = [
    'hseAreaConditionRemarks',
    'hseSeverity',
    'hseUnsafeActDetails',
    'hseUnsafeConditionDetails',
    'hseEnvironmentalDetails',
  ].find((field) => missingFields[field])

  return {
    missingFields,
    firstTarget: firstField ? { field: 'hseDetails', detailKey: firstField } : null,
    errorCount: Object.keys(missingFields).length,
  }
}

export const getHseMissingFields = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  const selections = normalized.hseSelections
  const isAreaSatisfactory = selections.includes('areaSatisfactory')
  const findingSelections = selections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const details = getHseValidationDetails(normalized)

  return {
    hseSession: !normalized.hseInspectedBy || !normalized.hseInspectionDate,
    hseSelection: selections.length === 0,
    hseDetails:
      (isAreaSatisfactory && !normalized.hseAreaConditionRemarks) ||
      (findingSelections.length > 0 && details.errorCount > 0),
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
  const selections = normalized.hseSelections
  const labels = selections
    .map((selection) => HSE_SELECTION_OPTIONS.find((option) => option.value === selection)?.label)
    .filter(Boolean)
  const location = text(form.selectedLocation || form.location) || 'selected area'
  const inspector = normalized.hseInspectedBy || 'inspector'
  const date = normalized.hseInspectionDate || 'inspection date'
  const summary = labels.length > 0 ? labels.join(', ') : 'No HSE outcome selected'
  const severity =
    hasHseFinding(normalized) && normalized.hseSeverity
      ? ` Severity: ${normalized.hseSeverity}.`
      : ''
  return `HSE inspection for ${location} by ${inspector} on ${date}: ${summary}.${severity}`
}
