import React from 'react'
import { CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import CreateStaffForm from 'src/views/users/CreateStaffForm'

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
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center" scrollable>
    <CModalHeader>
      <CModalTitle>Create User</CModalTitle>
    </CModalHeader>
    <CModalBody>
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
    </CModalBody>
  </CModal>
)

export default UserFormModal
