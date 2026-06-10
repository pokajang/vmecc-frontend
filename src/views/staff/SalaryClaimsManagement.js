import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CButton,
  CContainer,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { hasAnyPermission, hasPermission } from 'src/utils/authz'
import { SALARY_CLAIMS_ALLOWED_PERMISSIONS } from './leave-management/data'
import ErrorBoundary from 'src/components/ErrorBoundary'
import TableLoader from 'src/components/TableLoader'
import SalaryWorkflowActionModal from './components/SalaryWorkflowActionModal'
import ClaimDetailView from './salary-claims-management/components/ClaimDetailView'
import ClaimRecordsTab from './salary-claims-management/components/ClaimRecordsTab'
import SalaryRecordsTab from './salary-claims-management/components/SalaryRecordsTab'
import SalarySettingsTab from './salary-claims-management/components/SalarySettingsTab'
import OvertimeRateSettingsTab from './salary-claims-management/components/OvertimeRateSettingsTab'
import CompanyLegalInfoTab from './salary-claims-management/components/CompanyLegalInfoTab'
import SalaryWorkflowRules from '../settings/components/SalaryWorkflowRules'
import SalaryAssignmentFormPage from './salary-claims-management/components/SalaryAssignmentFormPage'
import SalaryClaimsTabsNav from './salary-claims-management/components/SalaryClaimsTabsNav'
import BulkClaimActionModal from './salary-claims-management/components/BulkClaimActionModal'
import AttachmentPreviewModal from './salary-claims-management/components/AttachmentPreviewModal'
import SalaryClaimPaymentModal from './salary-claims-management/components/SalaryClaimPaymentModal'
import { truncateAttachmentLabel } from './salary-claims-management/helpers/claimDetail'
import useSalaryClaimsPageState from './salary-claims-management/hooks/useSalaryClaimsPageState'
import useSalaryClaimsHydration from './salary-claims-management/hooks/useSalaryClaimsHydration'
import useSalaryClaimsDerived from './salary-claims-management/hooks/useSalaryClaimsDerived'
import useSalaryClaimsActions from './salary-claims-management/hooks/useSalaryClaimsActions'
import useSalaryClaimsViewModels from './salary-claims-management/hooks/useSalaryClaimsViewModels'
import { useGuardedNavigate, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import {
  WORKFLOW_DECLARATION_LABEL,
  assignmentSortOptions,
  claimSortOptions,
  deriveAssignmentLifecycleRows,
  formatDate,
  formatDateTime,
  formatMonth,
  parseAmount,
  salarySortOptions,
  toTypeLabel,
} from './salary-claims-management/utils'
import { ASSIGNMENT_DRAFT_STATUS, TAB_GROUP_BY_KEY } from './salary-claims-management/constants'

const SalaryClaimsManagement = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const guardedNavigate = useGuardedNavigate()
  const { registerGuard, unregisterGuard } = useNavigationGuard()
  const { claimId, assignmentId } = useParams()
  const user = useSelector((state) => state.authUser)
  const isHrUser = useMemo(() => hasAnyPermission(user, SALARY_CLAIMS_ALLOWED_PERMISSIONS), [user])
  const canManageSalaryPay = useMemo(
    () => hasPermission(user, 'staff.salary.pay') || hasPermission(user, 'system.admin'),
    [user],
  )
  const actorName = useMemo(
    () => user?.name || user?.full_name || user?.email || 'System user',
    [user?.name, user?.full_name, user?.email],
  )

  const isClaimDetailRoute =
    location.pathname.startsWith('/staff/salary-claims/') && Boolean(claimId)
  const isAssignmentCreateRoute =
    location.pathname === '/staff/set-salary/assignment/new' ||
    location.pathname === '/staff/salary-claims/assignment/new'
  const isAssignmentEditRoute =
    (location.pathname.startsWith('/staff/set-salary/assignment/') ||
      location.pathname.startsWith('/staff/salary-claims/assignment/')) &&
    location.pathname.endsWith('/edit') &&
    Boolean(assignmentId)
  const isAssignmentViewRoute =
    (location.pathname.startsWith('/staff/set-salary/assignment/') ||
      location.pathname.startsWith('/staff/salary-claims/assignment/')) &&
    location.pathname.endsWith('/view') &&
    Boolean(assignmentId)
  const isAssignmentFormRoute =
    isAssignmentCreateRoute || isAssignmentEditRoute || isAssignmentViewRoute

  const toaster = useRef()
  const assignmentRouteInitRef = useRef('')
  const [toast, addToast] = useState(null)

  const pushToast = useCallback(
    (message, { title, color = 'light', delay = 6000 } = {}) => {
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
    },
    [addToast],
  )

  const hydration = useSalaryClaimsHydration({ user, isHrUser, pushToast })
  const combinedAssignmentRows = useMemo(
    () =>
      deriveAssignmentLifecycleRows([
        ...(hydration.assignmentDraftRows || []).map((draftRow) => {
          const data =
            draftRow?.draftData && typeof draftRow.draftData === 'object' ? draftRow.draftData : {}
          return {
            id: draftRow.id,
            name: draftRow.name,
            status: 'Draft',
            savedAt: draftRow.savedAt,
            updatedAt: draftRow.updatedAt || draftRow.savedAt,
            updatedBy: draftRow.updatedBy,
            sourceAssignmentId: draftRow.sourceAssignmentId,
            employeeId: data.employeeId || '',
            employee: data.employee || '',
            avatarUrl: data.avatarUrl || '',
            email: data.email || '',
            icNumber: data.icNumber || '',
            phone: data.phone || '',
            team: data.team || 'Unassigned',
            effectiveFrom: data.effectiveFrom || '',
            basicSalary: data.basicSalary || 0,
            allowances: Array.isArray(data.allowances) ? data.allowances : [],
            allowanceTotal: data.allowanceTotal || 0,
            fixedAllowances: data.fixedAllowances || 0,
            employeeContributions: data.employeeContributions || { epf: 0, perkeso: 0, sip: 0 },
            employerContributions: data.employerContributions || { epf: 0, perkeso: 0, sip: 0 },
            epf: data.epf || 0,
            perkeso: data.perkeso || 0,
            sip: data.sip || 0,
            notesHistory: Array.isArray(data.notesHistory) ? data.notesHistory : [],
            notes: data.notes || '',
            notesUpdatedAt: data.notesUpdatedAt || '',
            notesUpdatedBy: data.notesUpdatedBy || '',
          }
        }),
        ...(hydration.assignmentRows || []),
      ]),
    [hydration.assignmentDraftRows, hydration.assignmentRows],
  )

  const pageState = useSalaryClaimsPageState({
    location,
    navigate: guardedNavigate,
    isClaimDetailRoute,
  })
  const tabNavGroup = TAB_GROUP_BY_KEY[pageState.activeTab || pageState.tab] ?? null

  const derived = useSalaryClaimsDerived({
    user,
    tab: pageState.tab,
    claimId,
    claimRows: hydration.claimRows,
    allOvertimeRecords: hydration.allOvertimeRecords,
    staffDirectory: hydration.staffDirectory,
    assignmentRows: combinedAssignmentRows,
    selectedClaimKeys: pageState.selectedClaimKeys,
    selectedClaimItemId: pageState.selectedClaimItemId,
  })

  const actions = useSalaryClaimsActions({
    user,
    actorName,
    navigate: guardedNavigate,
    navigateRaw: navigate,
    tab: pageState.tab,
    visibleRows: derived.visibleRows,
    detailReturnTab: pageState.detailReturnTab,
    salaryWorkflowRule: hydration.salaryWorkflowRule,
    setClaimRows: hydration.setClaimRows,
    hydrateClaims: hydration.hydrateClaims,
    hydrateOvertime: hydration.hydrateOvertime,
    selectedClaim: derived.selectedClaim,
    selectedClaims: derived.selectedClaims,
    setSelectedClaimKeys: pageState.setSelectedClaimKeys,
    getClaimKey: derived.getClaimKey,
    selectedClaimItemId: pageState.selectedClaimItemId,
    setSelectedClaimItemId: pageState.setSelectedClaimItemId,
    isItemDetailsVisible: pageState.isItemDetailsVisible,
    setIsItemDetailsVisible: pageState.setIsItemDetailsVisible,
    closeItemDetails: pageState.closeItemDetails,
    selectClaimItem: pageState.selectClaimItem,
    submittedClaimItems: derived.submittedClaimItems,
    openAttachmentPreview: pageState.openAttachmentPreview,
    closeBulkActionModal: pageState.closeBulkActionModal,
    bulkActionModal: pageState.bulkActionModal,
    bulkRemarks: pageState.bulkRemarks,
    bulkDeclarationChecked: pageState.bulkDeclarationChecked,
    setBulkRejectError: pageState.setBulkRejectError,
    setBulkDeclarationError: pageState.setBulkDeclarationError,
    normalizedUserRoles: derived.normalizedUserRoles,
    isSystemAdmin: derived.isSystemAdmin,
    getOvertimeApplicantRolesForRecord: derived.getOvertimeApplicantRolesForRecord,
    pushToast,
    setAssignmentDraft: hydration.setAssignmentDraft,
    saveAssignmentAsDraft: hydration.saveAssignmentAsDraft,
    setSalaryAssignment: hydration.setSalaryAssignment,
    staffOptions: derived.staffOptions,
    closeAssignmentModal: hydration.closeAssignmentModal,
    openSavedAssignmentDraft: hydration.openSavedAssignmentDraft,
    removeAssignmentDraft: hydration.removeAssignmentDraft,
    removeAssignmentRow: hydration.removeAssignmentRow,
    canManageSalaryPay,
  })
  const { assignmentRows, openCreateAssignment, openEditAssignment, openSavedAssignmentDraft } =
    hydration

  useEffect(() => {
    if (!isAssignmentFormRoute) {
      assignmentRouteInitRef.current = ''
      return
    }
    const routeKey = location.pathname
    if (assignmentRouteInitRef.current === routeKey) return
    if (isAssignmentCreateRoute) {
      const routeState = location.state && typeof location.state === 'object' ? location.state : {}
      const draftIdFromState = String(routeState?.draftId || '').trim()
      const resumed = draftIdFromState ? openSavedAssignmentDraft(draftIdFromState) : false
      if (!resumed) openCreateAssignment()
      assignmentRouteInitRef.current = routeKey
      return
    }
    if (isAssignmentEditRoute || isAssignmentViewRoute) {
      const matched = assignmentRows.find((row) => String(row?.id || '') === assignmentId)
      if (matched) {
        openEditAssignment(matched)
        assignmentRouteInitRef.current = routeKey
      }
    }
  }, [
    assignmentId,
    assignmentRows,
    openCreateAssignment,
    openEditAssignment,
    isAssignmentFormRoute,
    isAssignmentCreateRoute,
    isAssignmentEditRoute,
    isAssignmentViewRoute,
    location.pathname,
    location.state,
    openSavedAssignmentDraft,
  ])

  useEffect(() => {
    const guardId = 'salary-claims:ot-rates-unsaved'
    const isActive =
      !isClaimDetailRoute &&
      !isAssignmentFormRoute &&
      pageState.tab === 'otRates' &&
      Boolean(hydration.otRateDirty)

    registerGuard(guardId, {
      active: isActive,
      message: 'You have unsaved OT settings changes. Leave this page and discard them?',
    })

    return () => {
      unregisterGuard(guardId)
    }
  }, [
    hydration.otRateDirty,
    isAssignmentFormRoute,
    isClaimDetailRoute,
    pageState.tab,
    registerGuard,
    unregisterGuard,
  ])

  const {
    claimDetailVm,
    claimDetailHandlers,
    claimRecordsVm,
    claimRecordsHandlers,
    salaryRecordsVm,
    salaryRecordsHandlers,
    assignmentTabVm,
    assignmentTabHandlers,
    overtimeRatesVm,
    overtimeRatesHandlers,
  } = useSalaryClaimsViewModels({
    selectedClaimKeys: pageState.selectedClaimKeys,
    setSelectedClaimKeys: pageState.setSelectedClaimKeys,
    selectedClaim: derived.selectedClaim,
    selectedClaimTypeMeta: derived.selectedClaimTypeMeta,
    statusColorMap: derived.statusColorMap,
    submittedClaimItems: derived.submittedClaimItems,
    selectedClaimItem: derived.selectedClaimItem,
    isItemDetailsVisible: pageState.isItemDetailsVisible,
    selectedClaimItemDetails: derived.selectedClaimItemDetails,
    submittedTotalLabel: derived.submittedTotalLabel,
    submittedDisplayTotal: derived.submittedDisplayTotal,
    claimHistoryEntries: derived.claimHistoryEntries,
    claimWorkflowState: actions.claimWorkflowState,
    selectedClaimActions: actions.selectedClaimActions,
    truncateAttachmentLabel,
    formatDate,
    formatDateTime,
    formatCurrency: actions.formatCurrency,
    backToClaimsPage: actions.backToClaimsPage,
    selectClaimItem: actions.selectClaimItem,
    closeItemDetails: actions.closeItemDetails,
    openAttachmentPreview: actions.openAttachmentPreview,
    triggerClaimAction: actions.triggerClaimAction,
    renderItemDetailsField: actions.renderItemDetailsField,
    search: derived.search,
    period: derived.period,
    sort: derived.sort,
    typeFilter: derived.typeFilter,
    statusFilter: derived.statusFilter,
    claimSortOptions,
    claimTypeOptions: derived.claimTypeOptions,
    claimStatusOptions: derived.claimStatusOptions,
    filteredClaimRows: derived.filteredClaimRows,
    groupedVisibleClaimRows: derived.groupedVisibleClaimRows,
    rowsToShow: derived.rowsToShow,
    claimRowsCount: hydration.claimRows.length,
    isClaimsLoading: hydration.isClaimsLoading,
    toTypeLabel,
    setSearch: derived.setSearch,
    setPeriod: derived.setPeriod,
    setSort: derived.setSort,
    setTypeFilter: derived.setTypeFilter,
    setStatusFilter: derived.setStatusFilter,
    clearClaimFilters: derived.clearClaimFilters,
    openBulkActionModal: pageState.openBulkActionModal,
    openBulkPaymentModal: actions.openBulkPaymentModal,
    canBulkActOnClaim: actions.canBulkActOnClaim,
    canBulkActOnSalaryClaim: actions.canBulkActOnSalaryClaim,
    getClaimKey: derived.getClaimKey,
    toggleClaimGroupSelection: actions.toggleClaimGroupSelection,
    toggleSalaryGroupSelection: actions.toggleSalaryGroupSelection,
    openClaimDetail: actions.openClaimDetail,
    buildClaimRowActionItems: actions.buildClaimRowActionItems,
    setRowsToShow: derived.setRowsToShow,
    salarySearch: derived.salarySearch,
    salaryPeriod: derived.salaryPeriod,
    salarySort: derived.salarySort,
    salaryStatusFilter: derived.salaryStatusFilter,
    salarySortOptions,
    salaryStatusOptions: derived.salaryStatusOptions,
    filteredSalaryRows: derived.filteredSalaryRows,
    groupedVisibleSalaryRows: derived.groupedVisibleSalaryRows,
    salaryRowsToShow: derived.salaryRowsToShow,
    salaryTotalCount: hydration.claimRows.filter((row) => row.type === 'salary').length,
    parseAmount,
    getSalaryAdjustmentsTotal: derived.getSalaryAdjustmentsTotalForRow,
    getSalaryProjectedNet: derived.getSalaryProjectedNetForRow,
    setSalarySearch: derived.setSalarySearch,
    setSalaryPeriod: derived.setSalaryPeriod,
    setSalarySort: derived.setSalarySort,
    setSalaryStatusFilter: derived.setSalaryStatusFilter,
    clearSalaryFilters: derived.clearSalaryFilters,
    setSalaryRowsToShow: derived.setSalaryRowsToShow,
    assignmentSearch: derived.assignmentSearch,
    assignmentSort: derived.assignmentSort,
    assignmentSortOptions,
    assignmentTeamFilter: derived.assignmentTeamFilter,
    assignmentTeamOptions: derived.assignmentTeamOptions,
    filteredAssignmentRows: derived.filteredAssignmentRows,
    groupedVisibleAssignmentRows: derived.groupedVisibleAssignmentRows,
    assignmentRowsToShow: derived.assignmentRowsToShow,
    assignmentHistory: hydration.assignmentHistory,
    isAssignmentsLoading: hydration.isAssignmentsLoading,
    assignmentLoadError: hydration.assignmentLoadError,
    assignmentTotalCount: combinedAssignmentRows.length,
    formatMonth,
    getAssignmentNetAssigned: derived.getAssignmentNetAssignedForRow,
    setAssignmentSearch: derived.setAssignmentSearch,
    setAssignmentSort: derived.setAssignmentSort,
    setAssignmentTeamFilter: derived.setAssignmentTeamFilter,
    clearAssignmentFilters: derived.clearAssignmentFilters,
    openCreateAssignment: actions.openCreateAssignmentPage,
    openEditAssignment: actions.openEditAssignmentPage,
    openAssignmentDetail: actions.openAssignmentDetailPage,
    resumeAssignmentDraft: actions.resumeAssignmentDraftPage,
    deleteAssignmentRow: actions.deleteAssignmentRow,
    setAssignmentRowsToShow: derived.setAssignmentRowsToShow,
    retryLoadAssignments: hydration.hydrateAssignments,
    otRateSettings: hydration.otRateSettings,
    otRateDirty: hydration.otRateDirty,
    updateOvertimeApplicabilityField: hydration.updateOvertimeApplicabilityField,
    updateOvertimeRateField: hydration.updateOvertimeRateField,
    updateOvertimeBaseHourField: hydration.updateOvertimeBaseHourField,
    updateOvertimeRoleOverrideField: hydration.updateOvertimeRoleOverrideField,
    resetOvertimeRates: hydration.resetOvertimeRates,
    reloadOvertimeRates: hydration.reloadOvertimeRates,
    persistOvertimeRates: hydration.persistOvertimeRates,
  })

  if (!user) {
    return (
      <div className="my-4 text-danger">
        Unable to load salary and claims management. Please sign in again.
      </div>
    )
  }

  if (!isHrUser) {
    return (
      <div className="my-4 text-danger">
        You do not have permission to view salary and claims management.
      </div>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />

      <SalaryWorkflowActionModal
        visible={actions.workflowModalState.visible}
        record={actions.workflowModalState.record}
        actionLabel={actions.workflowModalActionLabel}
        actionType={actions.isRejectWorkflowModal ? 'reject' : 'approve'}
        actionDisabled={actions.workflowModalActionDisabled}
        remarks={actions.workflowRemarks}
        onRemarksChange={actions.handleWorkflowRemarksChange}
        showDeclaration={!actions.isRejectWorkflowModal}
        declarationRequired={!actions.isRejectWorkflowModal}
        declarationChecked={actions.workflowDeclarationChecked}
        onDeclarationChange={actions.handleWorkflowDeclarationChange}
        declarationLabel={WORKFLOW_DECLARATION_LABEL}
        declarationError={actions.workflowDeclarationError}
        rejectError={actions.workflowRejectError}
        statusColorMap={derived.statusColorMap}
        formatDate={formatDate}
        formatCurrency={actions.formatCurrency}
        toTypeLabel={actions.toTypeLabel}
        onClose={actions.closeWorkflowModal}
        onSubmit={
          actions.isRejectWorkflowModal
            ? actions.submitWorkflowReject
            : actions.submitWorkflowApprove
        }
      />

      <BulkClaimActionModal
        vm={{
          visible: pageState.bulkActionModal.visible,
          action: pageState.bulkActionModal.action,
          selectedCount: derived.selectedClaims.length,
          remarks: pageState.bulkRemarks,
          declarationChecked: pageState.bulkDeclarationChecked,
          declarationLabel: WORKFLOW_DECLARATION_LABEL,
          declarationError: pageState.bulkDeclarationError,
          rejectError: pageState.bulkRejectError,
        }}
        handlers={{
          onClose: pageState.closeBulkActionModal,
          onSubmit: actions.submitBulkAction,
          onRemarksChange: pageState.setBulkRemarks,
          onDeclarationChange: pageState.setBulkDeclarationChecked,
          onClearRejectError: () => pageState.setBulkRejectError(''),
          onClearDeclarationError: () => pageState.setBulkDeclarationError(''),
        }}
      />

      <SalaryClaimPaymentModal
        visible={actions.paymentModalState.visible}
        mode={actions.paymentModalState.mode}
        scope={actions.paymentModalState.scope}
        selectedCount={derived.selectedClaims.length}
        record={actions.paymentModalState.target}
        values={actions.paymentFormValues}
        errors={actions.paymentFormErrors}
        onChange={actions.handlePaymentFormChange}
        onClose={actions.closePaymentModal}
        onSubmit={actions.submitPaymentAction}
        isSubmitting={actions.isPaymentSubmitting}
      />

      <AttachmentPreviewModal
        visible={pageState.attachmentPreviewOpen}
        attachment={pageState.activeAttachment}
        onClose={pageState.closeAttachmentPreview}
      />

      <CModal
        visible={actions.assignmentDeleteModalVisible}
        alignment="center"
        onClose={actions.closeAssignmentDeleteModal}
      >
        <CModalHeader onClose={actions.closeAssignmentDeleteModal}>
          <CModalTitle>Delete Assignment</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {String(actions.assignmentDeleteTarget?.status || '') === ASSIGNMENT_DRAFT_STATUS
            ? 'Delete this salary assignment draft?'
            : 'Delete this salary assignment?'}
        </CModalBody>
        <CModalFooter>
          <CButton color="light" onClick={actions.closeAssignmentDeleteModal}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={actions.confirmDeleteAssignmentRow}>
            Delete
          </CButton>
        </CModalFooter>
      </CModal>

      {!isClaimDetailRoute && !isAssignmentFormRoute && tabNavGroup && (
        <SalaryClaimsTabsNav
          activeTab={pageState.activeTab}
          onSwitch={pageState.switchTab}
          group={tabNavGroup}
          tabMeta={{
            salaryRecords:
              derived.salaryContractIncompleteTotalCount > 0
                ? { warningCount: derived.salaryContractIncompleteTotalCount }
                : undefined,
          }}
        />
      )}

      {isClaimDetailRoute && !hydration.isClaimsLoading && (
        <ClaimDetailView vm={claimDetailVm} handlers={claimDetailHandlers} />
      )}
      {isClaimDetailRoute && hydration.isClaimsLoading && (
        <div className="px-3 py-4">
          <TableLoader />
        </div>
      )}
      {isAssignmentFormRoute && (
        <SalaryAssignmentFormPage
          key={`salary-assignment-form:${isAssignmentEditRoute ? 'edit' : isAssignmentViewRoute ? 'view' : 'new'}:${assignmentId || 'new'}:${
            (!isAssignmentEditRoute && !isAssignmentViewRoute) ||
            hydration.assignmentRows.some((row) => String(row?.id || '') === assignmentId)
              ? 'ready'
              : 'loading'
          }`}
          vm={{
            isEditing: isAssignmentEditRoute,
            isReadOnly: isAssignmentViewRoute,
            draft: hydration.assignmentDraft,
            payComponentsEditMode: hydration.payComponentsEditMode,
            payComponentsDraft: hydration.payComponentsDraft,
            staffOptions: derived.staffOptions,
            staffDirectoryLoading: hydration.staffDirectoryLoading,
            salaryDetailTotals: hydration.salaryDetailTotals,
            calculatedDeductions: hydration.calculatedDeductions,
            statutoryRatesFeatureEnabled: hydration.statutoryRatesFeatureEnabled,
            formatCurrency: actions.formatCurrency,
            formatMonth,
            formatDateTime,
            actorName,
            assignmentRows: combinedAssignmentRows,
            currentAssignmentId: hydration.editingAssignmentId,
            assignmentFound:
              (!isAssignmentEditRoute && !isAssignmentViewRoute) ||
              hydration.assignmentRows.some((row) => String(row?.id || '') === assignmentId),
          }}
          handlers={{
            onBack: actions.backToAssignments,
            onStaffChange: hydration.handleStaffChange,
            onDraftFieldChange: actions.handleAssignmentDraftFieldChange,
            onEditPayComponents: hydration.editPayComponents,
            onSavePayComponents: hydration.savePayComponentsEdit,
            onCancelPayComponents: hydration.cancelPayComponentsEdit,
            onAddAllowanceRow: hydration.addAllowanceRow,
            onUpdateComponentRow: hydration.updatePayComponentRow,
            onDeleteComponentRow: hydration.deletePayComponentRow,
            onOpenEdit: () => actions.openAssignmentEditById(assignmentId),
            onSaveDraft: actions.saveAssignmentDraft,
            onSetSalary: actions.setSalary,
          }}
        />
      )}

      <div style={!isClaimDetailRoute && !isAssignmentFormRoute ? { minHeight: 520 } : undefined}>
        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'claimRecords' && (
          <ClaimRecordsTab vm={claimRecordsVm} handlers={claimRecordsHandlers} />
        )}

        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'salaryRecords' && (
          <SalaryRecordsTab vm={salaryRecordsVm} handlers={salaryRecordsHandlers} />
        )}

        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'assignment' && (
          <ErrorBoundary>
            <SalarySettingsTab vm={assignmentTabVm} handlers={assignmentTabHandlers} />
          </ErrorBoundary>
        )}

        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'otRates' && (
          <OvertimeRateSettingsTab vm={overtimeRatesVm} handlers={overtimeRatesHandlers} />
        )}

        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'workflowRules' && (
          <SalaryWorkflowRules />
        )}

        {!isClaimDetailRoute && !isAssignmentFormRoute && pageState.tab === 'companyLegal' && (
          <CompanyLegalInfoTab />
        )}
      </div>
    </CContainer>
  )
}

export default SalaryClaimsManagement
