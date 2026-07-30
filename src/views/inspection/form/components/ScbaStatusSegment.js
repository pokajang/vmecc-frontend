import React from 'react'
import InspectionStatusSegment from './patterns/InspectionStatusSegment'

const ScbaStatusSegment = ({ label, value, onChange, readOnly = false, statusOptions = [] }) => (
  <InspectionStatusSegment
    label={label}
    value={value}
    options={statusOptions}
    onChange={onChange}
    readOnly={readOnly}
  />
)

export default ScbaStatusSegment
