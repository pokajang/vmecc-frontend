import React from 'react'
import { CBadge } from '@coreui/react'

const STATUS_TONES = {
  complete: 'success',
  repeat_check: 'warning',
  not_inspected: 'secondary',
  out_of_service: 'warning',
  retired: 'secondary',
}

const STATUS_LABELS = {
  complete: 'Complete',
  repeat_check: 'Repeat check',
  not_inspected: 'Not inspected',
  out_of_service: 'Excluded: out of service',
  retired: 'Excluded: retired',
}

const FireExtinguisherMonthlyComplianceStatus = ({ compliance = {} }) => {
  const status = String(compliance?.status || '')
  const label = String(compliance?.label || STATUS_LABELS[status] || 'Unavailable')

  return <CBadge color={STATUS_TONES[status] || 'secondary'}>{label}</CBadge>
}

export default FireExtinguisherMonthlyComplianceStatus
