import React from 'react'
import AppButton from './AppButton'
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
  const normalizedImportance = importance === 'primary' ? 'page-primary' : importance
  const resolvedIcon = showIcon ? icon || <Plus size={16} /> : null
  const resolvedAriaLabel = ariaLabel || label || undefined
  const isPagePrimary = normalizedImportance === 'page-primary'
  const isSectionPrimary = normalizedImportance === 'section-primary'
  const disabledClassName = disabled ? 'create-action-button--disabled' : ''
  const importanceClassName = `create-action-button--${normalizedImportance}`
  const buttonClassName = isPagePrimary
    ? `create-action-button ${importanceClassName} d-inline-flex align-items-center justify-content-center px-3 ${disabledClassName} ${className}`.trim()
    : isSectionPrimary
      ? `create-action-button ${importanceClassName} d-inline-flex align-items-center justify-content-center px-3 ${disabledClassName} ${className}`.trim()
      : `create-action-button ${importanceClassName} d-inline-flex align-items-center justify-content-center text-primary px-2 py-1 border-0 bg-transparent shadow-none ${disabledClassName} ${className}`.trim()
  const intent = isPagePrimary || isSectionPrimary ? 'primary' : 'neutral'
  const presentation = isPagePrimary ? 'solid' : isSectionPrimary ? 'soft' : 'ghost'

  return (
    <AppButton
      size={size}
      intent={intent}
      presentation={presentation}
      className={buttonClassName}
      style={disabled ? DISABLED_STYLE : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={resolvedAriaLabel}
      aria-expanded={ariaExpanded}
      {...rest}
    >
      {resolvedIcon ? (
        <span className="create-action-button__icon" aria-hidden="true">
          {resolvedIcon}
        </span>
      ) : null}
      <span className="create-action-button__label">{label}</span>
    </AppButton>
  )
}

export default CreateActionButton
