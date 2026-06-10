import React from 'react'

const FormActionGroup = ({
  children,
  leading = null,
  className = '',
  mobileThumb = true,
  showSpacer = true,
  spacerClassName = 'd-lg-none',
  ariaLabel = 'Form actions',
}) => {
  const hasLeading = Boolean(leading)
  const hasActions = Boolean(children)
  const containerClassName = mobileThumb
    ? `action-row-thumb${hasLeading ? ' action-row-thumb--split' : ''}`
    : `d-flex flex-wrap align-items-center gap-2 ${
        hasLeading ? 'justify-content-between' : 'justify-content-end'
      }`

  return (
    <>
      <div
        className={`${containerClassName} ${className}`.trim()}
        role="group"
        aria-label={ariaLabel}
      >
        {hasLeading ? <div className="action-row-thumb-leading">{leading}</div> : null}
        {hasActions ? <div className="action-row-thumb-actions">{children}</div> : null}
      </div>
      {mobileThumb && showSpacer ? (
        <div className={`action-row-thumb-spacer ${spacerClassName}`.trim()} />
      ) : null}
    </>
  )
}

export default FormActionGroup
