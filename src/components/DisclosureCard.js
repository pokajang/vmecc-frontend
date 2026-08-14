import React from 'react'

const DisclosureCard = React.forwardRef(function DisclosureCard(
  {
    summary,
    children,
    open,
    defaultOpen = false,
    onToggle,
    className = '',
    summaryClassName = '',
    bodyClassName = '',
    ...detailsProps
  },
  ref,
) {
  const isControlled = typeof open === 'boolean'
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <details
      {...detailsProps}
      ref={ref}
      className={`disclosure-card ${className}`.trim()}
      open={isControlled ? open : isOpen}
      onToggle={(event) => {
        if (!isControlled) setIsOpen(event.currentTarget.open)
        onToggle?.(event)
      }}
    >
      <summary
        className={`disclosure-card__summary ${summaryClassName}`.trim()}
        role="button"
        aria-expanded={isControlled ? open : isOpen}
      >
        <div className="disclosure-card__summary-content">{summary}</div>
      </summary>
      <div className={`disclosure-card__body ${bodyClassName}`.trim()}>{children}</div>
    </details>
  )
})

export default DisclosureCard
