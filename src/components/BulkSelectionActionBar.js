import React from 'react'

const BulkSelectionActionBar = ({
  label,
  summary = null,
  controls = null,
  actions = null,
  mobileSticky = false,
  className = '',
}) => (
  <>
    {mobileSticky ? <div className="bulk-selection-action-bar-spacer d-md-none" /> : null}
    <div
      className={[
        'bulk-selection-action-bar border rounded-3 bg-light mb-3',
        mobileSticky ? 'bulk-selection-action-bar--mobile-sticky' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div className="d-grid gap-2">
          {label ? <div className="fw-semibold">{label}</div> : null}
          {controls}
          {summary}
        </div>
        {actions ? (
          <div className="d-flex flex-wrap gap-2 justify-content-end">{actions}</div>
        ) : null}
      </div>
    </div>
  </>
)

export default BulkSelectionActionBar
