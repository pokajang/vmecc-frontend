import { useCallback } from 'react'
import {
  clearPayrollDraftRetryEntry,
  clearPayrollDraftRetryEntriesByType,
  deleteMyPayrollClaimDraftApiFirst,
  loadMyPayrollClaimDraftsApiFirst,
  submitMyPayrollClaimApiFirst,
} from 'src/services/payrollClaimsApi'
import { OVERTIME_BASE_HOUR_MODES } from 'src/views/staff/salary-claims-management/utils'
import { generateSubmissionKey } from '../utils/claimFormUtils'
import {
  createSalaryItem,
  getMonthLabel,
  normalizeItem,
  validateSalaryAdjustmentDraft,
} from '../utils/salaryClaimUtils'

const useSalaryClaimSubmit = ({
  user,
  draftPayload,
  headerPeriod,
  savedItems,
  pushToast,
  overtimeBaseMode,
  overtimeAutoHourlyBaseRate,
  overtimeMonthlyDivisor,
  overtimeGlobalNormalHoursPerDay,
  overtimeRateMultipliers,
  overtimeRowsForPeriod,
  overtimeTotals,
  totalClaimImpact,
  assignedSalarySnapshot,
  payrollBaselineConfirmed,
  totalAmount,
  projectedNetPayout,
  activeDraftId,
  activeDraftBackendId,
  periodConfirmed,
  setActiveDraftId,
  setActiveDraftBackendId,
  setPostSubmitClaimId,
  setPostSubmitVisible,
  setSubmitModalVisible,
  setSubmitDeclarationChecked,
  setPayrollBaselineConfirmed,
  setSavedItems,
  setDraftItem,
  setEditingIndex,
  setShowForm,
  setLastSavedSnapshot,
  buildSnapshot,
  setIsSubmittingClaim,
  isSubmittingClaim,
  localAutosaveKey,
}) =>
  useCallback(async () => {
    if (isSubmittingClaim) return
    const periodLabel = getMonthLabel(headerPeriod)
    const sourceClaimId = String(draftPayload?.sourceClaimId || '').trim()
    const sourceServerId = draftPayload?.sourceServerId || null
    const isEditingSubmittedClaimRecord = Boolean(sourceClaimId)
    const resolvedItems = savedItems.map((item) => ({
      ...normalizeItem(item),
      legacyAttachmentDataUrl: '',
    }))
    const invalidItem = resolvedItems
      .map((item, index) => ({
        index,
        error: validateSalaryAdjustmentDraft(item),
      }))
      .find((entry) => Boolean(entry.error))
    if (invalidItem?.error) {
      pushToast(`Adjustment item ${invalidItem.index + 1}: ${invalidItem.error}`, {
        title: 'Invalid claim item',
        color: 'danger',
      })
      return
    }
    const hasInvalidAttachment = resolvedItems.some(
      (item) =>
        item?.attachmentUploadState === 'uploading' ||
        item?.needsReattach ||
        (Boolean(item?.attachmentName) && !item?.attachmentId),
    )
    if (hasInvalidAttachment) {
      pushToast(
        'Some item attachments are missing or not uploaded. Reattach or remove and retry.',
        {
          title: 'Attachment required',
          color: 'danger',
        },
      )
      return
    }
    const submissionKey = generateSubmissionKey('salary', user?.id)
    setIsSubmittingClaim(true)
    try {
      const overtimeRateSnapshot = {
        hourlyBaseMode: overtimeBaseMode,
        hourlyBaseRateUsed: overtimeAutoHourlyBaseRate,
        hourlyBaseSource:
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? 'month_days_division'
            : 'auto_statutory',
        monthlyDivisorUsed:
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? 'calendar_days_by_overtime_month'
            : overtimeMonthlyDivisor,
        globalNormalHoursPerDayUsed: overtimeGlobalNormalHoursPerDay,
        hasValidHourlyBase:
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? overtimeRowsForPeriod.some((row) => row.hourlyBaseSource !== 'missing')
            : overtimeAutoHourlyBaseRate !== null,
        weekdayMultiplier: overtimeRateMultipliers.weekday,
        weekendMultiplier: overtimeRateMultipliers.weekend,
        publicHolidayMultiplier: overtimeRateMultipliers.publicHoliday,
      }
      const overtimeSnapshotRows = overtimeRowsForPeriod.map((row) => ({
        overtimeId: row.overtimeId,
        overtimeType: row.overtimeType,
        claimDate: row.claimDate,
        durationMinutes: row.durationMinutes,
        durationHours: row.durationHours,
        status: row.status,
        statusLabel: row.statusLabel,
        applicantRoles: row.applicantRoles,
        hourlyBaseRateUsed: row.hourlyBaseRate,
        hourlyBaseSource: row.hourlyBaseSource,
        monthlyDivisorUsed: row.monthlyDivisorUsed,
        multiplier: row.multiplier,
        calculatedPayout: row.calculatedPayout,
        payablePayout: row.payablePayout,
        isApproved: row.isApproved,
      }))
      const primaryAttachment = resolvedItems.find((item) => item.attachmentName) || null
      const baseRecordPayload = {
        period: periodLabel,
        periodValue: headerPeriod,
        category:
          savedItems.length === 0 && overtimeTotals.approvedCount > 0
            ? 'Overtime'
            : savedItems.length === 1
              ? savedItems[0]?.claimType || 'Salary'
              : savedItems.length > 1
                ? 'Multiple'
                : 'Salary',
        amount: totalClaimImpact,
        attachmentAvailable: resolvedItems.some((item) => item.attachmentName),
        attachmentName: primaryAttachment?.attachmentName || '',
        attachmentMimeType: primaryAttachment?.attachmentMimeType || '',
        attachmentSizeBytes: primaryAttachment?.attachmentSizeBytes || 0,
        attachmentId: primaryAttachment?.attachmentId || null,
        notes: savedItems[0]?.lineNotes || '',
        items: resolvedItems.map((item) => ({ ...item, legacyAttachmentDataUrl: '' })),
        payrollSnapshot: { ...assignedSalarySnapshot },
        payrollBaselineConfirmed,
        adjustmentsTotal: totalAmount,
        overtimeTotalHours: overtimeTotals.totalHoursAll,
        approvedOvertimeHours: overtimeTotals.totalHoursApproved,
        approvedOvertimePayout: overtimeTotals.totalPayoutApproved,
        overtimeRows: overtimeSnapshotRows,
        overtimeRateSnapshot,
        projectedNetPayout,
        type: 'salary',
        sourceDraftId: String(activeDraftId || draftPayload?.id || '').trim() || null,
        sourceDraftType: 'salary',
        submissionKey,
      }
      const submitResult = await submitMyPayrollClaimApiFirst(baseRecordPayload, sourceServerId)
      if (!submitResult?.ok || !submitResult?.data) {
        const backendMessage =
          submitResult?.error?.response?.data?.message ||
          submitResult?.error?.response?.data?.error ||
          submitResult?.error?.message ||
          ''
        pushToast(
          backendMessage
            ? `Unable to submit claim to backend. ${backendMessage}`
            : 'Unable to submit claim to backend. Please retry.',
          { title: 'Submit failed', color: 'danger' },
        )
        return
      }
      const record = { ...submitResult.data }
      const consumedDraftId = String(
        record?.consumedDraftId || record?.consumed_draft_id || '',
      ).trim()
      const currentDraftIds = [
        String(activeDraftId || '').trim(),
        String(draftPayload?.id || '').trim(),
      ].filter(Boolean)
      const backendConsumedCurrentDraft =
        consumedDraftId !== '' && currentDraftIds.includes(consumedDraftId)

      if ((activeDraftId || draftPayload?.id) && !backendConsumedCurrentDraft) {
        let resolvedDraftBackendId =
          Number(activeDraftBackendId || draftPayload?.backendId || 0) || 0
        if (!resolvedDraftBackendId) {
          const draftLookupId = String(activeDraftId || draftPayload?.id || '').trim()
          if (draftLookupId) {
            const lookup = await loadMyPayrollClaimDraftsApiFirst(user?.id, 'salary')
            if (lookup?.ok) {
              const matched = (Array.isArray(lookup?.data) ? lookup.data : []).find(
                (entry) => String(entry?.id || '').trim() === draftLookupId,
              )
              resolvedDraftBackendId = Number(matched?.backendId || 0) || 0
            }
          }
        }
        if (resolvedDraftBackendId) {
          const draftDeleteResult = await deleteMyPayrollClaimDraftApiFirst({
            backendId: resolvedDraftBackendId,
          })
          if (!draftDeleteResult?.ok) {
            pushToast('Unable to delete draft from backend. Please retry.', {
              title: 'Draft delete failed',
              color: 'warning',
            })
          }
        }
      }
      const draftRetryIds = Array.from(
        new Set(
          [activeDraftId, draftPayload?.id, consumedDraftId]
            .map((value) => String(value || '').trim())
            .filter(Boolean),
        ),
      )
      draftRetryIds.forEach((draftId) => {
        clearPayrollDraftRetryEntry(user?.id, 'salary', draftId)
      })
      clearPayrollDraftRetryEntriesByType(user?.id, 'salary')
      setActiveDraftId(null)
      setActiveDraftBackendId(null)
      if (isEditingSubmittedClaimRecord) {
        pushToast(`Claim ${record.id} updated and resubmitted.`, {
          title: 'Claim updated',
          color: 'success',
        })
      }
      setPostSubmitClaimId(record.id)
      setPostSubmitVisible(true)
      setSubmitModalVisible(false)
      setSubmitDeclarationChecked(false)
      setPayrollBaselineConfirmed(false)
      setSavedItems([])
      setDraftItem(createSalaryItem())
      setEditingIndex(null)
      setShowForm(false)
      setLastSavedSnapshot(
        buildSnapshot({
          period: headerPeriod,
          periodConfirmed: Boolean(periodConfirmed),
          savedItems: [],
          draftItem: createSalaryItem(),
          payrollBaselineConfirmed: false,
        }),
      )
      try {
        localStorage.removeItem(localAutosaveKey)
      } catch {
        // ignore storage errors
      }
    } finally {
      setIsSubmittingClaim(false)
    }
  }, [
    activeDraftBackendId,
    activeDraftId,
    buildSnapshot,
    assignedSalarySnapshot,
    draftPayload,
    headerPeriod,
    isSubmittingClaim,
    localAutosaveKey,
    overtimeAutoHourlyBaseRate,
    overtimeBaseMode,
    overtimeGlobalNormalHoursPerDay,
    overtimeMonthlyDivisor,
    overtimeRateMultipliers.publicHoliday,
    overtimeRateMultipliers.weekday,
    overtimeRateMultipliers.weekend,
    overtimeRowsForPeriod,
    overtimeTotals.approvedCount,
    overtimeTotals.totalHoursAll,
    overtimeTotals.totalHoursApproved,
    overtimeTotals.totalPayoutApproved,
    payrollBaselineConfirmed,
    periodConfirmed,
    projectedNetPayout,
    pushToast,
    savedItems,
    setActiveDraftBackendId,
    setActiveDraftId,
    setDraftItem,
    setEditingIndex,
    setIsSubmittingClaim,
    setLastSavedSnapshot,
    setPayrollBaselineConfirmed,
    setPostSubmitClaimId,
    setPostSubmitVisible,
    setSavedItems,
    setShowForm,
    setSubmitDeclarationChecked,
    setSubmitModalVisible,
    totalAmount,
    totalClaimImpact,
    user?.id,
  ])

export default useSalaryClaimSubmit
