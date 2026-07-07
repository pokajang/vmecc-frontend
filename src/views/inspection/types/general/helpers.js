import { normalizeInspectionIssues } from '../inspectionIssues'

export const GENERAL_INSPECTION_TYPE = 'General Inspection'

const text = (value) => String(value || '').trim()

const normalizeKey = (value) => text(value).toLowerCase().replace(/\s+/g, ' ')

const formatLocation = (form = {}) => {
  const selectedLocation = text(form.selectedLocation || form.location)
  if (selectedLocation) return selectedLocation
  const mainLocation = text(form.mainLocation || form.main_location)
  const subLocation = text(form.subLocation || form.sub_location)
  return [mainLocation, subLocation].filter(Boolean).join(' > ')
}

export const isGeneralInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(GENERAL_INSPECTION_TYPE)

export const getGeneralCheckSummary = (form = {}) => {
  const findings = normalizeInspectionIssues(form.inspectionIssues || form.issues)
  const description = buildGeneralDescription(form)

  return {
    totalCount: findings.length,
    visibleChecks: [],
    hasDescription: false,
    hasContent: findings.length > 0,
    description,
  }
}

export const getGeneralMissingFields = (form = {}) => ({
  description: false,
  photos: false,
})

export const getGeneralValidationDetails = (form = {}) => {
  return {
    missingFields: {},
    firstTarget: null,
    errorCount: 0,
  }
}

export const buildGeneralChecklist = () => []

export const buildGeneralDescription = (form = {}) => {
  const description = text(form.description)
  if (description) return description

  const location = formatLocation(form)
  const findings = normalizeInspectionIssues(form.inspectionIssues || form.issues)
  const summary = location
    ? `General inspection completed at ${location}.`
    : 'General inspection completed.'
  if (findings.length === 0) return summary

  return [
    summary,
    `Finding${findings.length === 1 ? '' : 's'} recorded: ${findings.length}.`,
    ...findings.map((finding) => `- ${text(finding.description)}`),
  ].join('\n')
}
