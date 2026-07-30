import React from 'react'
import { CBadge } from '@coreui/react'
import BackButton from 'src/components/BackButton'

const WorkflowDetailHeader = ({
  title,
  subtitle = '',
  status = '',
  statusColor = 'secondary',
  backLabel = 'Back',
  backTo,
  onBack,
  actions = null,
  className = '',
}) => (
  <header
    className={`workflow-detail-header d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3 ${className}`.trim()}
  >
    <div className="d-flex align-items-start gap-2 min-w-0">
      {onBack || backTo ? <BackButton to={backTo} onClick={onBack} label={backLabel} /> : null}
      <div className="min-w-0">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h1 className="vmecc-page-title mb-0 text-break">{title}</h1>
          {status ? <CBadge color={statusColor}>{status}</CBadge> : null}
        </div>
        {subtitle ? (
          <div className="vmecc-meta text-body-secondary mt-1 text-break">{subtitle}</div>
        ) : null}
      </div>
    </div>
    {actions ? <div className="workflow-detail-header__actions">{actions}</div> : null}
  </header>
)

export default WorkflowDetailHeader
