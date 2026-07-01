import React from 'react'

const MobileOverlayItem = ({
  as: Component = 'button',
  type = Component === 'button' ? 'button' : undefined,
  icon = null,
  label,
  subtext = null,
  badge = null,
  action = null,
  trailing = null,
  disabled = false,
  danger = false,
  inline = false,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'mobile-overlay-item',
    subtext ? 'mobile-overlay-item-with-subtext' : '',
    action ? 'mobile-overlay-item-with-action' : '',
    danger ? 'mobile-overlay-item-danger' : '',
    inline ? 'mobile-overlay-item-inline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Component className={classes} type={type} disabled={disabled} {...rest}>
      {icon && <span className="mobile-overlay-item-icon">{icon}</span>}
      <span className="mobile-overlay-item-content">
        <span className="mobile-overlay-item-title-row">
          <span className="mobile-overlay-item-label">{label}</span>
          {badge}
        </span>
        {subtext && <span className="mobile-overlay-item-subtext">{subtext}</span>}
        {children}
      </span>
      {action && <span className="mobile-overlay-item-action">{action}</span>}
      {trailing && <span className="mobile-overlay-item-trailing">{trailing}</span>}
    </Component>
  )
}

export default MobileOverlayItem
