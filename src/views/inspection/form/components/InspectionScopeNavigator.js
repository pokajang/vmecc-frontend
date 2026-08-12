import React from 'react'
import { InspectionMobileCollapsedSelectorRow } from './InspectionSetupSelectorControls'
import InspectionProgressSummary from './patterns/InspectionProgressSummary.jsx'
import {
  formatInspectionItemCount,
  formatInspectionProgressSummary,
  normalizeInspectionProgress,
} from './patterns/inspectionProgressSummary'

const text = (value) => String(value ?? '').trim()

const normalizeScopeOption = (option = {}) => {
  const key = text(option.key || option.value || option.title)
  const rows = Array.isArray(option.rows)
    ? option.rows
    : Array.isArray(option.visibleRows)
      ? option.visibleRows
      : []
  const totalCount = Number(option.totalCount ?? option.progress?.totalCount ?? rows.length)
  const progress = normalizeInspectionProgress({
    checkedCount:
      option.checkedCount ??
      option.completedCount ??
      option.inspectedCount ??
      option.progress?.checkedCount ??
      option.progress?.inspectedCount,
    totalCount,
    issueCount: option.issueCount ?? option.defectCount ?? option.progress?.issueCount,
  })

  return {
    ...option,
    sourceOption: option,
    key,
    value: text(option.value || key),
    title: text(option.title || option.label || option.value || key),
    itemCount: Number.isFinite(Number(option.itemCount))
      ? Math.max(0, Number(option.itemCount))
      : progress.totalCount,
    ...progress,
  }
}

const InspectionScopeNavigator = ({
  label = 'Scope',
  options = [],
  value = '',
  nextIncompleteValue = '',
  isCompactViewport = false,
  actions = null,
  emptyMessage = '',
  loading = false,
  onSelect,
  onChange,
  onEditSelected,
  onResetSelected,
  editSelectedLabel = '',
  resetSelectedLabel = '',
  getFocusTarget,
  className = '',
  columnsClassName = 'col-12 col-md-6',
  showHeading = true,
  disabled = false,
  readOnly = false,
}) => {
  const normalizedOptions = (Array.isArray(options) ? options : [])
    .map(normalizeScopeOption)
    .filter((option) => option.key)
  const selected = normalizedOptions.find(
    (option) => option.value === text(value) || option.key === text(value),
  )
  const selectScope = onSelect || onChange

  const handleSelect = (option) => {
    selectScope?.(option.value, option.sourceOption || option)
    if (typeof getFocusTarget !== 'function') return
    window.setTimeout(() => {
      getFocusTarget(option)?.focus?.()
    }, 50)
  }

  if (selected && isCompactViewport) {
    const progress = formatInspectionProgressSummary(selected)
    return (
      <InspectionMobileCollapsedSelectorRow
        label={label}
        value={selected.title}
        secondaryValue={progress.text}
        resetLabel={resetSelectedLabel || `Reset ${label.toLowerCase()}`}
        editLabel={editSelectedLabel || `Change ${label.toLowerCase()}`}
        onReset={disabled || readOnly ? undefined : onResetSelected}
        onEdit={disabled || readOnly ? undefined : onEditSelected}
        className={className}
      />
    )
  }

  return (
    <section
      className={`inspection-scope-navigator d-grid gap-3 ${className}`.trim()}
      aria-label={`${label} selection`}
    >
      {showHeading || actions ? (
        <div className="inspection-hydraulic-section-heading d-flex flex-wrap align-items-center justify-content-between gap-2">
          {showHeading ? (
            <div className="fw-semibold text-muted">
              {selected ? `${label}s` : `Choose ${label}`}
            </div>
          ) : null}
          {actions}
        </div>
      ) : null}

      {loading && normalizedOptions.length === 0 ? (
        <div className="small text-body-secondary" role="status">
          Loading {label.toLowerCase()}s...
        </div>
      ) : normalizedOptions.length > 0 ? (
        <div
          className={`row g-3 ${isCompactViewport ? 'inspection-scope-navigator__mobile-list' : ''}`.trim()}
          role="group"
          aria-label={`Choose ${label.toLowerCase()}`}
        >
          {normalizedOptions.map((option) => {
            const isSelected = selected?.key === option.key
            const isNext =
              text(nextIncompleteValue) === option.key || text(nextIncompleteValue) === option.value
            const progress = formatInspectionProgressSummary(option)
            const accessibleName = [
              option.title,
              formatInspectionItemCount(option.itemCount),
              progress.text,
              isNext ? 'Next incomplete' : '',
              isSelected ? 'Selected' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div key={option.key} className={columnsClassName}>
                <button
                  type="button"
                  className={`inspection-location-option-card inspection-scope-navigator__option w-100 rounded-3 border bg-body p-3 text-start${
                    isSelected ? ' border-primary shadow-sm' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-label={accessibleName}
                  disabled={disabled || readOnly || option.disabled === true}
                  data-inspection-scope-option={option.key}
                  onClick={() => handleSelect(option)}
                >
                  <span className="d-flex align-items-start justify-content-between gap-2">
                    <span className="fw-semibold text-break">{option.title}</span>
                    <span className="d-inline-flex flex-wrap align-items-center justify-content-end gap-1">
                      {isSelected ? <span className="badge text-bg-primary">Selected</span> : null}
                      {isNext ? (
                        <span className="badge text-bg-light border text-body-secondary">Next</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="d-flex flex-wrap align-items-center gap-2 small text-body-secondary mt-1">
                    <span>{formatInspectionItemCount(option.itemCount)}</span>
                    <span aria-hidden="true">•</span>
                    <InspectionProgressSummary
                      checkedCount={option.checkedCount}
                      totalCount={option.totalCount}
                      issueCount={option.issueCount}
                    />
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          {emptyMessage || `No ${label.toLowerCase()}s are available.`}
        </div>
      )}
    </section>
  )
}

export default InspectionScopeNavigator
