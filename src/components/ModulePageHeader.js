import React from 'react'

const ModulePageHeader = ({ title, subtitle, mobileSubtitle, actions = null, className = '' }) => (
  <div
    className={`module-page-header d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3 ${className}`.trim()}
  >
    <div className="module-page-header__title" style={{ minWidth: 0 }}>
      <h1 className="vmecc-page-title mb-1 text-break">{title}</h1>
      {subtitle ? (
        <div className="module-page-header__subtitle vmecc-meta text-body-secondary">
          {mobileSubtitle ? (
            <>
              <span className="d-md-none">{mobileSubtitle}</span>
              <span className="d-none d-md-inline">{subtitle}</span>
            </>
          ) : (
            subtitle
          )}
        </div>
      ) : null}
    </div>
    {actions ? (
      <div className="module-page-header__actions d-flex flex-wrap align-items-center gap-2">
        {actions}
      </div>
    ) : null}
  </div>
)

export default ModulePageHeader
