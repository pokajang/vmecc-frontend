import React from 'react'
import { CButton } from '@coreui/react'

const ScbaStatusSegment = ({ label, value, onChange, readOnly = false, statusOptions = [] }) => (
  <div className="inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2">
    <div className="inspection-hydraulic-check-label small fw-semibold text-muted">{label}</div>
    <div className="inspection-hydraulic-status-group d-flex flex-nowrap justify-content-start gap-2 vmecc-scroll-x pb-1">
      {statusOptions.map((option) =>
        readOnly ? (
          <span
            key={option.value}
            className={`inspection-hydraulic-status-btn btn btn-sm ${
              value === option.value ? 'btn-primary' : 'btn-outline-secondary'
            } pe-none`.trim()}
            aria-current={value === option.value ? 'true' : undefined}
          >
            {option.label}
          </span>
        ) : (
          <CButton
            key={option.value}
            type="button"
            color={value === option.value ? 'primary' : 'secondary'}
            variant={value === option.value ? undefined : 'outline'}
            size="sm"
            className="inspection-hydraulic-status-btn"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </CButton>
        ),
      )}
    </div>
  </div>
)

export default ScbaStatusSegment
