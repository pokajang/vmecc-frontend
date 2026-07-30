import React, { useId } from 'react'

const normalizeId = (value) => String(value || '').replace(/:/g, '')

const InspectionFieldError = ({ children, id, className = '', announce = true, ...props }) => {
  const generatedId = useId()
  if (!children) return null

  return (
    <div
      id={id || `inspection-field-error-${normalizeId(generatedId)}`}
      className={`inspection-field-error text-danger small mt-2 ${className}`.trim()}
      role={announce ? 'alert' : undefined}
      aria-live={announce ? 'polite' : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export default InspectionFieldError
