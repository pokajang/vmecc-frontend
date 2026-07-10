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
import RowActionCell from 'src/components/RowActionCell'
import { EMPTY, formatLastLogin, formatRoles } from 'src/utils/users'
import { activateOnEnterOrSpace } from 'src/utils/uiAccessibility'
import SortableTableHeader from 'src/components/SortableTableHeader'

const UserListTable = ({
  users,
  onRowClick,
  onToggleSort,
  sort = {},
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
}) => (
  <div className="rounded-3 shadow-sm overflow-hidden bg-body">
    <CTable align="middle" className="mb-0" hover responsive>
      <CTableHead color="light">
        <CTableRow>
          <CTableHeaderCell className="text-center" style={{ width: '44px' }}>
            <CFormCheck
              aria-label="Select all visible users"
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
          <SortableTableHeader field="last_login_at" sort={sort} onSort={onToggleSort}>
            Last login
          </SortableTableHeader>
          <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {users.map((user, idx) => (
          <CTableRow
            key={user.id}
            role="button"
            tabIndex={0}
            aria-label={`Open user profile for ${user.name || user.email || user.id} from table`}
            className="cursor-pointer"
            onClick={() => onRowClick(user)}
            onKeyDown={(event) => activateOnEnterOrSpace(event, () => onRowClick(user))}
          >
            <CTableDataCell className="text-center">
              <CFormCheck
                aria-label={`Select ${user.name || user.email || user.id}`}
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
            <RowActionCell className="text-center align-middle">
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
            </RowActionCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  </div>
)

export default UserListTable
