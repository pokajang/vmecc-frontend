import { useCallback, useEffect, useMemo, useState } from 'react'
import { CBadge } from '@coreui/react'
import { downloadJsonFile } from 'src/views/payroll/components/attachmentUtils'
import {
  formatDate,
  formatCurrency,
  toTypeLabel,
  normalizeClaimWorkflowRecord,
  buildCompositeOvertimeRecordKey,
  statusColorMap,
} from '../utils'
import { DEFAULT_TAB_KEY, TAB_BASE_BY_KEY, TAB_PATH_BY_KEY } from '../constants'
import {
  buildClaimActionConfig,
  canBulkActOnClaim as canBulkActOnClaimPolicy,
  getClaimActionsForRow,
  resolveClaimWorkflowState,
} from '../helpers/claimWorkflowPolicy'
import useClaimsWorkflow from './useClaimsWorkflow'
import useOvertimeAdminWorkflow from './useOvertimeAdminWorkflow'
import useAssignmentRowActions from './useAssignmentRowActions'
import useClaimPaymentActions from './useClaimPaymentActions'

const getStatusBadge = (status, label = status) => (
  <CBadge color={statusColorMap[status] || 'secondary'}>{label || '-'}</CBadge>
)

const useSalaryClaimsActions = ({
  actorName,
  navigate,
  navigateRaw,
  tab,
  visibleRows,
  detailReturnTab,
  salaryWorkflowRule,
  setClaimRows,
  hydrateClaims,
  hydrateOvertime,
  selectedClaim,
  selectedClaims,
  setSelectedClaimKeys,
  getClaimKey,
  selectedClaimItemId,
  setSelectedClaimItemId,
  isItemDetailsVisible,
  setIsItemDetailsVisible,
  closeItemDetails,
  selectClaimItem,
  submittedClaimItems,
  openAttachmentPreview,
  closeBulkActionModal,
  bulkActionModal,
  bulkRemarks,
  bulkDeclarationChecked,
  setBulkRejectError,
  setBulkDeclarationError,
  normalizedUserRoles,
  isSystemAdmin,
  getOvertimeApplicantRolesForRecord,
  pushToast,
  setAssignmentDraft,
  saveAssignmentAsDraft,
  setSalaryAssignment,
  staffOptions,
  closeAssignmentModal,
  removeAssignmentDraft,
  removeAssignmentRow,
  canManageSalaryPay = false,
}) => {
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  const buildTabPath = useCallback((tabKey = DEFAULT_TAB_KEY) => {
    const base = TAB_BASE_BY_KEY[tabKey] || TAB_BASE_BY_KEY[DEFAULT_TAB_KEY]
    return `${base}/${TAB_PATH_BY_KEY[tabKey] || TAB_PATH_BY_KEY[DEFAULT_TAB_KEY]}`
  }, [])

  const getClaimWorkflowState = useCallback(
    (claimRow) =>
      resolveClaimWorkflowState({
        claimRow,
        salaryWorkflowRule,
        normalizedUserRoles,
        isSystemAdmin,
      }),
    [isSystemAdmin, normalizedUserRoles, salaryWorkflowRule],
  )

  const canBulkActOnClaim = useCallback(
    (row) =>
      canBulkActOnClaimPolicy({
        claimRow: row,
        salaryWorkflowRule,
        normalizedUserRoles,
        isSystemAdmin,
      }),
    [isSystemAdmin, normalizedUserRoles, salaryWorkflowRule],
  )

  const getClaimActionConfig = useCallback(
    (claimRow) =>
      buildClaimActionConfig({
        claimRow,
        salaryWorkflowRule,
        normalizedUserRoles,
        isSystemAdmin,
      }),
    [isSystemAdmin, normalizedUserRoles, salaryWorkflowRule],
  )

  const canMarkClaimPaid = useCallback(
    (claimRow) => {
      if (!claimRow?.id) return false
      if (String(claimRow?.type || '').trim() !== 'salary') return false
      if (!canManageSalaryPay && !isSystemAdmin) return false
      if (String(claimRow?.status || '').trim() !== 'Approved') return false
      return claimRow?.actionPermissions?.markPaid?.enabled !== false
    },
    [canManageSalaryPay, isSystemAdmin],
  )

  const canUnmarkClaimPaid = useCallback(
    (claimRow) => {
      if (!claimRow?.id) return false
      if (String(claimRow?.type || '').trim() !== 'salary') return false
      if (!canManageSalaryPay && !isSystemAdmin) return false
      if (String(claimRow?.status || '').trim() !== 'Paid') return false
      return claimRow?.actionPermissions?.unmarkPaid?.enabled !== false
    },
    [canManageSalaryPay, isSystemAdmin],
  )

  const canBulkActOnSalaryClaim = useCallback(
    (row) => canBulkActOnClaim(row) || canMarkClaimPaid(row) || canUnmarkClaimPaid(row),
    [canBulkActOnClaim, canMarkClaimPaid, canUnmarkClaimPaid],
  )

  const {
    isPaymentSubmitting,
    openSinglePaymentModal,
    openBulkPaymentModal,
    paymentModalState,
    paymentFormValues,
    paymentFormErrors,
    handlePaymentFormChange,
    closePaymentModal,
    submitPaymentAction,
  } = useClaimPaymentActions({
    selectedClaims,
    setSelectedClaimKeys,
    canMarkClaimPaid,
    canUnmarkClaimPaid,
    setClaimRows,
    salaryWorkflowRule,
    pushToast,
  })

  const claimWorkflowState = useMemo(
    () => getClaimWorkflowState(selectedClaim),
    [getClaimWorkflowState, selectedClaim],
  )

  const getClaimActions = useCallback(
    (claimRow) =>
      getClaimActionsForRow({
        claimRow,
        salaryWorkflowRule,
        normalizedUserRoles,
        isSystemAdmin,
      }),
    [isSystemAdmin, normalizedUserRoles, salaryWorkflowRule],
  )

  const selectedClaimActions = useMemo(
    () => getClaimActions(selectedClaim),
    [getClaimActions, selectedClaim],
  )

  const applyClaimApiUpdate = useCallback(
    (targetClaim, apiRow) => {
      if (!targetClaim?.id || !apiRow || typeof apiRow !== 'object') return null
      const ownerKey = String(targetClaim.ownerId || apiRow.ownerId || '').trim()
      const updatedUiRow = normalizeClaimWorkflowRecord(
        {
          ...targetClaim,
          ...apiRow,
          ownerId: targetClaim.ownerId || apiRow.ownerId || '',
          ownerLabel:
            targetClaim.ownerLabel ||
            apiRow?.submittedBy ||
            apiRow?.updatedBy ||
            (ownerKey ? `User ${ownerKey}` : 'Unknown'),
        },
        salaryWorkflowRule,
      )
      setClaimRows((prev) =>
        prev.map((row) =>
          row.id === targetClaim.id && String(row.ownerId || '') === ownerKey ? updatedUiRow : row,
        ),
      )
      return updatedUiRow
    },
    [salaryWorkflowRule, setClaimRows],
  )

  const {
    workflowModalState,
    workflowModalActionLabel,
    isRejectWorkflowModal,
    workflowModalActionDisabled,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    closeWorkflowModal,
    submitWorkflowApprove,
    submitWorkflowReject,
    openActionModal,
    runClaimWorkflowAction,
  } = useClaimsWorkflow({
    selectedClaim,
    salaryWorkflowRule,
    getClaimWorkflowState,
    getClaimActionConfig,
    applyClaimApiUpdate,
    pushToast,
  })

  const triggerClaimAction = useCallback(
    (claimRow, actionKey) => {
      if (!claimRow?.id) return
      if (actionKey === 'download') {
        const payload = {
          id: claimRow.id,
          type: claimRow.type || '',
          status: claimRow.status || '',
          period: claimRow.period || '',
          periodValue: claimRow.periodValue || '',
          amount: claimRow.amount || 0,
          submittedAt: claimRow.submittedAt || '',
          submittedBy: claimRow.submittedBy || claimRow.submittedByName || '',
          updatedAt: claimRow.updatedAt || '',
          updatedBy: claimRow.updatedBy || '',
          category: claimRow.category || '',
          notes: claimRow.notes || '',
          items: Array.isArray(claimRow.items) ? claimRow.items : [],
          workflowSnapshot: claimRow.workflowSnapshot || null,
          approvalHistory: Array.isArray(claimRow.approvalHistory) ? claimRow.approvalHistory : [],
          payrollSnapshot: claimRow.payrollSnapshot || null,
          overtimeRows: Array.isArray(claimRow.overtimeRows) ? claimRow.overtimeRows : [],
          overtimeRateSnapshot: claimRow.overtimeRateSnapshot || null,
        }
        const ok = downloadJsonFile(`${claimRow.id}-claim-package.json`, payload)
        if (!ok) {
          pushToast(`Unable to generate package for ${claimRow.id}.`, {
            title: 'Download failed',
            color: 'danger',
          })
          return
        }
        pushToast(`Claim package for ${claimRow.id} downloaded.`, {
          title: 'Download complete',
          color: 'success',
        })
        return
      }
      if (actionKey === 'reject') {
        openActionModal(claimRow, 'reject')
        return
      }
      if (actionKey === 'mark-paid' || actionKey === 'unmark-paid') {
        const mode = actionKey === 'mark-paid' ? 'mark' : 'unmark'
        openSinglePaymentModal(claimRow, mode)
        return
      }
      openActionModal(claimRow, 'approve')
    },
    [openActionModal, openSinglePaymentModal, pushToast],
  )

  const buildClaimRowActionItems = useCallback(
    (claimRow) => {
      const claimActions = getClaimActions(claimRow)
      const items = [
        {
          key: claimActions.download.key,
          label: claimActions.download.label,
          onClick: () => triggerClaimAction(claimRow, claimActions.download.key),
          disabled: claimActions.download.disabled,
        },
        {
          key: claimActions.reject.key,
          label: claimActions.reject.label,
          onClick: () => triggerClaimAction(claimRow, claimActions.reject.key),
          disabled: claimActions.reject.disabled,
        },
        {
          key: claimActions.primaryWorkflowAction.key,
          label: claimActions.primaryWorkflowAction.label,
          onClick: () => triggerClaimAction(claimRow, claimActions.primaryWorkflowAction.key),
          disabled: claimActions.primaryWorkflowAction.disabled,
        },
      ]
      if (canMarkClaimPaid(claimRow) || canUnmarkClaimPaid(claimRow)) {
        const markPaidAction = canUnmarkClaimPaid(claimRow)
          ? {
              key: 'unmark-paid',
              label: 'Unmark Paid',
              onClick: () => triggerClaimAction(claimRow, 'unmark-paid'),
              disabled: false,
            }
          : {
              key: 'mark-paid',
              label: 'Mark Paid',
              onClick: () => triggerClaimAction(claimRow, 'mark-paid'),
              disabled: false,
            }
        items.push(markPaidAction)
      }
      return items
    },
    [canMarkClaimPaid, canUnmarkClaimPaid, getClaimActions, triggerClaimAction],
  )

  const toggleClaimGroupSelection = useCallback(
    (group) => {
      if (!group?.rows) return
      setSelectedClaimKeys((prev) => {
        const next = new Set(prev)
        const eligibleKeys = group.rows
          .filter((row) => canBulkActOnClaim(row))
          .map((row) => getClaimKey(row))
        const allSelected = eligibleKeys.every((key) => next.has(key))
        if (allSelected) {
          eligibleKeys.forEach((key) => next.delete(key))
        } else {
          eligibleKeys.forEach((key) => next.add(key))
        }
        return next
      })
    },
    [canBulkActOnClaim, getClaimKey, setSelectedClaimKeys],
  )

  const toggleSalaryGroupSelection = useCallback(
    (group) => {
      if (!group?.rows) return
      setSelectedClaimKeys((prev) => {
        const next = new Set(prev)
        const eligibleKeys = group.rows
          .filter((row) => canBulkActOnSalaryClaim(row))
          .map((row) => getClaimKey(row))
        const allSelected = eligibleKeys.every((key) => next.has(key))
        if (allSelected) {
          eligibleKeys.forEach((key) => next.delete(key))
        } else {
          eligibleKeys.forEach((key) => next.add(key))
        }
        return next
      })
    },
    [canBulkActOnSalaryClaim, getClaimKey, setSelectedClaimKeys],
  )

  const submitBulkAction = useCallback(async () => {
    if (isBulkSubmitting) return
    const action = bulkActionModal.action === 'reject' ? 'reject' : 'approve'
    if (selectedClaims.length === 0) {
      closeBulkActionModal()
      return
    }
    if (action === 'reject' && !String(bulkRemarks || '').trim()) {
      setBulkRejectError('Please provide remarks when rejecting.')
      return
    }
    if (action === 'approve' && !bulkDeclarationChecked) {
      setBulkDeclarationError('Please confirm responsibility before proceeding.')
      return
    }

    setIsBulkSubmitting(true)
    let updatedCount = 0
    let skippedCount = 0

    try {
      for (const row of selectedClaims) {
        if (!canBulkActOnClaim(row)) {
          skippedCount += 1
          continue
        }
        const succeeded = await runClaimWorkflowAction(row, {
          decision: action,
          remarks: bulkRemarks,
          declarationChecked: bulkDeclarationChecked,
          silent: true,
        })
        if (succeeded) {
          updatedCount += 1
        } else {
          skippedCount += 1
        }
      }

      await hydrateClaims()
      setSelectedClaimKeys(new Set())
      closeBulkActionModal()

      if (updatedCount > 0) {
        pushToast(
          `Bulk ${action} complete: ${updatedCount} updated${
            skippedCount ? `, ${skippedCount} skipped` : ''
          }.`,
          { title: 'Bulk action complete', color: 'success' },
        )
        return
      }
      pushToast('No claims were updated by the bulk action.', {
        title: 'Bulk action skipped',
        color: 'warning',
      })
    } finally {
      setIsBulkSubmitting(false)
    }
  }, [
    bulkActionModal.action,
    bulkDeclarationChecked,
    bulkRemarks,
    canBulkActOnClaim,
    closeBulkActionModal,
    hydrateClaims,
    isBulkSubmitting,
    pushToast,
    runClaimWorkflowAction,
    selectedClaims,
    setBulkDeclarationError,
    setBulkRejectError,
    setSelectedClaimKeys,
  ])

  const openClaimDetail = useCallback(
    (row, sourceTab = 'salaryRecords') => {
      if (!row?.id) return
      navigate(`/staff/salary-claims/claim/${encodeURIComponent(row.id)}`, {
        state: { tab: sourceTab },
      })
    },
    [navigate],
  )

  const openOvertimeDetail = useCallback(
    (row) => {
      if (!row?.id) return
      const routeKey = String(
        row?.recordKey || buildCompositeOvertimeRecordKey(row?.ownerUserId || '', row?.id),
      ).trim()
      if (!routeKey) return
      navigate(`/staff/overtime-management/record/${encodeURIComponent(routeKey)}`, {
        state: { tab: 'overtimeRecords' },
      })
    },
    [navigate],
  )

  const backToClaimsPage = useCallback(() => {
    navigate(buildTabPath(detailReturnTab))
  }, [buildTabPath, detailReturnTab, navigate])

  const {
    getOvertimeReviewActionConfig,
    overtimeWorkflowModalState,
    overtimeWorkflowModalActionLabel,
    isRejectOvertimeWorkflowModal,
    overtimeWorkflowModalActionDisabled,
    overtimeWorkflowRemarks,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowDeclarationError,
    overtimeWorkflowRejectError,
    handleOvertimeWorkflowRemarksChange,
    handleOvertimeWorkflowDeclarationChange,
    closeOvertimeWorkflowModal,
    submitOvertimeWorkflowApprove,
    submitOvertimeWorkflowReject,
    approveOvertime,
    rejectOvertime,
  } = useOvertimeAdminWorkflow({
    normalizedUserRoles,
    isSystemAdmin,
    getOvertimeApplicantRolesForRecord,
    hydrateOvertime,
    pushToast,
  })

  const renderItemDetailsField = useCallback((key, label, value) => {
    const display =
      value === null || typeof value === 'undefined' || String(value).trim() === '' ? '-' : value
    return (
      <div key={key} className="d-flex justify-content-between align-items-start gap-3 py-2">
        <div className="text-body-secondary">{label}</div>
        <div className="text-end text-break">{display}</div>
      </div>
    )
  }, [])

  useEffect(() => {
    setSelectedClaimKeys(new Set())
  }, [setSelectedClaimKeys, tab])

  useEffect(() => {
    setSelectedClaimItemId('')
    setIsItemDetailsVisible(false)
  }, [selectedClaim?.id, setIsItemDetailsVisible, setSelectedClaimItemId])

  useEffect(() => {
    if (!submittedClaimItems.length) {
      setSelectedClaimItemId('')
      setIsItemDetailsVisible(false)
      return
    }
    if (!selectedClaimItemId) return
    const stillExists = submittedClaimItems.some((item) => item.id === selectedClaimItemId)
    if (!stillExists && isItemDetailsVisible) {
      setSelectedClaimItemId(submittedClaimItems[0].id)
    }
  }, [
    isItemDetailsVisible,
    selectedClaimItemId,
    setIsItemDetailsVisible,
    setSelectedClaimItemId,
    submittedClaimItems,
  ])

  const {
    handleAssignmentDraftFieldChange,
    saveAssignmentDraft,
    setSalary,
    saveAssignmentWithoutNavigate,
    openCreateAssignmentPage,
    openEditAssignmentPage,
    openAssignmentEditById,
    openAssignmentDetailPage,
    resumeAssignmentDraftPage,
    deleteAssignmentRow,
    assignmentDeleteModalVisible,
    assignmentDeleteTarget,
    closeAssignmentDeleteModal,
    confirmDeleteAssignmentRow,
    backToAssignments,
  } = useAssignmentRowActions({
    actorName,
    navigate,
    navigateRaw,
    buildTabPath,
    setAssignmentDraft,
    saveAssignmentAsDraft,
    setSalaryAssignment,
    staffOptions,
    closeAssignmentModal,
    removeAssignmentDraft,
    removeAssignmentRow,
    pushToast,
  })

  return {
    isBulkSubmitting,
    getClaimWorkflowState,
    canBulkActOnClaim,
    canBulkActOnSalaryClaim,
    canMarkClaimPaid,
    canUnmarkClaimPaid,
    getClaimActionConfig,
    claimWorkflowState,
    getClaimActions,
    selectedClaimActions,
    workflowModalState,
    workflowModalActionLabel,
    isRejectWorkflowModal,
    workflowModalActionDisabled,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    closeWorkflowModal,
    submitWorkflowApprove,
    submitWorkflowReject,
    triggerClaimAction,
    buildClaimRowActionItems,
    toggleClaimGroupSelection,
    toggleSalaryGroupSelection,
    submitBulkAction,
    openBulkPaymentModal,
    paymentModalState,
    paymentFormValues,
    paymentFormErrors,
    handlePaymentFormChange,
    closePaymentModal,
    submitPaymentAction,
    isPaymentSubmitting,
    openClaimDetail,
    openOvertimeDetail,
    backToClaimsPage,
    getOvertimeReviewActionConfig,
    overtimeWorkflowModalState,
    overtimeWorkflowModalActionLabel,
    isRejectOvertimeWorkflowModal,
    overtimeWorkflowModalActionDisabled,
    overtimeWorkflowRemarks,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowDeclarationError,
    overtimeWorkflowRejectError,
    handleOvertimeWorkflowRemarksChange,
    handleOvertimeWorkflowDeclarationChange,
    closeOvertimeWorkflowModal,
    submitOvertimeWorkflowApprove,
    submitOvertimeWorkflowReject,
    approveOvertime,
    rejectOvertime,
    getStatusBadge,
    renderItemDetailsField,
    closeItemDetails,
    selectClaimItem,
    openAttachmentPreview,
    handleAssignmentDraftFieldChange,
    saveAssignmentDraft,
    setSalary,
    saveAssignmentWithoutNavigate,
    openCreateAssignmentPage,
    openEditAssignmentPage,
    openAssignmentEditById,
    openAssignmentDetailPage,
    resumeAssignmentDraftPage,
    deleteAssignmentRow,
    assignmentDeleteModalVisible,
    assignmentDeleteTarget,
    closeAssignmentDeleteModal,
    confirmDeleteAssignmentRow,
    backToAssignments,
    formatDate,
    formatCurrency,
    toTypeLabel,
  }
}

export default useSalaryClaimsActions
