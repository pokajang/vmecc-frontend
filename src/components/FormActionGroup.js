import React from 'react'

const FormActionGroup = ({
  actionsAlign = 'end',
  children,
  leading = null,
  className = '',
  mobileThumb = true,
  mobileBehavior,
  mobileVariant = 'default',
  statusMessage = '',
  showSpacer = true,
  spacerClassName = 'd-md-none',
  ariaLabel = 'Form actions',
}) => {
  const hasLeading = Boolean(leading)
  const hasActions = Boolean(children)
  const resolvedMobileBehavior =
    mobileBehavior ||
    (mobileVariant === 'compact-sticky'
      ? 'compact-sticky'
      : mobileThumb
        ? 'in-flow'
        : 'legacy-in-flow')
  const isSticky = resolvedMobileBehavior === 'sticky'
  const isCompactSticky = resolvedMobileBehavior === 'compact-sticky'
  const usesMobileActionLayout = resolvedMobileBehavior !== 'legacy-in-flow'
  const alignStart = actionsAlign === 'start'
  const containerClassName = usesMobileActionLayout
    ? [
        'action-row-thumb',
        `action-row-thumb--${resolvedMobileBehavior}`,
        hasLeading ? 'action-row-thumb--split' : '',
        isCompactSticky && hasLeading ? 'action-row-thumb--has-leading' : '',
      ]
        .filter(Boolean)
        .join(' ')
    : `d-flex flex-wrap align-items-center gap-2 ${
        hasLeading
          ? 'justify-content-between'
          : alignStart
            ? 'justify-content-start'
            : 'justify-content-end'
      }`
  const containerStyle =
    usesMobileActionLayout && alignStart
      ? {
          justifyItems: 'start',
        }
      : undefined
  const actionsStyle = alignStart
    ? {
        justifyContent: 'flex-start',
        justifyItems: 'start',
        marginLeft: 0,
        marginRight: 'auto',
      }
    : undefined
  const spacerClasses = [
    'action-row-thumb-spacer',
    isCompactSticky ? 'action-row-thumb-spacer--compact' : '',
    isCompactSticky && hasLeading ? 'action-row-thumb-spacer--compact-with-leading' : '',
    spacerClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        className={`${containerClassName} ${className}`.trim()}
        role="group"
        aria-label={ariaLabel}
        style={containerStyle}
      >
        {isCompactSticky && statusMessage ? (
          <div className="action-row-thumb-status text-body-secondary" title={statusMessage}>
            {statusMessage}
          </div>
        ) : null}
        {hasLeading ? <div className="action-row-thumb-leading">{leading}</div> : null}
        {hasActions ? (
          <div className="action-row-thumb-actions" style={actionsStyle}>
            {children}
          </div>
        ) : null}
      </div>
      {(isSticky || isCompactSticky) && showSpacer ? <div className={spacerClasses} /> : null}
    </>
  )
}

export default FormActionGroup
