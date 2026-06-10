import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'

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
}) => (
  <>
    <CModal visible={cancelModalVisible} onClose={onCancelClose} alignment="center">
      <CModalHeader>Cancel Claim</CModalHeader>
      <CModalBody>
        {cancelTarget?.id ? (
          <>
            Are you sure you want to <span className="text-danger">cancel</span> {cancelTarget.id}?
            This action cannot be undone and this claim will no longer be actionable in workflow.
          </>
        ) : (
          <>
            Are you sure you want to <span className="text-danger">cancel</span> this claim? This
            action cannot be undone.
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onCancelClose}>
          Keep claim
        </CButton>
        <CButton color="danger" onClick={onCancelConfirm}>
          Cancel claim
        </CButton>
      </CModalFooter>
    </CModal>

    <CModal visible={deleteModalVisible} onClose={onDeleteClose} alignment="center">
      <CModalHeader>Delete Claim</CModalHeader>
      <CModalBody>
        {deleteTarget?.id ? (
          <>
            Are you sure you want to <span className="text-danger">delete</span> {deleteTarget.id}?
            This action cannot be undone.
          </>
        ) : (
          <>
            Are you sure you want to <span className="text-danger">delete</span> this claim? This
            action cannot be undone.
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onDeleteClose}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={onDeleteConfirm}>
          Delete
        </CButton>
      </CModalFooter>
    </CModal>

    <CModal visible={deleteBlockedModalVisible} onClose={onDeleteBlockedClose} alignment="center">
      <CModalHeader>Delete Unavailable</CModalHeader>
      <CModalBody>
        {deleteBlockedTarget?.id ? (
          <>
            To delete <span className="fw-semibold">{deleteBlockedTarget.id}</span>, cancel this
            claim first.{' '}
            {deleteBlockedTarget?.deleteBlockedReason ||
              'Only draft or cancelled claims can be deleted from records.'}
          </>
        ) : (
          <>Please cancel this claim first before deleting it from records.</>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" onClick={onDeleteBlockedClose}>
          Understood
        </CButton>
      </CModalFooter>
    </CModal>
  </>
)

export default ClaimActionModals
