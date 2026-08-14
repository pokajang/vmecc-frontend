import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import ActionButtonGroup from 'src/components/ActionButtonGroup'
import AppButton from 'src/components/AppButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const UserConfirmModal = ({
  visible = false,
  title = 'Confirm',
  message = null,
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  onConfirm = () => {},
  onClose = () => {},
  confirmDisabled = false,
  cancelDisabled = false,
  cancelLabel = 'Cancel',
  zIndex,
  className,
  style,
  testId,
  bodyTestId,
}) => {
  const confirmIntent = ['primary', 'success', 'info', 'warning', 'danger'].includes(confirmColor)
    ? confirmColor
    : 'primary'
  const handleClose = () => {
    if (cancelDisabled) return
    onClose()
  }
  const hasCustomModalStyle = zIndex != null || style != null
  const mergedStyle = hasCustomModalStyle
    ? {
        ...(style || {}),
        ...(zIndex != null
          ? {
              '--cui-modal-zindex': zIndex + 5,
            }
          : {}),
        display: 'block',
      }
    : undefined
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  useEffect(() => {
    if (zIndex == null || !visible) return
    if (useMobileDrawer) return
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = '0px'

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
    }
  }, [visible, zIndex, useMobileDrawer])
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

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        onClose={handleClose}
        closeDisabled={cancelDisabled}
        className={className}
      >
        <div
          className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid"
          data-testid={visible ? bodyTestId : undefined}
        >
          {message}
        </div>
        <div className="mobile-bottom-drawer__footer">{actions}</div>
      </MobileBottomDrawer>
    )
  }

  return (
    <>
      {zIndex != null &&
        visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="modal-backdrop fade show" style={{ zIndex }} aria-hidden="true" />,
          document.body,
        )}

      <CModal
        visible={visible}
        onClose={handleClose}
        alignment="center"
        backdrop={zIndex != null ? false : true}
        className={className}
        {...(mergedStyle ? { style: mergedStyle } : {})}
      >
        <CModalHeader data-testid={visible ? testId : undefined}>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody data-testid={visible ? bodyTestId : undefined}>{message}</CModalBody>
        <CModalFooter>{actions}</CModalFooter>
      </CModal>
    </>
  )
}

export default UserConfirmModal
