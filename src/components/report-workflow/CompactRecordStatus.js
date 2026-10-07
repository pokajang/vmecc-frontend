import React from 'react'

const getCompactRecordStatusColor = (label) => {
  const status = String(label || '')
    .trim()
    .toLowerCase()
  if (['approved', 'paid', 'completed'].includes(status)) {
    return 'var(--vmecc-status-success-text)'
  }
  if (['rejected', 'cancelled', 'failed'].includes(status)) {
    return 'var(--vmecc-status-danger-text)'
  }
  if (status.includes('draft')) return 'var(--vmecc-status-draft-text)'
  return 'var(--cui-secondary-color)'
}

const CompactRecordStatus = ({ label = '--' }) => (
  <span
    className="compact-record-status small fw-semibold text-nowrap"
    style={{ color: getCompactRecordStatusColor(label) }}
  >
    {label || '--'}
  </span>
)

export { getCompactRecordStatusColor }
export default CompactRecordStatus
