import React from 'react'
import { CButton } from '@coreui/react'
import { Plus } from 'lucide-react'

const DISABLED_STYLE = { cursor: 'not-allowed', pointerEvents: 'none' }

const CreateActionButton = ({
  label,
  onClick,
  icon,
  disabled = false,
  size = 'sm',
  className = '',
  ariaExpanded,
  ariaLabel,
}) => {
  const resolvedIcon = icon || <Plus size={13} className="me-1 align-text-bottom" />
  const resolvedAriaLabel = ariaLabel || label || undefined

  return (
    <CButton
      size={size}
      className={`text-primary px-2 py-1 border-0 bg-transparent shadow-none ${disabled ? 'opacity-50' : ''} ${className}`.trim()}
      style={disabled ? DISABLED_STYLE : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      aria-expanded={ariaExpanded}
    >
      {resolvedIcon}
      {label}
    </CButton>
  )
}

export default CreateActionButton
