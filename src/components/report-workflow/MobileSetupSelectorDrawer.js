import React from 'react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'

const MobileSetupSelectorDrawer = ({
  visible,
  title,
  headerAction = null,
  children,
  onClose,
  className = '',
  bodyClassName = '',
  ...drawerProps
}) => (
  <MobileBottomDrawer
    {...drawerProps}
    visible={visible}
    title={title}
    headerAction={headerAction}
    onClose={onClose}
    className={className}
    bodyClassName={bodyClassName}
  >
    {children}
  </MobileBottomDrawer>
)

export default MobileSetupSelectorDrawer
