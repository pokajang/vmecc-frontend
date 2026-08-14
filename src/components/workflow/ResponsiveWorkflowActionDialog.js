import React from 'react'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ResponsiveWorkflowActionDialog = ({
  visible,
  title,
  body,
  footer,
  onClose,
  closeDisabled = false,
  className = '',
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  if (!visible) return null

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        bodyClassName="workflow-action-drawer"
        onClose={onClose}
        closeDisabled={closeDisabled}
      >
        <div className="inspection-mobile-detail-drawer-body d-grid gap-3">{body}</div>
        <div className="mobile-bottom-drawer__footer">
          <ActionButtonGroup ariaLabel={`${title} actions`}>{footer}</ActionButtonGroup>
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      visible={visible}
      onClose={closeDisabled ? undefined : onClose}
      alignment="center"
      scrollable
      className={className}
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">{body}</CModalBody>
      <CModalFooter>
        <ActionButtonGroup ariaLabel={`${title} actions`}>{footer}</ActionButtonGroup>
      </CModalFooter>
    </CModal>
  )
}

export default ResponsiveWorkflowActionDialog
