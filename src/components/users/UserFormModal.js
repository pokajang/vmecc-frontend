import React from 'react'
import { CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import CreateStaffForm from 'src/views/users/CreateStaffForm'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const UserFormModal = ({
  visible,
  form,
  submitStatus,
  onChange,
  onSubmit,
  onCancel,
  onClose,
  roleAssignments,
  teams,
  onAddAssignment,
  onRemoveAssignment,
  onChangeAssignment,
}) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')

  const body = (
    <CreateStaffForm
      visible={visible}
      form={form}
      submitStatus={submitStatus}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      roleAssignments={roleAssignments}
      teams={teams}
      onAddAssignment={onAddAssignment}
      onRemoveAssignment={onRemoveAssignment}
      onChangeAssignment={onChangeAssignment}
      className="border-0 p-0 mb-0 bg-transparent"
    />
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Create User" onClose={onClose}>
        {body}
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" scrollable>
      <CModalHeader>
        <CModalTitle>Create User</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
    </CModal>
  )
}

export default UserFormModal
