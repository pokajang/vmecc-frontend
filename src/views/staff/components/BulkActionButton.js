import React from 'react'
import { CButton } from '@coreui/react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

const DISABLED_STYLE = { cursor: 'not-allowed', pointerEvents: 'none' }

const INTENT_CONFIG = {
  neutral: {
    className: 'text-body-secondary',
    icon: <X size={13} className="me-1 align-text-bottom" />,
  },
  approve: {
    className: 'text-success',
    icon: <CheckCircle2 size={13} className="me-1 align-text-bottom" />,
  },
  reject: {
    className: 'text-danger',
    icon: <XCircle size={13} className="me-1 align-text-bottom" />,
  },
}

const BulkActionButton = ({
  label,
  onClick,
  intent = 'neutral',
  icon,
  disabled = false,
  size = 'sm',
  className = '',
  ariaLabel,
}) => {
  const intentConfig = INTENT_CONFIG[intent] || INTENT_CONFIG.neutral
  const resolvedIcon = icon || intentConfig.icon
  const resolvedAriaLabel = ariaLabel || label || undefined

  return (
    <CButton
      size={size}
      className={`${intentConfig.className} px-2 py-1 border-0 bg-transparent shadow-none ${disabled ? 'opacity-50' : ''} ${className}`.trim()}
      style={disabled ? DISABLED_STYLE : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
    >
      {resolvedIcon}
      {label}
    </CButton>
  )
}

export default BulkActionButton
