import React from 'react'
import { CButton } from '@coreui/react'
import { Pencil, RotateCcw } from 'lucide-react'

const hasValue = (value) => {
  if (React.isValidElement(value)) return true
  return String(value ?? '').trim().length > 0
}

const WorkflowSetupField = ({
  label,
  value,
  secondaryValue = '',
  editing = false,
  onEdit,
  onReset,
  error = '',
  children,
  className = '',
  ariaLabel,
}) => {
  const fieldId = React.useId()
  const errorId = error ? `${fieldId}-error` : undefined
  const showEditor = editing || !hasValue(value)

  return (
    <section
      className={['workflow-setup-field', className].filter(Boolean).join(' ')}
      aria-labelledby={fieldId}
      aria-describedby={errorId}
      data-invalid={Boolean(error) || undefined}
    >
      {showEditor ? (
        <>
          <div className="workflow-setup-field__header">
            <h3 id={fieldId} className="workflow-setup-field__label">
              {label}
            </h3>
            {typeof onReset === 'function' && hasValue(value) ? (
              <CButton
                type="button"
                color="light"
                size="sm"
                className="workflow-setup-field__icon-action"
                aria-label={`Reset ${label}`}
                onClick={onReset}
              >
                <RotateCcw size={18} aria-hidden="true" />
              </CButton>
            ) : null}
          </div>
          <div className="workflow-setup-field__editor">{children}</div>
        </>
      ) : (
        <div className="workflow-setup-field__summary" role="group" aria-label={ariaLabel || label}>
          <div className="workflow-setup-field__copy">
            <span id={fieldId} className="workflow-setup-field__label">
              {label}
            </span>
            <span className="workflow-setup-field__value">
              {value}
              {hasValue(secondaryValue) ? (
                <span className="workflow-setup-field__meta"> {secondaryValue}</span>
              ) : null}
            </span>
          </div>
          <div className="workflow-setup-field__actions">
            {typeof onReset === 'function' ? (
              <CButton
                type="button"
                color="light"
                variant="ghost"
                size="sm"
                className="workflow-setup-field__icon-action"
                aria-label={`Reset ${label}`}
                onClick={onReset}
              >
                <RotateCcw size={18} aria-hidden="true" />
              </CButton>
            ) : null}
            {typeof onEdit === 'function' ? (
              <CButton
                type="button"
                color="primary"
                variant="ghost"
                size="sm"
                className="workflow-setup-field__icon-action"
                aria-label={`Edit ${label}`}
                onClick={onEdit}
              >
                <Pencil size={18} aria-hidden="true" />
              </CButton>
            ) : null}
          </div>
        </div>
      )}
      {error ? (
        <div id={errorId} className="workflow-setup-field__error" role="alert">
          {error}
        </div>
      ) : null}
    </section>
  )
}

export default WorkflowSetupField
