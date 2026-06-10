import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { roles } from './CreateStaffForm'
import UserFormModal from 'src/components/users/UserFormModal'
import UserActionModals from 'src/components/users/UserActionModals'
import UserConfirmModal from 'src/components/users/UserConfirmModal'
import useTableRows from 'src/hooks/useTableRows'
import useUserFilters from 'src/hooks/useUserFilters'
import useUsers from 'src/hooks/useUsers'
import { toSlug } from 'src/utils/users'
import { hasPermission } from 'src/utils/authz'
import useFilteredUsers from './user-management/hooks/useFilteredUsers'
import useBulkUserActions from './user-management/hooks/useBulkUserActions'
import useUserExportActions from './user-management/hooks/useUserExportActions'
import UserManagementHeader from './user-management/components/UserManagementHeader'
import UserManagementTableSection from './user-management/components/UserManagementTableSection'

const toastColor = (type) => {
  if (type === 'danger') return 'danger'
  if (type === 'warning') return 'warning'
  if (type === 'success') return 'success'
  if (type === 'info') return 'info'
  return 'light'
}

const UserManagement = () => {
  const authUser = useSelector((state) => state.authUser)
  const isAdmin = useMemo(() => hasPermission(authUser, 'users.manage'), [authUser])
  const navigate = useNavigate()
  const [nowMs] = useState(() => Date.now())

  const {
    sortOptions,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    period,
    setPeriod,
    sort,
    setSort,
    toggleSort,
    clearFilters,
  } = useUserFilters(roles)

  const isSelf = useCallback(
    (user) =>
      String(authUser?.id || '') === String(user?.id || '') ||
      (authUser?.email && user?.email && authUser.email === user.email),
    [authUser],
  )

  const toaster = useRef()
  const [toast, addToast] = useState(null)

  const {
    users,
    loading,
    refreshing,
    error,
    form,
    roleAssignments,
    teams,
    submitStatus,
    statusMessage,
    showForm,
    actionUpdating,
    actionUser,
    confirmResetOpen,
    confirmDeleteOpen,
    confirmPermanentDeleteOpen,
    confirmRestoreOpen,
    confirmDeactivateOpen,
    confirmActivateOpen,
    confirmLockOpen,
    confirmUnlockOpen,
    roleModalOpen,
    roleModalAssignments,
    addRoleModalAssignment,
    removeRoleModalAssignment,
    changeRoleModalAssignment,
    bulkUpdating,
    handleChange,
    addRoleAssignment,
    removeRoleAssignment,
    changeRoleAssignment,
    handleSubmit,
    toggleForm,
    closeForm,
    cancelForm,
    openResetModal,
    openDeleteModal,
    openPermanentDeleteModal,
    openRestoreModal,
    openRoleModal,
    openStatusModal,
    openLockModal,
    openUnlockModal,
    closeResetModal,
    closeDeleteModal,
    closePermanentDeleteModal,
    closeRestoreModal,
    closeDeactivateModal,
    closeActivateModal,
    closeLockModal,
    closeUnlockModal,
    closeRoleModal,
    handleToggleStatus,
    handleRoleUpdate,
    handlePasswordReset,
    handleDeleteUser,
    handlePermanentDeleteUser,
    handleRestoreUser,
    handleLockUser,
    handleUnlockUser,
    bulkUpdateStatus,
    bulkDeleteUsers,
    bulkRestoreUsers,
    bulkDeleteUsersPermanently,
  } = useUsers({ isAdmin, roles, isSelf })

  const filtered = useFilteredUsers({
    users,
    search,
    roleFilter,
    statusFilter,
    period,
    sort,
    nowMs,
  })
  const { rowsToShow, setRowsToShow, visibleRows: visibleUsers } = useTableRows(filtered)

  const { exportingUserId, exportMessage, exportCsv, exportXlsx, exportUserXlsx } =
    useUserExportActions({ filtered })

  const {
    selectedIds,
    selectedCount,
    selectedBulkAction,
    setSelectedBulkAction,
    confirmBulkOpen,
    selectedBulkTargetCount,
    bulkConfirmConfig,
    bulkActionOptions,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    openBulkConfirm,
    closeBulkConfirm,
    handleConfirmBulkAction,
  } = useBulkUserActions({
    users,
    visibleUsers,
    bulkUpdateStatus,
    bulkDeleteUsers,
    bulkRestoreUsers,
    bulkDeleteUsersPermanently,
  })

  const goProfile = useCallback(
    (user) => {
      if (!user) return
      const slug = toSlug(user.name || user.email || 'user')
      navigate(`/admin/users/${user.id}/${slug}`)
    },
    [navigate],
  )

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  useEffect(() => {
    if (!statusMessage?.message) return
    const timer = setTimeout(() => {
      pushToast(statusMessage.message, {
        title: 'Users',
        color: toastColor(statusMessage.type),
        delay: statusMessage.type === 'danger' ? 10000 : 6000,
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [pushToast, statusMessage])

  useEffect(() => {
    if (!exportMessage?.message) return
    const timer = setTimeout(() => {
      pushToast(exportMessage.message, {
        title: 'Export',
        color: toastColor(exportMessage.type),
        delay: exportMessage.type === 'danger' ? 10000 : 6000,
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [exportMessage, pushToast])

  useEffect(() => {
    if (!(submitStatus.message && submitStatus.type === 'danger')) return
    const timer = setTimeout(() => {
      pushToast(submitStatus.message, {
        title: 'Create User Failed',
        color: 'danger',
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [pushToast, submitStatus.message, submitStatus.type])

  const handleConfirmDeactivate = useCallback(() => {
    closeDeactivateModal()
    if (actionUser) handleToggleStatus(actionUser)
  }, [actionUser, closeDeactivateModal, handleToggleStatus])

  const handleConfirmActivate = useCallback(() => {
    closeActivateModal()
    if (actionUser) handleToggleStatus(actionUser)
  }, [actionUser, closeActivateModal, handleToggleStatus])

  if (!isAdmin && !loading) {
    return (
      <CAlert color="warning" className="my-4">
        You do not have permission to manage users.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <UserManagementHeader
                refreshing={refreshing}
                showForm={showForm}
                submitStatus={submitStatus}
                onToggleForm={toggleForm}
                onExportCsv={exportCsv}
                onExportXlsx={exportXlsx}
                hasRows={filtered.length > 0}
              />
            </CCardHeader>
            <CCardBody>
              <UserManagementTableSection
                selectedCount={selectedCount}
                bulkActionOptions={bulkActionOptions}
                selectedBulkAction={selectedBulkAction}
                bulkUpdating={bulkUpdating}
                onBulkActionChange={setSelectedBulkAction}
                onOpenBulkConfirm={openBulkConfirm}
                onClearSelection={clearSelection}
                search={search}
                onSearchChange={setSearch}
                period={period}
                onPeriodChange={setPeriod}
                sort={sort}
                setSort={setSort}
                sortOptions={sortOptions}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                roles={roles}
                onClearFilters={clearFilters}
                error={error}
                visibleUsers={visibleUsers}
                goProfile={goProfile}
                toggleSort={toggleSort}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                isSelf={isSelf}
                exportUserXlsx={exportUserXlsx}
                exportingUserId={exportingUserId}
                openRestoreModal={openRestoreModal}
                openStatusModal={openStatusModal}
                openRoleModal={openRoleModal}
                openResetModal={openResetModal}
                openDeleteModal={openDeleteModal}
                openPermanentDeleteModal={openPermanentDeleteModal}
                openLockModal={openLockModal}
                openUnlockModal={openUnlockModal}
                loading={loading}
                rowsToShow={rowsToShow}
                setRowsToShow={setRowsToShow}
                filteredCount={filtered.length}
                totalCount={users.length}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <UserFormModal
        visible={showForm}
        form={form}
        roleAssignments={roleAssignments}
        teams={teams}
        submitStatus={submitStatus}
        onChange={handleChange}
        onAddAssignment={addRoleAssignment}
        onRemoveAssignment={removeRoleAssignment}
        onChangeAssignment={changeRoleAssignment}
        onSubmit={handleSubmit}
        onCancel={cancelForm}
        onClose={closeForm}
      />

      <UserActionModals
        actionUser={actionUser}
        actionUpdating={actionUpdating}
        roleModalOpen={roleModalOpen}
        roleAssignments={roleModalAssignments}
        teams={teams}
        onAddAssignment={addRoleModalAssignment}
        onRemoveAssignment={removeRoleModalAssignment}
        onChangeAssignment={changeRoleModalAssignment}
        onCloseRole={closeRoleModal}
        onConfirmRole={handleRoleUpdate}
        confirmResetOpen={confirmResetOpen}
        onConfirmReset={handlePasswordReset}
        onCloseReset={closeResetModal}
        confirmDeleteOpen={confirmDeleteOpen}
        onConfirmDelete={handleDeleteUser}
        onCloseDelete={closeDeleteModal}
        confirmPermanentDeleteOpen={confirmPermanentDeleteOpen}
        onConfirmPermanentDelete={handlePermanentDeleteUser}
        onClosePermanentDelete={closePermanentDeleteModal}
        confirmDeactivateOpen={confirmDeactivateOpen}
        onConfirmDeactivate={handleConfirmDeactivate}
        onCloseDeactivate={closeDeactivateModal}
        confirmActivateOpen={confirmActivateOpen}
        onConfirmActivate={handleConfirmActivate}
        onCloseActivate={closeActivateModal}
        confirmLockOpen={confirmLockOpen}
        onConfirmLock={handleLockUser}
        onCloseLock={closeLockModal}
        confirmUnlockOpen={confirmUnlockOpen}
        onConfirmUnlock={handleUnlockUser}
        onCloseUnlock={closeUnlockModal}
        confirmRestoreOpen={confirmRestoreOpen}
        onConfirmRestore={handleRestoreUser}
        onCloseRestore={closeRestoreModal}
      />

      <UserConfirmModal
        visible={confirmBulkOpen}
        title={bulkConfirmConfig.title}
        message={bulkConfirmConfig.message}
        confirmLabel={bulkConfirmConfig.confirmLabel}
        confirmColor={bulkConfirmConfig.confirmColor}
        onConfirm={handleConfirmBulkAction}
        onClose={closeBulkConfirm}
        confirmDisabled={bulkUpdating || selectedBulkTargetCount === 0}
        cancelDisabled={bulkUpdating}
      />
    </CContainer>
  )
}

export default UserManagement
