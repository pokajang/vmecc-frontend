import React from 'react'
import { CFormSelect } from '@coreui/react'

export const getPeriodOptions = ({
  include24Hours = false,
  includeCustom = false,
  includeAll = true,
  ranges = [7, 30, 90],
} = {}) => {
  const options = []
  if (include24Hours) {
    options.push({ value: '1', label: 'Last 24 hours' })
  }
  ranges.forEach((days) => {
    options.push({ value: String(days), label: `Last ${days} days` })
  })
  if (includeAll) {
    options.push({ value: 'all', label: 'All time' })
  }
  if (includeCustom) {
    options.push({ value: 'custom', label: 'Custom range' })
  }
  return options
}

const TablePeriodSelect = ({
  value,
  onChange,
  options,
  include24Hours = false,
  includeCustom = false,
  includeAll = true,
  ranges = [7, 30, 90],
  size = 'sm',
  disabled = false,
  className = '',
}) => {
  const finalOptions =
    options ||
    getPeriodOptions({
      include24Hours,
      includeCustom,
      includeAll,
      ranges,
    })

  return (
    <CFormSelect
      size={size}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
    >
      {finalOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </CFormSelect>
  )
}

export default TablePeriodSelect
