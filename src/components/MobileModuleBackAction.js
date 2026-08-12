import React from 'react'
import BackButton from 'src/components/BackButton'

const MobileModuleBackAction = ({
  label = 'Back',
  onClick,
  className = '',
  size = 'sm',
  iconSize = 18,
  ...buttonProps
}) => (
  <BackButton
    {...buttonProps}
    size={size}
    iconSize={iconSize}
    label={label}
    className={`d-md-none ${className}`.trim()}
    onClick={onClick}
  />
)

export default MobileModuleBackAction
