import { useMemo } from 'react'
import { buildWorkflowHistoryEntries } from 'src/components/auditHistory'
import { getLeaveTypeOption } from 'src/views/leave/components/LeaveTypeSelection'
import { leaveFieldRules, shiftConfigs } from '../constants'
import {
  getBusinessDaysInRange,
  getEffectiveLeaveYear,
  getEndBoundaryUnits,
  getStartBoundaryUnits,
  getUserNameCandidates,
  getWorkflowPendingActionHint,
  normalizeText,
} from '../utils'

export default function useLeaveDerivedState({
  leaveRecords,
  leaveId,
  actorName,
  leaveType,
  workShift,
  startDate,
  endDate,
  startTimeSlot,
  endTimeSlot,
  assignmentRows,
  user,
  editingRecordId,
  reason,
  coverBy,
  attachmentName,
  attachmentMeta,
  attachmentId,
  formatDayCount,
}) {
  const selectedRecord = useMemo(
    () => leaveRecords.find((row) => row.id === leaveId) || null,
    [leaveId, leaveRecords],
  )

  const selectedRecordApprovalHistory = useMemo(() => {
    if (!selectedRecord) return []
    if (
      Array.isArray(selectedRecord.approvalHistory) &&
      selectedRecord.approvalHistory.length > 0
    ) {
      return selectedRecord.approvalHistory
    }
    return [
      {
        id: `lh-${selectedRecord.id || 'submitted'}`,
        at: selectedRecord.appliedAt,
        action: 'Submitted',
        by: selectedRecord.submittedBy || actorName,
        remarks: 'Leave request submitted.',
      },
    ]
  }, [selectedRecord, actorName])

  const selectedRecordPendingActionHint = useMemo(
    () => getWorkflowPendingActionHint(selectedRecord),
    [selectedRecord],
  )

  const selectedRecordHistoryEntries = useMemo(
    () =>
      buildWorkflowHistoryEntries(selectedRecord, selectedRecordApprovalHistory, {
        targetLabel: selectedRecord?.display_id || selectedRecord?.id || '',
        submittedRemarks: 'Leave request submitted.',
      }),
    [selectedRecord, selectedRecordApprovalHistory],
  )

  const selectedLeaveTypeOption = useMemo(() => getLeaveTypeOption(leaveType), [leaveType])
  const SelectedLeaveIcon = selectedLeaveTypeOption?.icon
  const selectedShiftConfig = shiftConfigs[workShift] || shiftConfigs.normal

  const requestedDays = useMemo(() => {
    const businessDays = getBusinessDaysInRange(startDate, endDate)
    if (businessDays <= 0) return 0

    if (businessDays === 1 && startTimeSlot === 'midpoint' && endTimeSlot === 'midpoint') {
      return 0
    }

    const startUnits = getStartBoundaryUnits(startTimeSlot)
    const endUnits = getEndBoundaryUnits(endTimeSlot)

    if (businessDays === 1) {
      return startUnits === 1 && endUnits === 1 ? 1 : 0.5
    }

    let total = businessDays
    total -= 1 - startUnits
    total -= 1 - endUnits
    return total < 0 ? 0 : total
  }, [startDate, endDate, startTimeSlot, endTimeSlot])

  const activeFieldRule = useMemo(() => {
    const base = leaveFieldRules[leaveType] || leaveFieldRules['Other Leave']
    const coverageRequired =
      base.coverageRequired === 'multi-day' ? requestedDays > 1 : Boolean(base.coverageRequired)

    return {
      ...base,
      coverageRequired,
      attachmentRequired: Boolean(base.attachmentRequired),
    }
  }, [leaveType, requestedDays])

  const selectedLeaveYear = useMemo(() => getEffectiveLeaveYear(startDate), [startDate])
  const userNameCandidates = useMemo(() => getUserNameCandidates(user), [user])

  const userAssignmentsForYear = useMemo(
    () =>
      assignmentRows.filter((row) => {
        const employeeName = normalizeText(row?.employee)
        const rowYear = Number(row?.year || 0)
        return rowYear === selectedLeaveYear && userNameCandidates.includes(employeeName)
      }),
    [assignmentRows, selectedLeaveYear, userNameCandidates],
  )

  const selectedAssignment = useMemo(
    () => userAssignmentsForYear.find((row) => row.leaveType === leaveType) || null,
    [leaveType, userAssignmentsForYear],
  )

  const balanceSummary = useMemo(() => {
    const base = selectedAssignment
    const entitlementRaw =
      typeof base?.entitlement === 'number' ? base.entitlement : Number(base?.entitlement || 0)
    const entitlement = Number.isFinite(entitlementRaw) ? Math.max(entitlementRaw, 0) : 0
    const used = Number(base?.used || 0)
    const pending = Number(base?.pending || 0)
    const available = Math.max(entitlement - used - pending, 0)
    const afterRequest = available - requestedDays

    return {
      entitlement,
      used,
      pending,
      available,
      afterRequest,
      hasAssignment: Boolean(selectedAssignment),
      hasAnyAssignmentForYear: userAssignmentsForYear.length > 0,
      year: selectedLeaveYear,
      isZeroEntitlement: entitlement <= 0,
      isInsufficient: afterRequest !== null && afterRequest < 0,
    }
  }, [requestedDays, selectedAssignment, selectedLeaveYear, userAssignmentsForYear.length])

  const balanceStats = useMemo(
    () => [
      {
        key: 'available',
        label: 'Available',
        value: `${formatDayCount(balanceSummary.available)} day(s)`,
      },
      {
        key: 'entitlement',
        label: 'Entitlement',
        value: `${formatDayCount(balanceSummary.entitlement)} day(s)`,
      },
      {
        key: 'used',
        label: 'Used',
        value: `${formatDayCount(balanceSummary.used)} day(s)`,
      },
      {
        key: 'pending',
        label: 'Pending',
        value: `${formatDayCount(balanceSummary.pending)} day(s)`,
      },
    ],
    [balanceSummary, formatDayCount],
  )

  const isSubmitBlockedByBalance =
    !balanceSummary.hasAssignment ||
    balanceSummary.isZeroEntitlement ||
    balanceSummary.isInsufficient

  const isFormDirty = useMemo(() => {
    const hasAttachment = Boolean(attachmentName || attachmentMeta?.name || attachmentId)
    return Boolean(
      editingRecordId ||
        startDate ||
        endDate ||
        reason.trim() ||
        coverBy.trim() ||
        hasAttachment ||
        workShift !== 'normal' ||
        startTimeSlot !== 'shift-start' ||
        endTimeSlot !== 'shift-end' ||
        leaveType !== '',
    )
  }, [
    attachmentMeta?.name,
    attachmentId,
    attachmentName,
    coverBy,
    editingRecordId,
    endDate,
    endTimeSlot,
    leaveType,
    reason,
    startDate,
    startTimeSlot,
    workShift,
  ])

  return {
    selectedRecord,
    selectedRecordPendingActionHint,
    selectedRecordHistoryEntries,
    selectedLeaveTypeOption,
    SelectedLeaveIcon,
    selectedShiftConfig,
    requestedDays,
    activeFieldRule,
    selectedAssignment,
    balanceSummary,
    balanceStats,
    isSubmitBlockedByBalance,
    isFormDirty,
  }
}
