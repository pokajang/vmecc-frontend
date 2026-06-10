import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

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
}) => {
  const mergedStyle = {
    ...(zIndex != null
      ? {
          '--cui-modal-zindex': zIndex + 5,
        }
      : {}),
    ...(style || {}),
  }

  useEffect(() => {
    if (zIndex == null || !visible) return
    document.body.classList.add('modal-open')
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = '0px'

    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
    }
  }, [visible, zIndex])

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
        onClose={onClose}
        alignment="center"
        backdrop={zIndex != null ? false : true}
        className={className}
        style={mergedStyle}
      >
        <CModalHeader>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>{message}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={onClose} disabled={cancelDisabled}>
            {cancelLabel}
          </CButton>
          <CButton color={confirmColor} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UserConfirmModal
