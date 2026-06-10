import React from 'react'
import { CAlert } from '@coreui/react'
import TableFilters from 'src/components/TableFilters'
import DataTableFooter from 'src/components/DataTableFooter'
import UserListTable from 'src/components/users/UserListTable'
import UserListCards from 'src/components/users/UserListCards'
import UserBulkActionsBar from 'src/components/users/UserBulkActionsBar'

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
}) => (
  <>
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

    <TableFilters
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search name or email"
      rowClassName="flex-md-nowrap"
      searchColMd={3}
      periodColMd={2}
      filterColMd={2}
      clearColMd="auto"
      periodValue={period}
      onPeriodChange={onPeriodChange}
      filters={[
        {
          key: 'sort',
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
          value: roleFilter,
          onChange: setRoleFilter,
          options: [
            { value: 'All', label: 'All roles' },
            ...roles.map((r) => ({ value: r, label: r })),
          ],
        },
        {
          key: 'status',
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
    />

    {error && <CAlert color="danger">{error}</CAlert>}

    {!error && (
      <>
        <div className="d-none d-md-block">
          <UserListTable
            users={visibleUsers}
            onRowClick={goProfile}
            onToggleSort={toggleSort}
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
            isLoading={loading}
          />
        </div>

        <div className="d-md-none">
          <UserListCards
            users={visibleUsers}
            onRowClick={goProfile}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
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
            isLoading={loading}
          />
        </div>

        <DataTableFooter
          rowsToShow={rowsToShow}
          onRowsToShowChange={setRowsToShow}
          filteredCount={filteredCount}
          totalCount={totalCount}
        />
      </>
    )}
  </>
)

export default UserManagementTableSection
