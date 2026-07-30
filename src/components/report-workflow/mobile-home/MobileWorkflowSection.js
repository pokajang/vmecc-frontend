import React, { useId } from 'react'

const buildClassName = (...parts) => parts.filter(Boolean).join(' ')

const MobileWorkflowSection = ({
  title,
  titleId,
  header = false,
  headerAction = null,
  className = '',
  children,
  ...sectionProps
}) => {
  const generatedId = useId()
  const resolvedTitleId =
    titleId || `mobile-workflow-section-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const heading = (
    <h2 id={resolvedTitleId} className="mobile-workflow-home__section-title">
      {title}
    </h2>
  )

  return (
    <section
      {...sectionProps}
      className={buildClassName('mobile-workflow-home__section', className)}
      aria-labelledby={resolvedTitleId}
    >
      {header ? (
        <div className="mobile-workflow-home__section-header">
          {heading}
          {headerAction}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  )
}

export default MobileWorkflowSection
