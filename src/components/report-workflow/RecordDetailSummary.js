import React from 'react'
import { CBadge } from '@coreui/react'

const RecordDetailSummary = ({
  title,
  status = '',
  statusColor = 'secondary',
  context = '',
  metadata = [],
  nextAction = '',
  actions = null,
  className = '',
}) => {
  const visibleMetadata = (Array.isArray(metadata) ? metadata : [metadata]).filter(Boolean)

  return (
    <section
      className={`record-detail-summary d-flex flex-wrap justify-content-between align-items-start gap-3 ${className}`.trim()}
    >
      <div className="d-grid gap-1 min-w-0">
        <div className="record-detail-summary__heading d-flex flex-wrap align-items-center gap-2">
          <h2 className="vmecc-card-title mb-0 text-break">{title || 'Record'}</h2>
          {React.isValidElement(status) ? (
            status
          ) : status ? (
            <CBadge color={statusColor}>{status}</CBadge>
          ) : null}
        </div>
        {context ? <div className="text-break">{context}</div> : null}
        {visibleMetadata.length > 0 ? (
          <div className="small text-body-secondary text-break">{visibleMetadata.join(' · ')}</div>
        ) : null}
        {nextAction ? (
          <div className="small">
            <span className="text-body-secondary">Next action:</span>{' '}
            <span className="fw-semibold">{nextAction}</span>
          </div>
        ) : null}
      </div>
      {actions ? <div className="record-detail-summary__actions">{actions}</div> : null}
    </section>
  )
}

export default RecordDetailSummary
