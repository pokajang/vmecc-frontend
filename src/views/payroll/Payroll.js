import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CAlert, CContainer, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react'
import { useSelector } from 'react-redux'
import { hasPermission } from 'src/utils/authz'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ExpenseOtherClaimForm from 'src/views/payroll/components/claim-form/ExpenseOtherClaimForm'
import ClaimTypeSelection from 'src/views/payroll/components/claim-form/ClaimTypeSelection'
import SalaryClaimForm from 'src/views/payroll/components/claim-form/SalaryClaimForm'
import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import ClaimActionModals from './components/ClaimActionModals'
import ClaimDetailSection from './components/ClaimDetailSection'
import ClaimsSection from './components/ClaimsSection'
import PayrollNav from './components/PayrollNav'
import PayslipsSection from './components/PayslipsSection'
import { CLAIM_TYPE_META, CLAIM_TYPE_ROUTES, claimSortOptions } from './payrollConstants'
import { canEditClaimRecord, formatCurrency, formatDate, resolvePeriodValue } from './payrollUtils'
import usePayrollClaimsData from './hooks/usePayrollClaimsData'
import usePayrollClaimSelection from './hooks/usePayrollClaimSelection'
import usePayrollClaimActions from './hooks/usePayrollClaimActions'

const resolveActiveSection = (pathname) => {
  if (pathname === '/payroll/claims/new') return 'new-claim-select'
  if (pathname === CLAIM_TYPE_ROUTES.expense) return 'new-claim-expense'
  if (pathname === CLAIM_TYPE_ROUTES.salary) return 'new-claim-salary'
  if (pathname.startsWith('/payroll/claims/')) return 'claim-detail'
  if (pathname.startsWith('/payroll/claims')) return 'claims'
  if (pathname === '/payroll/payslips') return 'payslips'
  return 'claims'
}

const Payroll = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { claimId } = useParams()
  const user = useSelector((state) => state.authUser)
  const canUsePayroll = hasPermission(user, 'self.payroll')
  const overtimeEligibility = useOvertimeEligibility({ enabled: canUsePayroll })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('submittedAt:desc')

  const toaster = useRef()
  const [toast, addToast] = useState(0)
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

  const activeSection = resolveActiveSection(location.pathname)

  const {
    selectedClaimType,
    setSelectedClaimType,
    claimPeriod,
    setClaimPeriod,
    claimPeriodConfirmed,
    setClaimPeriodConfirmed,
    claimDraftPayload,
    setClaimDraftPayload,
    claimTypeLockedForSelection,
    isDraftSelectionMode,
    continueNewClaim,
    navigateClaimType,
    editClaimType,
    cancelClaimSelectionEdit,
  } = usePayrollClaimSelection({
    activeSection,
    navigate,
  })

  const {
    claimRecords,
    draftEntriesById,
    isClaimsLoading,
    claimsError,
    payslipRows,
    isPayslipsLoading,
    payslipsError,
    filteredClaims,
    rowsToShow,
    setRowsToShow,
    visibleClaims,
    selectedClaim,
    selectedClaimTypeMeta,
    submittedClaimItems,
    salaryDetailSummary,
    submittedClaimTotalValue,
    categoryOptions,
    statusOptions,
    refreshClaimRows,
    downloadPayslip,
  } = usePayrollClaimsData({
    userId: user?.id,
    activeSection,
    claimId,
    search,
    statusFilter,
    categoryFilter,
    period,
    sort,
    pushToast,
  })

  const {
    cancelTarget,
    cancelModalVisible,
    deleteTarget,
    deleteModalVisible,
    deleteBlockedTarget,
    deleteBlockedModalVisible,
    openClaim,
    downloadAttachment,
    downloadClaimPackage,
    editSubmittedClaim,
    cancelClaim,
    confirmCancel,
    deleteClaim,
    confirmDelete,
    closeCancelModal,
    closeDeleteModal,
    closeDeleteBlockedModal,
  } = usePayrollClaimActions({
    userId: user?.id,
    claimId,
    draftEntriesById,
    navigate,
    refreshClaimRows,
    pushToast,
    setClaimDraftPayload,
    setSelectedClaimType,
    setClaimPeriod,
    setClaimPeriodConfirmed,
  })

  const canEditSubmittedClaim =
    canEditClaimRecord(selectedClaim) && selectedClaim?.actionPermissions?.edit?.enabled !== false
  const submittedTotalLabel =
    selectedClaimTypeMeta.label === 'Salary Claim'
      ? 'Total Salary Claim Amount'
      : 'Total Claim Amount'
  const lastUpdatedByLabel =
    selectedClaim?.updatedByName ||
    selectedClaim?.updatedBy ||
    selectedClaim?.submittedByName ||
    selectedClaim?.submittedBy ||
    '-'
  const approvedDateLabel = selectedClaim?.approvedAt
    ? formatDate(selectedClaim.approvedAt)
    : selectedClaim?.approvedDate
      ? formatDate(selectedClaim.approvedDate)
      : '-'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCategoryFilter('All')
    setPeriod('all')
    setSort('submittedAt:desc')
  }

  const expenseDraftPayload =
    claimDraftPayload && ['expense', 'other'].includes(claimDraftPayload.type)
      ? claimDraftPayload
      : null
  const salaryDraftPayload = claimDraftPayload?.type === 'salary' ? claimDraftPayload : null
  const salaryPeriodLocks = useMemo(() => {
    const locks = {}
    const exemptClaimId = String(claimDraftPayload?.sourceClaimId || '').trim()
    claimRecords.forEach((claim) => {
      if (String(claim?.type || '').trim() !== 'salary') return
      if (Boolean(claim?.isDraft)) return
      if (String(claim?.status || '').trim() === 'Cancelled') return
      const claimId = String(claim?.id || '').trim()
      if (exemptClaimId && claimId === exemptClaimId) return
      const periodValueResolved = resolvePeriodValue(claim)
      if (!/^\d{4}-\d{2}$/.test(periodValueResolved)) return
      const status = String(claim?.status || '').trim()
      const reason = `Already claimed (${claimId || 'Existing claim'}${status ? ` • ${status}` : ''})`
      const existing = locks[periodValueResolved]
      if (!existing) {
        locks[periodValueResolved] = reason
        return
      }
      const existingClaimId =
        String(existing)
          .match(/\(([^•\)]+)/)?.[1]
          ?.trim() || ''
      if (!existingClaimId && claimId) {
        locks[periodValueResolved] = reason
      }
    })
    return locks
  }, [claimDraftPayload?.sourceClaimId, claimRecords])

  const claimDetailProps = useMemo(
    () => ({
      selectedClaim,
      selectedClaimTypeMeta: selectedClaimTypeMeta || CLAIM_TYPE_META.expense,
      submittedClaimItems,
      submittedTotalLabel,
      submittedClaimTotalValue,
      salaryDetailSummary,
      formatCurrency,
      formatDate,
      canEditSubmittedClaim,
      lastUpdatedByLabel,
      approvedDateLabel,
      onDownloadClaim: downloadClaimPackage,
      onEditClaim: editSubmittedClaim,
    }),
    [
      approvedDateLabel,
      canEditSubmittedClaim,
      downloadClaimPackage,
      editSubmittedClaim,
      lastUpdatedByLabel,
      salaryDetailSummary,
      selectedClaim,
      selectedClaimTypeMeta,
      submittedClaimItems,
      submittedClaimTotalValue,
      submittedTotalLabel,
    ],
  )

  if (!canUsePayroll) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to payroll management.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <PayrollNav activeSection={activeSection} onNavigate={navigate} />
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <ClaimActionModals
        cancelModalVisible={cancelModalVisible}
        cancelTarget={cancelTarget}
        onCancelClose={closeCancelModal}
        onCancelConfirm={confirmCancel}
        deleteModalVisible={deleteModalVisible}
        deleteTarget={deleteTarget}
        onDeleteClose={closeDeleteModal}
        onDeleteConfirm={confirmDelete}
        deleteBlockedModalVisible={deleteBlockedModalVisible}
        deleteBlockedTarget={deleteBlockedTarget}
        onDeleteBlockedClose={closeDeleteBlockedModal}
      />

      {!user ? (
        <div className="my-4 text-danger">Unable to load payroll. Please sign in again.</div>
      ) : (
        <>
          {activeSection === 'claims' && (
            <ClaimsSection
              search={search}
              onSearchChange={setSearch}
              period={period}
              onPeriodChange={setPeriod}
              sort={sort}
              onSortChange={setSort}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={clearFilters}
              claimSortOptions={claimSortOptions}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              filteredClaims={filteredClaims}
              visibleClaims={visibleClaims}
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              totalCount={claimRecords.length}
              onOpenClaim={openClaim}
              onEditClaim={editSubmittedClaim}
              onCancelClaim={cancelClaim}
              onDownloadAttachment={downloadAttachment}
              onDeleteClaim={deleteClaim}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onCreateClaim={() => navigate('/payroll/claims/new')}
              isLoading={isClaimsLoading}
              errorMessage={claimsError}
              onRetry={refreshClaimRows}
              groupByPeriod={sort.split(':')[0] !== 'amount'}
            />
          )}

          {activeSection === 'claim-detail' && <ClaimDetailSection {...claimDetailProps} />}

          {activeSection === 'new-claim-select' && (
            <ClaimTypeSelection
              selectedType={selectedClaimType}
              onSelect={setSelectedClaimType}
              onContinue={continueNewClaim}
              onBack={() => navigate('/payroll')}
              onCancelEdit={isDraftSelectionMode ? cancelClaimSelectionEdit : undefined}
              periodValue={claimPeriod}
              onPeriodChange={setClaimPeriod}
              typeLocked={claimTypeLockedForSelection}
              salaryPeriodLocks={salaryPeriodLocks}
              backLabel="Back to claims"
              continueLabel={isDraftSelectionMode ? 'Update' : 'Continue'}
            />
          )}

          {activeSection === 'new-claim-expense' && (
            <ExpenseOtherClaimForm
              user={user}
              claimType={selectedClaimType}
              onBack={() => navigate('/payroll')}
              onChangeType={navigateClaimType}
              onEditType={editClaimType}
              periodValue={claimPeriod}
              periodConfirmed={claimPeriodConfirmed}
              onPeriodChange={setClaimPeriod}
              onPeriodConfirmedChange={setClaimPeriodConfirmed}
              draftPayload={expenseDraftPayload}
            />
          )}

          {activeSection === 'new-claim-salary' && (
            <SalaryClaimForm
              user={user}
              claimType={selectedClaimType}
              onBack={() => navigate('/payroll')}
              onChangeType={navigateClaimType}
              onEditType={editClaimType}
              periodValue={claimPeriod}
              periodConfirmed={claimPeriodConfirmed}
              onPeriodChange={setClaimPeriod}
              onPeriodConfirmedChange={setClaimPeriodConfirmed}
              draftPayload={salaryDraftPayload}
              overtimeEligibility={overtimeEligibility}
            />
          )}

          {activeSection === 'payslips' && (
            <PayslipsSection
              rows={payslipRows}
              isLoading={isPayslipsLoading}
              errorMessage={payslipsError}
              onDownloadPayslip={downloadPayslip}
              formatCurrency={formatCurrency}
            />
          )}
        </>
      )}
    </CContainer>
  )
}

export default Payroll
