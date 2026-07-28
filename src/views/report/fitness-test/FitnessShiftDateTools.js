import React from 'react'
import { CButton, CFormInput } from '@coreui/react'

const FitnessShiftDateTools = ({ shift, mode, value, onChange, onApply, compact = false }) => (
  <div
    className={`fitness-shift-date-tools d-flex flex-wrap align-items-center gap-2 ${compact ? 'fitness-shift-date-tools--compact' : ''}`}
    role="group"
    aria-label={`${mode} date tools for ${shift}`}
  >
    <CFormInput
      type="date"
      size="sm"
      className="fitness-shift-date-tools__input"
      aria-label={`${mode} date to fill for ${shift}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <CButton
      type="button"
      color="light"
      size="sm"
      className="fitness-shift-date-tools__apply"
      disabled={!value}
      onClick={onApply}
    >
      Fill blank dates
    </CButton>
  </div>
)

export default FitnessShiftDateTools
