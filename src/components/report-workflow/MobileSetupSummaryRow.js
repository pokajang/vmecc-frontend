import React from 'react'
import { CButton } from '@coreui/react'
import { Pencil, RotateCcw } from 'lucide-react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const MobileSetupSummaryRow = ({
  label,
  value,
  secondaryValue = '',
  meta = null,
  extraAction = null,
  editLabel,
  editIcon = null,
  resetLabel,
  resetIcon = null,
  onEdit,
  onReset,
  className = '',
  valueClassName = '',
}) => {
  const displayValue = value || '--'
  const fullValue = [typeof displayValue === 'string' ? displayValue : '', secondaryValue]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={buildClassName('mobile-setup-summary', className)}
      role="group"
      aria-label={label}
    >
      <span className="mobile-setup-summary__label">{label}</span>
      <span
        className={buildClassName(
          'mobile-setup-summary__value',
          secondaryValue ? 'mobile-setup-summary__value--split' : '',
          valueClassName,
        )}
        title={fullValue || undefined}
      >
        <span className="mobile-setup-summary__value-text">{displayValue}</span>
        {secondaryValue ? (
          <span className="mobile-setup-summary__value-secondary">{secondaryValue}</span>
        ) : null}
        {meta}
      </span>
      <span
        className={buildClassName(
          'mobile-setup-summary__actions',
          typeof onReset === 'function' && typeof onEdit === 'function'
            ? 'mobile-setup-summary__actions--paired'
            : '',
        )}
      >
        {extraAction}
        {typeof onReset === 'function' ? (
          <CButton
            type="button"
            color="primary"
            variant="ghost"
            size="sm"
            className="mobile-setup-summary__action mobile-setup-summary__reset"
            aria-label={resetLabel || `Reset ${label}`}
            title={resetLabel || `Reset ${label}`}
            onClick={onReset}
          >
            {resetIcon || <RotateCcw size={16} aria-hidden="true" />}
          </CButton>
        ) : null}
        {typeof onEdit === 'function' ? (
          <CButton
            type="button"
            color="primary"
            variant="ghost"
            size="sm"
            className="mobile-setup-summary__action mobile-setup-summary__edit"
            aria-label={editLabel || `Edit ${label}`}
            title={editLabel || `Edit ${label}`}
            onClick={onEdit}
          >
            {editIcon || <Pencil size={16} aria-hidden="true" />}
          </CButton>
        ) : null}
      </span>
    </div>
  )
}

export default MobileSetupSummaryRow
