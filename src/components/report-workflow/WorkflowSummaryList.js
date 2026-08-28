import React from 'react'

const hasValue = (value) => {
  if (React.isValidElement(value)) return true
  return String(value ?? '').trim().length > 0
}

const WorkflowSummaryList = ({
  title = '',
  items = [],
  variant = 'detail',
  emptyValue = '--',
  className = '',
  titleClassName = '',
  listClassName = '',
  ariaLabel,
}) => {
  const headingId = React.useId()
  const visibleItems = (Array.isArray(items) ? items : []).filter(
    (item) => item && String(item.label || '').trim(),
  )
  if (!visibleItems.length) return null

  const content = (
    <>
      {title ? (
        <h2
          id={headingId}
          className={['workflow-summary__title', titleClassName].filter(Boolean).join(' ')}
        >
          {title}
        </h2>
      ) : null}
      <dl
        className={['workflow-summary__list', `workflow-summary__list--${variant}`, listClassName]
          .filter(Boolean)
          .join(' ')}
        aria-label={!title ? ariaLabel : undefined}
      >
        {visibleItems.map((item) => (
          <div
            key={item.key || item.label}
            className={[
              'workflow-summary__item',
              item.span === 'full' || item.fullWidth ? 'workflow-summary__item--full' : '',
              item.emphasis ? 'workflow-summary__item--emphasis' : '',
              item.isAlert ? 'workflow-summary__item--alert' : '',
              item.className || '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <dt className="workflow-summary__label">{item.label}</dt>
            <dd className="workflow-summary__value">
              <span>{hasValue(item.value) ? item.value : emptyValue}</span>
              {hasValue(item.meta) ? (
                <span className="workflow-summary__meta"> · {item.meta}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )

  return title ? (
    <section
      className={['workflow-summary', `workflow-summary--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={headingId}
    >
      {content}
    </section>
  ) : (
    <div
      className={['workflow-summary', `workflow-summary--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {content}
    </div>
  )
}

export default WorkflowSummaryList
