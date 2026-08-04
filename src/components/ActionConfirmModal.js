import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ActionConfirmModal = ({
  visible = false,
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  cancelDisabled = false,
  mobileDrawer = true,
  mobileDrawerQuery = '(max-width: 575.98px)',
  testId = '',
  onClose,
  onConfirm,
}) => {
  const useMobileDrawer = useMediaQuery(mobileDrawerQuery)

  const handleClose = () => {
    if (cancelDisabled) return
    onClose?.()
  }

  const actions = (
    <>
      <CButton color="secondary" variant="outline" onClick={handleClose} disabled={cancelDisabled}>
        {cancelLabel}
      </CButton>
      <CButton color={confirmColor} onClick={onConfirm} disabled={confirmDisabled}>
        {confirmLabel}
      </CButton>
    </>
  )

  if (mobileDrawer && useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        className="mobile-bottom-drawer--confirm"
        onClose={handleClose}
        closeDisabled={cancelDisabled}
        {...(testId ? { 'data-testid': testId } : {})}
      >
        <div className="action-confirm-modal__body d-grid">
          <div>{message}</div>
        </div>
        <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
          {actions}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      visible={visible}
      alignment="center"
      backdrop={cancelDisabled ? 'static' : true}
      keyboard={!cancelDisabled}
      onClose={handleClose}
      {...(testId ? { 'data-testid': testId } : {})}
    >
      <CModalHeader closeButton={!cancelDisabled}>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{message}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default ActionConfirmModal
