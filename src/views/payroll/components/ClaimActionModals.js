import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const ClaimActionModals = ({
  cancelModalVisible,
  cancelTarget,
  onCancelClose,
  onCancelConfirm,
  deleteModalVisible,
  deleteTarget,
  onDeleteClose,
  onDeleteConfirm,
  deleteBlockedModalVisible,
  deleteBlockedTarget,
  onDeleteBlockedClose,
}) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const cancelBody = cancelTarget?.id ? (
    <>
      Are you sure you want to <span className="text-danger">cancel</span> {cancelTarget.id}? This
      action cannot be undone and this claim will no longer be actionable in workflow.
    </>
  ) : (
    <>
      Are you sure you want to <span className="text-danger">cancel</span> this claim? This action
      cannot be undone.
    </>
  )
  const cancelActions = (
    <>
      <CButton color="secondary" variant="outline" onClick={onCancelClose}>
        Keep claim
      </CButton>
      <CButton color="danger" onClick={onCancelConfirm}>
        Cancel claim
      </CButton>
    </>
  )
  const deleteBody = deleteTarget?.id ? (
    <>
      Are you sure you want to <span className="text-danger">delete</span> {deleteTarget.id}? This
      action cannot be undone.
    </>
  ) : (
    <>
      Are you sure you want to <span className="text-danger">delete</span> this claim? This action
      cannot be undone.
    </>
  )
  const deleteActions = (
    <>
      <CButton color="secondary" variant="outline" onClick={onDeleteClose}>
        Cancel
      </CButton>
      <CButton color="danger" onClick={onDeleteConfirm}>
        Delete
      </CButton>
    </>
  )
  const deleteBlockedBody = deleteBlockedTarget?.id ? (
    <>
      To delete <span className="fw-semibold">{deleteBlockedTarget.id}</span>, cancel this claim
      first.{' '}
      {deleteBlockedTarget?.deleteBlockedReason ||
        'Only draft or cancelled claims can be deleted from records.'}
    </>
  ) : (
    <>Please cancel this claim first before deleting it from records.</>
  )

  const deleteBlockedActions = (
    <CButton color="primary" onClick={onDeleteBlockedClose}>
      Understood
    </CButton>
  )

  const drawerFooter = (actions) => (
    <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
      {actions}
    </div>
  )

  if (isMobileDrawer) {
    return (
      <>
        <MobileBottomDrawer
          visible={cancelModalVisible}
          title="Cancel claim"
          onClose={onCancelClose}
          data-testid="payroll-claim-cancel-modal"
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            {cancelBody}
          </div>
          {drawerFooter(cancelActions)}
        </MobileBottomDrawer>

        <MobileBottomDrawer
          visible={deleteModalVisible}
          title="Delete claim"
          onClose={onDeleteClose}
          data-testid="payroll-claim-delete-modal"
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            {deleteBody}
          </div>
          {drawerFooter(deleteActions)}
        </MobileBottomDrawer>

        <MobileBottomDrawer
          visible={deleteBlockedModalVisible}
          title="Delete unavailable"
          onClose={onDeleteBlockedClose}
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            {deleteBlockedBody}
          </div>
          {drawerFooter(deleteBlockedActions)}
        </MobileBottomDrawer>
      </>
    )
  }

  return (
    <>
      <CModal
        visible={cancelModalVisible}
        onClose={onCancelClose}
        alignment="center"
        data-testid="payroll-claim-cancel-modal"
      >
        <CModalHeader>
          <CModalTitle>Cancel claim</CModalTitle>
        </CModalHeader>
        <CModalBody>{cancelBody}</CModalBody>
        <CModalFooter>{cancelActions}</CModalFooter>
      </CModal>

      <CModal
        visible={deleteModalVisible}
        onClose={onDeleteClose}
        alignment="center"
        data-testid="payroll-claim-delete-modal"
      >
        <CModalHeader>
          <CModalTitle>Delete claim</CModalTitle>
        </CModalHeader>
        <CModalBody>{deleteBody}</CModalBody>
        <CModalFooter>{deleteActions}</CModalFooter>
      </CModal>

      <CModal visible={deleteBlockedModalVisible} onClose={onDeleteBlockedClose} alignment="center">
        <CModalHeader>
          <CModalTitle>Delete unavailable</CModalTitle>
        </CModalHeader>
        <CModalBody>{deleteBlockedBody}</CModalBody>
        <CModalFooter>{deleteBlockedActions}</CModalFooter>
      </CModal>
    </>
  )
}

export default ClaimActionModals
