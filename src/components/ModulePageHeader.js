import React from 'react'

const ModulePageHeader = ({ title, subtitle, actions = null, className = '' }) => (
  <div
    className={`d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3 ${className}`.trim()}
  >
    <div style={{ minWidth: 0 }}>
      <h4 className="mb-1 fw-semibold">{title}</h4>
      {subtitle ? <div className="text-body-secondary">{subtitle}</div> : null}
    </div>
    {actions ? <div className="d-flex flex-wrap align-items-center gap-2">{actions}</div> : null}
  </div>
)

export default ModulePageHeader
