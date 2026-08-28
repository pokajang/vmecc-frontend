import React, { useId } from 'react'
import { CButton } from '@coreui/react'

const text = (value) => String(value ?? '').trim()

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : []).map((option) =>
    typeof option === 'string'
      ? { value: option, label: option }
      : { value: option?.value, label: option?.label ?? option?.value },
  )

export const getWorkflowStatusTone = (value) => {
  const normalized = text(value).toLowerCase()
  if (['good', 'yes', 'ok', 'checked', 'operational', 'available'].includes(normalized)) {
    return 'success'
  }
  if (
    ['not good', 'no', 'defect', 'missing', 'issue', 'unavailable', 'not available'].includes(
      normalized,
    )
  ) {
    return 'danger'
  }
  if (['n/a', 'not applicable'].includes(normalized)) return 'warning'
  return 'secondary'
}

const WorkflowStatusChoice = ({
  label = '',
  value,
  options = [],
  onChange,
  readOnly = false,
  invalid = false,
  describedBy,
  className = '',
  showLabel = Boolean(label),
  ariaLabel,
  classNames = {},
}) => {
  const generatedId = useId().replace(/:/g, '')
  const labelId = label ? `workflow-status-label-${generatedId}` : undefined
  const normalizedOptions = normalizeOptions(options)
  const selected = normalizedOptions.find((option) => text(option.value) === text(value))
  const accessibleLabel = ariaLabel || label || 'Status'
  const classes = {
    root: 'workflow-status-choice d-grid gap-2',
    label: 'workflow-status-choice__label small fw-semibold',
    readOnly: 'workflow-status-choice__readonly',
    pill: 'workflow-status-choice__pill',
    group: 'workflow-status-choice__group d-flex flex-wrap justify-content-start gap-2',
    button: 'workflow-status-choice__button',
    surface: 'workflow-status-choice__surface',
    ...classNames,
  }

  return (
    <div className={`${classes.root} ${className}`.trim()}>
      {showLabel ? (
        <div id={labelId} className={classes.label}>
          {label}
        </div>
      ) : null}
      {readOnly ? (
        <div className={classes.readOnly}>
          <span
            className={`${classes.pill} ${classes.pill}--${getWorkflowStatusTone(selected?.value || value)}`}
          >
            {selected?.label || text(value) || '--'}
          </span>
        </div>
      ) : (
        <div
          className={classes.group}
          role="group"
          aria-label={labelId ? undefined : accessibleLabel}
          aria-labelledby={labelId}
          aria-describedby={describedBy || undefined}
          data-invalid={invalid || undefined}
        >
          {normalizedOptions.map((option) => {
            const selectedOption = text(option.value) === text(value)
            return (
              <CButton
                key={text(option.value)}
                type="button"
                color={selectedOption ? 'primary' : 'secondary'}
                variant={selectedOption ? undefined : 'outline'}
                size="sm"
                className={classes.button}
                aria-pressed={selectedOption}
                data-selected={selectedOption || undefined}
                onClick={() => onChange?.(option.value)}
              >
                <span className={classes.surface}>{option.label}</span>
              </CButton>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default WorkflowStatusChoice
