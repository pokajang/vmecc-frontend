import React from 'react'
import UserConfirmModal from 'src/components/users/UserConfirmModal'
import UserRoleModal from 'src/components/users/UserRoleModal'
const UserActionModals = ({
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
  confirmResetOpen,
  onConfirmReset,
  onCloseReset,
  confirmDeleteOpen,
  onConfirmDelete,
  onCloseDelete,
  confirmPermanentDeleteOpen,
  onConfirmPermanentDelete,
  onClosePermanentDelete,
  confirmDeactivateOpen,
  onConfirmDeactivate,
  onCloseDeactivate,
  confirmActivateOpen,
  onConfirmActivate,
  onCloseActivate,
  confirmLockOpen,
  onConfirmLock,
  onCloseLock,
  confirmUnlockOpen,
  onConfirmUnlock,
  onCloseUnlock,
  confirmRestoreOpen,
  onConfirmRestore,
  onCloseRestore,
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
      visible={confirmResetOpen}
      title="Reset Password"
      message={`Send a password reset link to ${actionUser?.email || 'this user'}?`}
      confirmLabel="Send reset link"
      confirmColor="primary"
      onConfirm={onConfirmReset}
      onClose={onCloseReset}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmDeleteOpen}
      title="Delete User"
      message={`This will disable access for ${actionUser?.name || 'this user'}. You can restore later.`}
      confirmLabel="Delete"
      confirmColor="danger"
      onConfirm={onConfirmDelete}
      onClose={onCloseDelete}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmPermanentDeleteOpen}
      title="Delete User Permanently"
      message={`This will permanently delete ${actionUser?.name || 'this user'} and cannot be undone.`}
      confirmLabel="Delete permanently"
      confirmColor="danger"
      onConfirm={onConfirmPermanentDelete}
      onClose={onClosePermanentDelete}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmDeactivateOpen}
      title="Deactivate User"
      message={`Are you sure you want to deactivate ${actionUser?.name || 'this user'} from the system? The user will be notified and will no longer be able to access the system.`}
      confirmLabel="Deactivate"
      confirmColor="danger"
      onConfirm={onConfirmDeactivate}
      onClose={onCloseDeactivate}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmActivateOpen}
      title="Activate User"
      message={`Are you sure you want to activate ${actionUser?.name || 'this user'} for the system? The user will be notified and will regain access to the system.`}
      confirmLabel="Activate"
      confirmColor="success"
      onConfirm={onConfirmActivate}
      onClose={onCloseActivate}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmLockOpen}
      title="Lock Account"
      message={`Lock access for ${actionUser?.name || 'this user'}? This will immediately revoke active sessions.`}
      confirmLabel="Lock account"
      confirmColor="danger"
      onConfirm={onConfirmLock}
      onClose={onCloseLock}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmUnlockOpen}
      title="Unlock Account"
      message={`Unlock access for ${actionUser?.name || 'this user'}? Failed login counters will be reset.`}
      confirmLabel="Unlock account"
      confirmColor="success"
      onConfirm={onConfirmUnlock}
      onClose={onCloseUnlock}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />

    <UserConfirmModal
      visible={confirmRestoreOpen}
      title="Restore User"
      message={`Restore access for ${actionUser?.name || 'this user'}?`}
      confirmLabel="Restore"
      confirmColor="success"
      onConfirm={onConfirmRestore}
      onClose={onCloseRestore}
      confirmDisabled={actionUpdating || !actionUser}
      cancelDisabled={actionUpdating}
    />
  </>
)

export default UserActionModals
