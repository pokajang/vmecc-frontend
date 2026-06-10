import React from 'react'
import UserConfirmModal from 'src/components/users/UserConfirmModal'
import UserRoleModal from 'src/components/users/UserRoleModal'
import StaffMessageModal from 'src/components/staff/StaffMessageModal'

const StaffActionModals = ({
  actionUser,
  actionUpdating,
  roleModalOpen,
  roleAssignments,
  teams,
  onAddAssignment,
  onRemoveAssignment,
  onChangeAssignment,
  onCloseRole,
  onConfirmRole,
  confirmTerminateOpen,
  onCloseTerminate,
  onConfirmTerminate,
  confirmRehireOpen,
  onCloseRehire,
  onConfirmRehire,
  messageModalOpen,
  messageBody,
  onMessageBodyChange,
  onCloseMessage,
  onSendMessage,
}) => (
  <>
    <UserRoleModal
      visible={roleModalOpen}
      roleAssignments={roleAssignments}
      teams={teams}
      onAddAssignment={onAddAssignment}
      onRemoveAssignment={onRemoveAssignment}
      onChangeAssignment={onChangeAssignment}
      onClose={onCloseRole}
      onConfirm={onConfirmRole}
      confirmDisabled={actionUpdating || !actionUser}
      loading={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmTerminateOpen}
      title="Terminate Staff"
      message={`Terminate ${actionUser?.name || 'this staff member'}? This will remove access and mark the staff as terminated.`}
      confirmLabel="Terminate"
      confirmColor="danger"
      onConfirm={onConfirmTerminate}
      onClose={onCloseTerminate}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmRehireOpen}
      title="Rehire Staff"
      message={`Rehire ${actionUser?.name || 'this staff member'} and restore system access?`}
      confirmLabel="Rehire"
      confirmColor="success"
      onConfirm={onConfirmRehire}
      onClose={onCloseRehire}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <StaffMessageModal
      visible={messageModalOpen}
      recipientName={actionUser?.name || ''}
      body={messageBody}
      onBodyChange={onMessageBodyChange}
      onClose={onCloseMessage}
      onSend={onSendMessage}
      sending={actionUpdating}
    />
  </>
)

export default StaffActionModals
