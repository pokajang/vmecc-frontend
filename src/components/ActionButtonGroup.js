import React from 'react'

const ActionButtonGroup = ({
  children,
  layout = 'inline',
  align = 'end',
  className = '',
  ariaLabel = 'Actions',
}) => (
  <div
    className={[
      'app-action-group',
      `app-action-group--${layout}`,
      `app-action-group--${align}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    role="group"
    aria-label={ariaLabel}
  >
    {children}
  </div>
)

export default ActionButtonGroup
