import React from 'react'
import { CButton } from '@coreui/react'

const WorkflowRosterGroup = ({
  title,
  countLabel = '',
  onIncludeAll,
  onExcludeAll,
  includeDisabled = false,
  excludeDisabled = false,
  children,
  className = '',
  headerAction = null,
}) => {
  const headingId = React.useId()

  return (
    <section
      className={['workflow-roster-group', className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      <div className="workflow-roster-group__header">
        <div className="workflow-roster-group__copy">
          <h3 id={headingId} className="workflow-roster-group__title">
            {title}
          </h3>
          {countLabel ? <div className="workflow-roster-group__count">{countLabel}</div> : null}
        </div>
        {headerAction ||
        typeof onIncludeAll === 'function' ||
        typeof onExcludeAll === 'function' ? (
          <div className="workflow-roster-group__actions">
            {headerAction}
            {typeof onIncludeAll === 'function' ? (
              <CButton
                type="button"
                color="link"
                size="sm"
                disabled={includeDisabled}
                aria-label={`Include all ${title} members`}
                onClick={onIncludeAll}
              >
                Include all
              </CButton>
            ) : null}
            {typeof onExcludeAll === 'function' ? (
              <CButton
                type="button"
                color="link"
                size="sm"
                className="text-body-secondary"
                disabled={excludeDisabled}
                aria-label={`Exclude all ${title} members`}
                onClick={onExcludeAll}
              >
                Exclude all
              </CButton>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="workflow-roster-group__body">{children}</div>
    </section>
  )
}

export default WorkflowRosterGroup
