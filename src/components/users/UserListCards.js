import { CCard, CCardBody, CFormCheck } from '@coreui/react'
import UserRowActions from 'src/components/users/UserRowActions'
import TableLoader from 'src/components/TableLoader'
import { EMPTY, formatLastLogin, formatRoles } from 'src/utils/users'

const UserListCards = ({
  users,
  onRowClick,
  selectedIds = [],
  onToggleSelect,
  isSelf,
  onExportXlsx,
  exportDisabledIds = [],
  onRestore,
  onToggleStatus,
  onChangeRole,
  onResetPassword,
  onDeleteUser,
  onDeletePermanently,
  onLockUser,
  onUnlockUser,
  isLoading = false,
}) => (
  <>
    {isLoading ? (
      <TableLoader />
    ) : (
      users.map((user) => (
        <CCard
          key={user.id}
          className="mb-3 cursor-pointer"
          role="button"
          onClick={() => onRowClick(user)}
        >
          <CCardBody className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <CFormCheck
                  checked={selectedIds.includes(user.id)}
                  onChange={() => onToggleSelect?.(user)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="fw-semibold">{user.name || EMPTY}</div>
              </div>
              <div className="text-muted small text-break">{user.email || EMPTY}</div>
              <div className="text-muted small">{formatRoles(user.roles)}</div>
              <div className="text-muted small">
                {user.deleted_at ? 'Deleted' : user.locked_at ? 'Locked' : user.status || EMPTY}
              </div>
              <div className="text-muted small">{formatLastLogin(user.last_login_at)}</div>
            </div>
            <UserRowActions
              user={user}
              isSelf={isSelf}
              onExportXlsx={onExportXlsx}
              exportDisabled={exportDisabledIds.includes(user.id)}
              onRestore={onRestore}
              onToggleStatus={onToggleStatus}
              onChangeRole={onChangeRole}
              onResetPassword={onResetPassword}
              onDeleteUser={onDeleteUser}
              onDeletePermanently={onDeletePermanently}
              onLockUser={onLockUser}
              onUnlockUser={onUnlockUser}
            />
          </CCardBody>
        </CCard>
      ))
    )}
  </>
)

export default UserListCards
