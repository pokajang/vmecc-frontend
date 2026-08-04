import React from 'react'
import { CButton } from '@coreui/react'
import { ArrowLeft } from 'lucide-react'

const MobileModuleBackAction = ({
  label = 'Back',
  onClick,
  className = '',
  size = 'sm',
  iconSize = 14,
  ...buttonProps
}) => (
  <CButton
    type="button"
    color="secondary"
    variant="outline"
    size={size}
    className={`d-md-none d-inline-flex align-items-center gap-1 ${className}`.trim()}
    onClick={onClick}
    {...buttonProps}
  >
    <ArrowLeft size={iconSize} />
    {label}
  </CButton>
)

export default MobileModuleBackAction
