import React from 'react'
import { CButton } from '@coreui/react'
import { Plus } from 'lucide-react'

const DISABLED_STYLE = { cursor: 'not-allowed' }

const CreateActionButton = ({
  label,
  onClick,
  icon,
  disabled = false,
  size = 'sm',
  className = '',
  importance = 'inline',
  showIcon = true,
  ariaExpanded,
  ariaLabel,
  ...rest
}) => {
  const resolvedIcon = showIcon
    ? icon || <Plus size={13} className="me-1 align-text-bottom" />
    : null
  const resolvedAriaLabel = ariaLabel || label || undefined
  const isPrimary = importance === 'primary'
  const disabledClassName = disabled ? 'opacity-50' : ''
  const buttonClassName = isPrimary
    ? `d-inline-flex align-items-center px-3 ${disabledClassName} ${className}`.trim()
    : `text-primary px-2 py-1 border-0 bg-transparent shadow-none ${disabledClassName} ${className}`.trim()
  const colorProps = isPrimary ? { color: 'primary' } : {}

  return (
    <CButton
      size={size}
      {...colorProps}
      className={buttonClassName}
      style={disabled ? DISABLED_STYLE : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      aria-expanded={ariaExpanded}
      {...rest}
    >
      {resolvedIcon}
      {label}
    </CButton>
  )
}

export default CreateActionButton
