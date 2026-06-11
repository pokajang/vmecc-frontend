import React from 'react'
import RowActions from 'src/components/RowActions'

const UserRowActions = ({
  user,
  isSelf,
  onExportXlsx,
  exportDisabled,
  onRestore,
  onToggleStatus,
  onChangeRole,
  onResetPassword,
  onDeleteUser,
  onDeletePermanently,
  onLockUser,
  onUnlockUser,
}) => {
  if (!user) return null
  const isSelfUser = typeof isSelf === 'function' ? isSelf(user) : false
  const items = [
    typeof onExportXlsx === 'function' && {
      key: 'export-csv',
      label: 'Export CSV',
      onClick: () => onExportXlsx(user),
      disabled: exportDisabled,
    },
    user.deleted_at && typeof onRestore === 'function'
      ? {
          key: 'restore',
          label: 'Restore',
          onClick: () => onRestore(user),
        }
      : typeof onToggleStatus === 'function'
        ? {
            key: 'toggle-status',
            label: user.status === 'Active' ? 'Deactivate' : 'Activate',
            onClick: () => onToggleStatus(user),
            disabled: isSelfUser,
          }
        : null,
    user.deleted_at &&
      typeof onDeletePermanently === 'function' && {
        key: 'delete-user-permanently',
        label: 'Delete permanently',
        onClick: () => onDeletePermanently(user),
        className: 'text-danger',
        disabled: isSelfUser,
      },
    !user.deleted_at &&
      typeof onResetPassword === 'function' && {
        key: 'reset-password',
        label: 'Reset password',
        onClick: () => onResetPassword(user),
        disabled: isSelfUser,
      },
    !user.deleted_at &&
      typeof onChangeRole === 'function' && {
        key: 'change-role',
        label: 'Manage roles',
        onClick: () => onChangeRole(user),
        disabled: isSelfUser,
      },
    !user.deleted_at &&
      typeof onDeleteUser === 'function' && {
        key: 'delete-user',
        label: 'Delete user',
        onClick: () => onDeleteUser(user),
        className: 'text-danger',
        disabled: isSelfUser,
      },
    !user.deleted_at &&
      user.locked_at &&
      typeof onUnlockUser === 'function' && {
        key: 'unlock-account',
        label: 'Unlock account',
        onClick: () => onUnlockUser(user),
        disabled: isSelfUser,
      },
    !user.deleted_at &&
      !user.locked_at &&
      typeof onLockUser === 'function' && {
        key: 'lock-account',
        label: 'Lock account',
        onClick: () => onLockUser(user),
        className: 'text-danger',
        disabled: isSelfUser,
      },
  ].filter(Boolean)

  return <RowActions items={items} />
}

export default UserRowActions
