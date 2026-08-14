import React from 'react'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'

const hasDisplayValue = (value) => {
  if (React.isValidElement(value)) return true
  return String(value ?? '').trim().length > 0
}

export const buildInspectionContextFields = ({ status, type, inspectedAt, location } = {}) =>
  [
    { key: 'status', label: 'Status', value: status },
    { key: 'type', label: 'Type', value: type },
    { key: 'inspected-at', label: 'Inspection Date/Time', value: inspectedAt },
    { key: 'location', label: 'Location', value: location },
  ].filter((field) => hasDisplayValue(field.value))

const InspectionContextSummary = ({ fields = [] }) => {
  const visibleFields = (Array.isArray(fields) ? fields : []).filter(
    (field) => field && String(field.label || '').trim() && hasDisplayValue(field.value),
  )
  if (!visibleFields.length) return null

  return (
    <WorkflowSummaryList
      items={visibleFields}
      variant="detail"
      listClassName="inspection-context-summary__list"
    />
  )
}

export default InspectionContextSummary
