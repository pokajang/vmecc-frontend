import React from 'react'

const FormFieldError = ({ children, className = '', ...props }) => {
  if (!children) return null

  return (
    <div className={`invalid-feedback d-block ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

export default FormFieldError
