import { useCallback, useState } from 'react'
import {
  bulkMarkStaffPayrollClaimsPaidApiFirst,
  bulkUnmarkStaffPayrollClaimsPaidApiFirst,
  markStaffPayrollClaimPaidApiFirst,
  unmarkStaffPayrollClaimPaidApiFirst,
} from 'src/services/payrollClaimsApi'
import { normalizeClaimWorkflowRecord } from '../utils'

const useClaimPaymentActions = ({
  selectedClaims,
  setSelectedClaimKeys,
  canMarkClaimPaid,
  canUnmarkClaimPaid,
  setClaimRows,
  salaryWorkflowRule,
  pushToast,
}) => {
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
  const [paymentModalState, setPaymentModalState] = useState({
    visible: false,
    mode: 'mark',
    scope: 'single',
    target: null,
  })
  const [paymentFormValues, setPaymentFormValues] = useState({
    paymentDate: '',
    paymentReference: '',
    paymentNote: '',
    reason: '',
  })
  const [paymentFormErrors, setPaymentFormErrors] = useState({
    paymentDate: '',
    reason: '',
  })

  const openSinglePaymentModal = useCallback((claimRow, mode = 'mark') => {
    const normalizedMode = mode === 'unmark' ? 'unmark' : 'mark'
    const today = new Date().toISOString().slice(0, 10)
    setPaymentModalState({
      visible: true,
      mode: normalizedMode,
      scope: 'single',
      target: claimRow,
    })
    setPaymentFormValues({
      paymentDate: claimRow?.paymentDate || today,
      paymentReference: claimRow?.paymentReference || '',
      paymentNote: '',
      reason: '',
    })
    setPaymentFormErrors({ paymentDate: '', reason: '' })
  }, [])

  const openBulkPaymentModal = useCallback(
    (mode) => {
      const normalizedMode = mode === 'unmark' ? 'unmark' : 'mark'
      const eligibleRows = selectedClaims.filter((row) =>
        normalizedMode === 'mark' ? canMarkClaimPaid(row) : canUnmarkClaimPaid(row),
      )
      if (eligibleRows.length === 0) {
        pushToast(
          normalizedMode === 'mark'
            ? 'No selected salary claims are eligible for mark paid.'
            : 'No selected salary claims are eligible for unmark paid.',
          { title: 'Bulk action unavailable', color: 'warning' },
        )
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      setPaymentModalState({
        visible: true,
        mode: normalizedMode,
        scope: 'bulk',
        target: null,
      })
      setPaymentFormValues({
        paymentDate: today,
        paymentReference: '',
        paymentNote: '',
        reason: '',
      })
      setPaymentFormErrors({ paymentDate: '', reason: '' })
    },
    [canMarkClaimPaid, canUnmarkClaimPaid, pushToast, selectedClaims],
  )

  const closePaymentModal = useCallback(() => {
    setPaymentModalState({ visible: false, mode: 'mark', scope: 'single', target: null })
    setPaymentFormErrors({ paymentDate: '', reason: '' })
    setPaymentFormValues({ paymentDate: '', paymentReference: '', paymentNote: '', reason: '' })
  }, [])

  const handlePaymentFormChange = useCallback((field, value) => {
    setPaymentFormValues((prev) => ({ ...prev, [field]: value }))
    if (field === 'paymentDate' || field === 'reason') {
      setPaymentFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }, [])

  const applyUpdatedRows = useCallback(
    (updatedRows = []) => {
      if (!Array.isArray(updatedRows) || updatedRows.length === 0) return
      setClaimRows((prev) => {
        const updateMap = new Map(
          updatedRows.map((row) => [
            `${String(row?.ownerId || '')}::${String(row?.id || '')}`,
            row,
          ]),
        )
        return prev.map((row) => {
          const key = `${String(row?.ownerId || '')}::${String(row?.id || '')}`
          const updated = updateMap.get(key)
          return updated
            ? normalizeClaimWorkflowRecord({ ...row, ...updated }, salaryWorkflowRule)
            : row
        })
      })
    },
    [salaryWorkflowRule, setClaimRows],
  )

  const submitPaymentAction = useCallback(async () => {
    if (isPaymentSubmitting) return
    const isMarkMode = paymentModalState.mode === 'mark'
    const paymentDate = String(paymentFormValues.paymentDate || '').trim()
    const reason = String(paymentFormValues.reason || '').trim()
    if (isMarkMode && !paymentDate) {
      setPaymentFormErrors((prev) => ({ ...prev, paymentDate: 'Payment date is required.' }))
      return
    }
    if (!isMarkMode && !reason) {
      setPaymentFormErrors((prev) => ({ ...prev, reason: 'Reason is required.' }))
      return
    }

    setIsPaymentSubmitting(true)
    try {
      if (paymentModalState.scope === 'single') {
        const target = paymentModalState.target
        if (!target?.id) {
          closePaymentModal()
          return
        }
        const payload = isMarkMode
          ? {
              payment_date: paymentDate,
              payment_reference: String(paymentFormValues.paymentReference || '').trim() || null,
              payment_note: String(paymentFormValues.paymentNote || '').trim() || null,
            }
          : {
              reason,
            }
        const result = isMarkMode
          ? await markStaffPayrollClaimPaidApiFirst(target, payload)
          : await unmarkStaffPayrollClaimPaidApiFirst(target, payload)
        if (!result?.ok || !result?.data) {
          pushToast(
            isMarkMode ? 'Unable to mark claim as paid.' : 'Unable to unmark claim as paid.',
            { title: 'Update failed', color: 'danger' },
          )
          return
        }
        applyUpdatedRows([result.data])
        pushToast(
          isMarkMode
            ? `Claim ${target.id} marked as paid.`
            : `Claim ${target.id} unmarked as paid.`,
          { title: 'Claim updated', color: isMarkMode ? 'success' : 'warning' },
        )
        closePaymentModal()
        return
      }

      const eligibleRows = selectedClaims.filter((row) =>
        isMarkMode ? canMarkClaimPaid(row) : canUnmarkClaimPaid(row),
      )
      if (eligibleRows.length === 0) {
        pushToast('No selected salary claims are eligible for this action.', {
          title: 'Bulk action unavailable',
          color: 'warning',
        })
        closePaymentModal()
        return
      }
      const bulkPayload = isMarkMode
        ? {
            payment_date: paymentDate,
            payment_reference: String(paymentFormValues.paymentReference || '').trim() || null,
            payment_note: String(paymentFormValues.paymentNote || '').trim() || null,
          }
        : {
            reason,
          }
      const result = isMarkMode
        ? await bulkMarkStaffPayrollClaimsPaidApiFirst(eligibleRows, bulkPayload)
        : await bulkUnmarkStaffPayrollClaimsPaidApiFirst(eligibleRows, bulkPayload)
      if (!result?.ok) {
        pushToast(
          isMarkMode
            ? 'Unable to bulk mark selected claims as paid.'
            : 'Unable to bulk unmark selected claims.',
          { title: 'Bulk update failed', color: 'danger' },
        )
        return
      }
      const updatedRows = Array.isArray(result?.data?.updatedRows) ? result.data.updatedRows : []
      const skipped = Array.isArray(result?.data?.skipped) ? result.data.skipped.length : 0
      applyUpdatedRows(updatedRows)
      setSelectedClaimKeys(new Set())
      closePaymentModal()
      pushToast(
        `${updatedRows.length} claim${updatedRows.length === 1 ? '' : 's'} updated${
          skipped > 0 ? `, ${skipped} skipped` : ''
        }.`,
        { title: isMarkMode ? 'Marked paid' : 'Unmarked paid', color: 'success' },
      )
    } finally {
      setIsPaymentSubmitting(false)
    }
  }, [
    applyUpdatedRows,
    canMarkClaimPaid,
    canUnmarkClaimPaid,
    closePaymentModal,
    isPaymentSubmitting,
    paymentFormValues.paymentDate,
    paymentFormValues.paymentNote,
    paymentFormValues.paymentReference,
    paymentFormValues.reason,
    paymentModalState.mode,
    paymentModalState.scope,
    paymentModalState.target,
    pushToast,
    selectedClaims,
    setSelectedClaimKeys,
  ])

  return {
    isPaymentSubmitting,
    openSinglePaymentModal,
    openBulkPaymentModal,
    paymentModalState,
    paymentFormValues,
    paymentFormErrors,
    handlePaymentFormChange,
    closePaymentModal,
    submitPaymentAction,
  }
}

export default useClaimPaymentActions
