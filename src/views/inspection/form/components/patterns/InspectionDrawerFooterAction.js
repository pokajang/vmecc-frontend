import React from 'react'
import { CButton } from '@coreui/react'

const InspectionDrawerFooterAction = ({
  children,
  intent = 'neutral',
  className = '',
  type = 'button',
  ...buttonProps
}) => (
  <CButton
    {...buttonProps}
    type={type}
    className={`inspection-drawer-footer-action inspection-drawer-footer-action--${intent} ${className}`.trim()}
    color={intent === 'primary' ? 'primary' : 'secondary'}
    variant={intent === 'primary' ? undefined : 'outline'}
    size="sm"
  >
    <span className="inspection-drawer-footer-action__surface">{children}</span>
  </CButton>
)

export default InspectionDrawerFooterAction
