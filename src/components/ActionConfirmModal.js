import React from 'react'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import AppButton from 'src/components/AppButton'
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
  const confirmIntent = ['primary', 'success', 'info', 'warning', 'danger'].includes(confirmColor)
    ? confirmColor
    : 'primary'

  const handleClose = () => {
    if (cancelDisabled) return
    onClose?.()
  }

  const actions = (
    <ActionButtonGroup ariaLabel="Confirmation actions">
      <AppButton intent="neutral" onClick={handleClose} disabled={cancelDisabled}>
        {cancelLabel}
      </AppButton>
      <AppButton
        intent={confirmIntent}
        presentation="solid"
        onClick={onConfirm}
        disabled={confirmDisabled}
      >
        {confirmLabel}
      </AppButton>
    </ActionButtonGroup>
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
        <div className="mobile-bottom-drawer__footer">{actions}</div>
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
