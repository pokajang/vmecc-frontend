import React from 'react'
import { CAlert, CFormCheck } from '@coreui/react'
import TableFilters from 'src/components/TableFilters'
import DataTableFooter from 'src/components/DataTableFooter'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import UserListTable from 'src/components/users/UserListTable'
import UserBulkActionsBar from 'src/components/users/UserBulkActionsBar'
import UserRowActions from 'src/components/users/UserRowActions'
import { EMPTY, formatLastLogin, formatRoles } from 'src/utils/users'

const UserManagementTableSection = ({
  selectedCount,
  bulkActionOptions,
  selectedBulkAction,
  bulkUpdating,
  onBulkActionChange,
  onOpenBulkConfirm,
  onClearSelection,
  search,
  onSearchChange,
  period,
  onPeriodChange,
  sort,
  setSort,
  sortOptions,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  roles,
  onClearFilters,
  error,
  visibleUsers,
  goProfile,
  toggleSort,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  isSelf,
  exportUserXlsx,
  exportingUserId,
  openRestoreModal,
  openStatusModal,
  openRoleModal,
  openResetModal,
  openDeleteModal,
  openPermanentDeleteModal,
  openLockModal,
  openUnlockModal,
  loading,
  rowsToShow,
  setRowsToShow,
  filteredCount,
  totalCount,
}) => {
  const mobileUserSections = [
    {
      key: 'users',
      items: visibleUsers.map((user) => ({
        key: user.id,
        title: user.name || EMPTY,
        eyebrow: user.email || EMPTY,
        subtitle: formatRoles(user.roles),
        status: user.deleted_at ? 'Deleted' : user.locked_at ? 'Locked' : user.status || EMPTY,
        ariaLabel: `Open user profile for ${user.name || user.email || user.id}`,
        onOpen: () => goProfile(user),
        fields: [
          { key: 'last-login', label: 'Last login', value: formatLastLogin(user.last_login_at) },
        ],
        actions: (
          <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
            <CFormCheck
              aria-label={`Select ${user.name || user.email || user.id}`}
              checked={selectedIds.includes(user.id)}
              onChange={() => toggleSelect?.(user)}
            />
            <UserRowActions
              user={user}
              isSelf={isSelf}
              onExportXlsx={exportUserXlsx}
              exportDisabled={exportingUserId === user.id}
              onRestore={openRestoreModal}
              onToggleStatus={openStatusModal}
              onChangeRole={openRoleModal}
              onResetPassword={openResetModal}
              onDeleteUser={openDeleteModal}
              onDeletePermanently={openPermanentDeleteModal}
              onLockUser={openLockModal}
              onUnlockUser={openUnlockModal}
            />
          </div>
        ),
      })),
    },
  ]

  return (
    <div data-testid="users-list">
      {selectedCount > 0 && (
        <UserBulkActionsBar
          selectedCount={selectedCount}
          actionOptions={bulkActionOptions}
          selectedAction={selectedBulkAction}
          disabled={bulkUpdating}
          onActionChange={onBulkActionChange}
          onApply={onOpenBulkConfirm}
          onClear={onClearSelection}
        />
      )}

      <div data-testid="users-filters">
        <TableFilters
          searchValue={search}
          onSearchChange={onSearchChange}
          searchLabel="Search users by name or email"
          searchPlaceholder="Search users"
          rowClassName="flex-md-nowrap align-items-md-end"
          searchColMd={3}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
          periodValue={period}
          onPeriodChange={onPeriodChange}
          filters={[
            {
              key: 'sort',
              label: 'Sort',
              value: `${sort.field}:${sort.dir}`,
              onChange: (value) => {
                const [field, dir] = value.split(':')
                if (!field || !dir) return
                setSort({ field, dir })
              },
              options: sortOptions,
            },
            {
              key: 'role',
              label: 'Role',
              value: roleFilter,
              onChange: setRoleFilter,
              options: [
                { value: 'All', label: 'All roles' },
                ...roles.map((r) => ({ value: r, label: r })),
              ],
            },
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'All', label: 'All status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Deleted', label: 'Deleted' },
              ],
            },
          ]}
          onClear={onClearFilters}
          showDesktopLabels
        />
      </div>

      {error && <CAlert color="danger">{error}</CAlert>}

      {!error && (
        <ResponsiveRecordCollection
          isLoading={loading}
          isEmpty={visibleUsers.length === 0}
          emptyMessage={
            <div className="text-body-secondary">No users match the current filters.</div>
          }
          mobileSections={mobileUserSections}
          mobileVariant="list-group"
          renderDesktop={() => (
            <div className="d-none d-md-block">
              <UserListTable
                users={visibleUsers}
                onRowClick={goProfile}
                onToggleSort={toggleSort}
                sort={sort}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                isSelf={isSelf}
                onExportXlsx={exportUserXlsx}
                exportDisabledIds={exportingUserId ? [exportingUserId] : []}
                onRestore={openRestoreModal}
                onToggleStatus={openStatusModal}
                onChangeRole={openRoleModal}
                onResetPassword={openResetModal}
                onDeleteUser={openDeleteModal}
                onDeletePermanently={openPermanentDeleteModal}
                onLockUser={openLockModal}
                onUnlockUser={openUnlockModal}
              />
            </div>
          )}
          footer={
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredCount}
              totalCount={totalCount}
            />
          }
        />
      )}
    </div>
  )
}

export default UserManagementTableSection
