import {
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import UserRowActions from 'src/components/users/UserRowActions'
import TableLoader from 'src/components/TableLoader'
import { EMPTY, formatLastLogin, formatRoles } from 'src/utils/users'

const UserListTable = ({
  users,
  onRowClick,
  onToggleSort,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
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
  <div className="rounded-3 shadow-sm overflow-hidden bg-white">
    <CTable align="middle" className="mb-0" hover responsive>
      <CTableHead color="light">
        <CTableRow>
          <CTableHeaderCell className="text-center" style={{ width: '44px' }}>
            <CFormCheck
              checked={users.length > 0 && users.every((u) => selectedIds.includes(u.id))}
              onChange={(e) => onToggleSelectAll?.(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </CTableHeaderCell>
          <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
            #
          </CTableHeaderCell>
          <CTableHeaderCell>Name</CTableHeaderCell>
          <CTableHeaderCell>Email</CTableHeaderCell>
          <CTableHeaderCell>Roles</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          <CTableHeaderCell role="button" onClick={() => onToggleSort('last_login_at')}>
            Last login
          </CTableHeaderCell>
          <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {isLoading ? (
          <CTableRow>
            <CTableDataCell colSpan={8} className="p-0 border-0">
              <TableLoader />
            </CTableDataCell>
          </CTableRow>
        ) : users.map((user, idx) => (
          <CTableRow
            key={user.id}
            role="button"
            className="cursor-pointer"
            onClick={() => onRowClick(user)}
          >
            <CTableDataCell className="text-center">
              <CFormCheck
                checked={selectedIds.includes(user.id)}
                onChange={() => onToggleSelect?.(user)}
                onClick={(e) => e.stopPropagation()}
              />
            </CTableDataCell>
            <CTableDataCell className="text-center text-muted">{idx + 1}</CTableDataCell>
            <CTableDataCell>{user.name || EMPTY}</CTableDataCell>
            <CTableDataCell className="text-break">{user.email || EMPTY}</CTableDataCell>
            <CTableDataCell>{formatRoles(user.roles)}</CTableDataCell>
            <CTableDataCell>
              {user.deleted_at ? 'Deleted' : user.locked_at ? 'Locked' : user.status || EMPTY}
            </CTableDataCell>
            <CTableDataCell>{formatLastLogin(user.last_login_at)}</CTableDataCell>
            <CTableDataCell className="text-center align-middle">
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
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  </div>
)

export default UserListTable
