import React, { useId } from 'react'
import { CButton } from '@coreui/react'

const text = (value) => String(value ?? '').trim()

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : []).map((option) =>
    typeof option === 'string'
      ? { value: option, label: option }
      : { value: option?.value, label: option?.label ?? option?.value },
  )

const getStatusTone = (value) => {
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

const InspectionStatusSegment = ({
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
}) => {
  const generatedId = useId().replace(/:/g, '')
  const labelId = label ? `inspection-status-label-${generatedId}` : undefined
  const normalizedOptions = normalizeOptions(options)
  const selected = normalizedOptions.find((option) => text(option.value) === text(value))
  const accessibleLabel = ariaLabel || label || 'Inspection status'

  return (
    <div
      className={`inspection-status-field inspection-hydraulic-check-row inspection-hydraulic-check-row--stacked d-grid gap-2 ${className}`.trim()}
    >
      {showLabel ? (
        <div
          id={labelId}
          className="inspection-status-field__label inspection-hydraulic-check-label small fw-semibold"
        >
          {label}
        </div>
      ) : null}
      {readOnly ? (
        <div className="inspection-status-field__readonly">
          <span
            className={`inspection-review-status-pill inspection-review-status-pill--${getStatusTone(
              selected?.value || value,
            )}`}
          >
            {selected?.label || text(value) || '--'}
          </span>
        </div>
      ) : (
        <div
          className="inspection-status-segment inspection-drawer-choice-group inspection-hydraulic-status-group d-flex flex-wrap justify-content-start gap-2"
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
                className="inspection-drawer-choice inspection-hydraulic-status-btn"
                aria-pressed={selectedOption}
                data-selected={selectedOption || undefined}
                onClick={() => onChange?.(option.value)}
              >
                {option.label}
              </CButton>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InspectionStatusSegment
