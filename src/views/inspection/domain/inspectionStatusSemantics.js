const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

const ISSUE_STATUSES = new Set([
  'defect',
  'failed',
  'fail',
  'issue',
  'missing',
  'no',
  'not good',
  'not operational',
])

const NEUTRAL_STATUSES = new Set(['n/a', 'na', 'not applicable'])

export const normalizeInspectionStatus = normalizeStatus

export const isInspectionIssueStatus = (value) => ISSUE_STATUSES.has(normalizeStatus(value))

export const isInspectionNeutralStatus = (value) => NEUTRAL_STATUSES.has(normalizeStatus(value))

export const getInspectionStatusSeverity = (value) => {
  const normalized = normalizeStatus(value)
  if (!normalized) return 'unanswered'
  if (ISSUE_STATUSES.has(normalized)) return 'issue'
  if (NEUTRAL_STATUSES.has(normalized)) return 'neutral'
  return 'conformed'
}
