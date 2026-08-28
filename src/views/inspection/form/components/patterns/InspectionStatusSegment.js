import React from 'react'
import WorkflowStatusChoice from 'src/components/report-workflow/WorkflowStatusChoice'

const InspectionStatusSegment = ({
  label = '',
  value,
  options = [],
  onChange,
  readOnly = false,
  invalid = false,
  describedBy,
  className = '',
  showLabel = Boolean(label),
  ariaLabel,
}) => {
  return (
    <WorkflowStatusChoice
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      readOnly={readOnly}
      invalid={invalid}
      describedBy={describedBy}
      className={className}
      showLabel={showLabel}
      ariaLabel={ariaLabel || label || 'Inspection status'}
      classNames={{
        root: 'inspection-status-field inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2',
        label: 'inspection-status-field__label inspection-hydraulic-check-label small fw-semibold',
        readOnly: 'inspection-status-field__readonly',
        pill: 'inspection-review-status-pill',
        group:
          'inspection-status-segment inspection-drawer-choice-group inspection-hydraulic-status-group d-flex flex-wrap justify-content-start gap-2',
        button: 'inspection-drawer-choice inspection-hydraulic-status-btn',
        surface: 'inspection-drawer-choice__surface',
      }}
    />
  )
}

export default InspectionStatusSegment
