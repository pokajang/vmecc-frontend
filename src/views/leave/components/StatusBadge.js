import React from 'react'
import { CBadge } from '@coreui/react'
import { statusColorMap } from '../constants'

export default function StatusBadge({ status, label }) {
  return <CBadge color={statusColorMap[status] || 'secondary'}>{label || status || '-'}</CBadge>
}
