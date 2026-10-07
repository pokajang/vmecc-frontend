import React from 'react'

const ModulePageHeader = ({
  title,
  mobileTitle,
  subtitle,
  mobileSubtitle,
  actions = null,
  className = '',
}) => (
  <div className={`module-page-header mb-3 ${className}`.trim()}>
    <div className="module-page-header__title">
      <h1 className="vmecc-page-title mb-1 text-break">
        {mobileTitle ? (
          <>
            <span className="d-md-none">{mobileTitle}</span>
            <span className="d-none d-md-inline">{title}</span>
          </>
        ) : (
          title
        )}
      </h1>
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
    {actions ? <div className="module-page-header__actions">{actions}</div> : null}
  </div>
)

export default ModulePageHeader
