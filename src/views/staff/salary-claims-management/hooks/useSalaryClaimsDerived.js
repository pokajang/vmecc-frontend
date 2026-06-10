import { useCallback, useMemo } from 'react'
import { hasPermission } from 'src/utils/authz'
import {
  buildOvertimeWorkflowTimeline,
  getWorkflowPendingActionHint as getOvertimeWorkflowPendingActionHint,
  getWorkflowStatusLabel as getOvertimeWorkflowStatusLabel,
} from 'src/views/overtime/utils'
import useClaimsAdminData from './useClaimsAdminData'
import {
  buildGroupedRows,
  buildPeriodOwnerGroupedRows,
  getAssignmentNetAssigned,
  getAssignmentPeriodMeta,
  getOvertimePeriodMeta,
  getPeriodMeta,
  getSalaryAdjustmentsTotal,
  getSalaryProjectedNet,
} from '../helpers/grouping'
import {
  buildClaimHistoryEntries,
  buildSelectedClaimItemDetails,
  buildSubmittedClaimItems,
} from '../helpers/claimDetail'
import { ASSIGNMENT_DRAFT_STATUS, CLAIM_TYPE_META } from '../constants'
import {
  buildCompositeOvertimeRecordKey,
  decodeRouteValue,
  formatCurrency,
  formatDate,
  formatMonth,
  normalizeRoleList,
  parseAmount,
  statusColorMap,
} from '../utils'

const useSalaryClaimsDerived = ({
  user,
  tab,
  claimId,
  overtimeRouteKey,
  claimRows,
  allOvertimeRecords,
  staffDirectory,
  assignmentRows,
  selectedClaimKeys,
  selectedClaimItemId,
}) => {
  const teamByEmployee = useMemo(() => {
    const map = new Map()
    assignmentRows.forEach((row) => {
      const name = String(row?.employee || '')
        .trim()
        .toLowerCase()
      const team = String(row?.team || '').trim()
      if (name && team && !map.has(name)) {
        map.set(name, team)
      }
    })
    return map
  }, [assignmentRows])

  const directoryByUserId = useMemo(() => {
    const map = new Map()
    staffDirectory.forEach((row) => {
      const id = String(row?.id || '').trim()
      if (id) map.set(id, row)
    })
    return map
  }, [staffDirectory])

  const adminOvertimeRows = useMemo(() => {
    const map = new Map()

    ;(Array.isArray(allOvertimeRecords) ? allOvertimeRecords : []).forEach((row, index) => {
      const ownerUserId = String(row?.ownerUserId || '')
      const overtimeIdValue = String(row?.id || '').trim()
      if (!overtimeIdValue) return
      if (String(row?.status || '').trim() === ASSIGNMENT_DRAFT_STATUS) return

      const recordKey = String(
        row?.recordKey || buildCompositeOvertimeRecordKey(ownerUserId, overtimeIdValue),
      )
      const directoryEntry = directoryByUserId.get(ownerUserId)
      const applicantRolesFromRow = normalizeRoleList(row?.applicantRoles || [])
      const applicantRolesFromDirectory = normalizeRoleList(directoryEntry?.roles || [])
      const applicantRoles =
        applicantRolesFromRow.length > 0 ? applicantRolesFromRow : applicantRolesFromDirectory
      const normalizedSubmittedBy = String(row?.submittedBy || '').trim()
      const normalizedRowEmployee = String(row?.employee || '').trim()
      const employee =
        normalizedSubmittedBy ||
        normalizedRowEmployee ||
        directoryEntry?.employee ||
        (ownerUserId ? `User ${ownerUserId}` : `Record ${index + 1}`)
      const teamFromDirectory = String(directoryEntry?.team || '').trim()
      const teamFromRow = String(row?.team || '').trim()
      const teamFromAssignments = teamByEmployee.get(employee.toLowerCase()) || ''
      const team = teamFromRow || teamFromDirectory || teamFromAssignments || 'Unassigned'

      map.set(recordKey, {
        ...row,
        id: overtimeIdValue,
        ownerUserId,
        recordKey,
        employee,
        team,
        applicantRoles,
      })
    })

    return Array.from(map.values())
  }, [allOvertimeRecords, directoryByUserId, teamByEmployee])

  const claimsAdminData = useClaimsAdminData({
    claimRows,
    adminOvertimeRows,
    assignmentRows,
  })

  const {
    filteredClaimRows,
    filteredSalaryRows,
    filteredOvertimeRows,
    filteredAssignmentRows,
    visibleRows,
    visibleSalaryRows,
    visibleOvertimeRows,
    visibleAssignmentRows,
  } = claimsAdminData

  const getClaimPeriodMeta = useCallback((row) => getPeriodMeta(row, formatMonth), [])
  const getSalaryProjectedNetForRow = useCallback(
    (row) => getSalaryProjectedNet(row, parseAmount),
    [],
  )
  const getSalaryAdjustmentsTotalForRow = useCallback(
    (row) => getSalaryAdjustmentsTotal(row, parseAmount),
    [],
  )
  const getAssignmentNetAssignedForRow = useCallback(
    (row) => getAssignmentNetAssigned(row, parseAmount),
    [],
  )
  const getAssignmentPeriodMetaForRow = useCallback(
    (row) => getAssignmentPeriodMeta(row, formatMonth),
    [],
  )
  const getOvertimePeriodMetaForRow = useCallback(
    (row) => getOvertimePeriodMeta(row, formatMonth),
    [],
  )

  const groupedVisibleClaimRows = useMemo(
    () =>
      buildPeriodOwnerGroupedRows(
        visibleRows,
        {
          getOwnerKey: (row) => row?.ownerId,
          getOwnerLabel: (row) => row?.ownerLabel || row?.ownerId,
          getPeriod: getClaimPeriodMeta,
          getTotalValue: (row) =>
            row?.type === 'salary' ? getSalaryProjectedNetForRow(row) : row?.amount,
        },
        parseAmount,
      ),
    [getClaimPeriodMeta, getSalaryProjectedNetForRow, visibleRows],
  )

  const groupedVisibleSalaryRows = useMemo(
    () =>
      buildPeriodOwnerGroupedRows(
        visibleSalaryRows,
        {
          getOwnerKey: (row) => row?.ownerId,
          getOwnerLabel: (row) => row?.ownerLabel || row?.ownerId,
          getPeriod: getClaimPeriodMeta,
          getTotalValue: getSalaryProjectedNetForRow,
        },
        parseAmount,
      ),
    [getClaimPeriodMeta, getSalaryProjectedNetForRow, visibleSalaryRows],
  )

  const groupedVisibleOvertimeRows = useMemo(
    () =>
      buildGroupedRows(
        visibleOvertimeRows,
        {
          getOwnerKey: (row) => row?.ownerUserId || row?.employee || row?.id,
          getOwnerLabel: (row) => row?.employee || row?.ownerUserId,
          getPeriod: getOvertimePeriodMetaForRow,
          getTotalValue: (row) => row?.durationMinutes,
        },
        parseAmount,
      ),
    [getOvertimePeriodMetaForRow, visibleOvertimeRows],
  )

  const groupedVisibleAssignmentRows = useMemo(
    () =>
      buildGroupedRows(
        visibleAssignmentRows,
        {
          getOwnerKey: (row) => row?.employeeId || row?.email || row?.employee || row?.id,
          getOwnerLabel: (row) => row?.employee || row?.email,
          getPeriod: getAssignmentPeriodMetaForRow,
          getTotalValue: getAssignmentNetAssignedForRow,
        },
        parseAmount,
      ),
    [getAssignmentNetAssignedForRow, getAssignmentPeriodMetaForRow, visibleAssignmentRows],
  )

  const getClaimKey = useCallback(
    (row) => `${String(row?.ownerId || '')}::${String(row?.id || '')}`,
    [],
  )

  const selectedClaims = useMemo(() => {
    if (selectedClaimKeys.size === 0) return []
    const activeRows =
      tab === 'salaryRecords'
        ? visibleSalaryRows
        : tab === 'claimRecords'
          ? visibleRows
          : visibleRows
    const visibleMap = new Map(activeRows.map((row) => [getClaimKey(row), row]))
    return Array.from(selectedClaimKeys)
      .map((key) => visibleMap.get(key))
      .filter(Boolean)
  }, [getClaimKey, selectedClaimKeys, tab, visibleRows, visibleSalaryRows])

  const selectedClaim = useMemo(() => {
    if (!claimId) return null
    const decoded = decodeRouteValue(claimId)
    if (decoded.includes('::')) {
      const sep = decoded.indexOf('::')
      const ownerPart = decoded.slice(0, sep)
      const idPart = decoded.slice(sep + 2)
      return (
        claimRows.find(
          (row) =>
            String(row.ownerId || '') === ownerPart &&
            (String(row.id || '') === idPart || String(row.serverId ?? '') === idPart),
        ) || null
      )
    }
    return claimRows.find((row) => row.id === claimId) || null
  }, [claimId, claimRows])

  const decodedOvertimeRouteKey = useMemo(
    () => decodeRouteValue(overtimeRouteKey),
    [overtimeRouteKey],
  )

  const selectedOvertimeRecord = useMemo(() => {
    if (!decodedOvertimeRouteKey) return null
    if (decodedOvertimeRouteKey.includes('::')) {
      return (
        adminOvertimeRows.find((row) => String(row?.recordKey || '') === decodedOvertimeRouteKey) ||
        null
      )
    }
    return (
      adminOvertimeRows.find((row) => String(row?.id || '') === decodedOvertimeRouteKey) || null
    )
  }, [adminOvertimeRows, decodedOvertimeRouteKey])

  const selectedClaimTypeMeta = useMemo(() => {
    if (!selectedClaim) return CLAIM_TYPE_META.expense
    return CLAIM_TYPE_META[selectedClaim.type] || CLAIM_TYPE_META.expense
  }, [selectedClaim])

  const submittedClaimItems = useMemo(
    () => buildSubmittedClaimItems(selectedClaim, parseAmount),
    [selectedClaim],
  )

  const submittedClaimTotal = useMemo(
    () => submittedClaimItems.reduce((sum, item) => sum + parseAmount(item.amount), 0),
    [submittedClaimItems],
  )

  const selectedClaimItem = useMemo(() => {
    if (!submittedClaimItems.length || !selectedClaimItemId) return null
    return submittedClaimItems.find((item) => item.id === selectedClaimItemId) || null
  }, [selectedClaimItemId, submittedClaimItems])

  const selectedClaimItemDetails = useMemo(
    () =>
      buildSelectedClaimItemDetails({
        selectedClaim,
        selectedClaimItem,
        formatDate,
        formatCurrency,
      }),
    [selectedClaim, selectedClaimItem],
  )

  const submittedTotalLabel = useMemo(
    () =>
      selectedClaimTypeMeta.label === 'Salary Claim'
        ? 'Total Salary Claim Amount'
        : 'Total Claim Amount',
    [selectedClaimTypeMeta.label],
  )

  const submittedDisplayTotal = useMemo(
    () =>
      formatCurrency(
        selectedClaim?.type === 'salary'
          ? parseAmount(selectedClaim?.projectedNetPayout)
          : Array.isArray(selectedClaim?.items) && selectedClaim.items.length > 0
            ? submittedClaimTotal
            : parseAmount(selectedClaim?.amount),
      ),
    [selectedClaim, submittedClaimTotal],
  )

  const claimHistoryEntries = useMemo(
    () => buildClaimHistoryEntries(selectedClaim),
    [selectedClaim],
  )

  const selectedOvertimeApprovalHistory = useMemo(() => {
    if (!selectedOvertimeRecord) return []
    if (
      Array.isArray(selectedOvertimeRecord.approvalHistory) &&
      selectedOvertimeRecord.approvalHistory.length > 0
    ) {
      return selectedOvertimeRecord.approvalHistory
    }
    return [
      {
        id: `oh-${selectedOvertimeRecord.id || 'submitted'}`,
        at: selectedOvertimeRecord.appliedAt,
        action: 'Submitted',
        by:
          selectedOvertimeRecord.submittedBy ||
          selectedOvertimeRecord.employee ||
          user?.name ||
          user?.full_name ||
          user?.email ||
          'System user',
        remarks: 'Overtime claim submitted.',
      },
    ]
  }, [selectedOvertimeRecord, user?.email, user?.full_name, user?.name])

  const selectedOvertimeStatusLabel = useMemo(
    () => getOvertimeWorkflowStatusLabel(selectedOvertimeRecord),
    [selectedOvertimeRecord],
  )
  const selectedOvertimePendingActionHint = useMemo(
    () => getOvertimeWorkflowPendingActionHint(selectedOvertimeRecord),
    [selectedOvertimeRecord],
  )
  const selectedOvertimeWorkflowTimeline = useMemo(
    () => buildOvertimeWorkflowTimeline(selectedOvertimeRecord, selectedOvertimeApprovalHistory),
    [selectedOvertimeApprovalHistory, selectedOvertimeRecord],
  )

  const salaryContractIncompleteRows = useMemo(
    () =>
      claimRows.filter(
        (row) =>
          String(row?.type || '').trim() === 'salary' && row?.salaryContractIncomplete === true,
      ),
    [claimRows],
  )
  const salaryContractIncompleteTotalCount = salaryContractIncompleteRows.length

  const getOvertimeApplicantRolesForRecord = useCallback(
    (row) => {
      const fromRow = normalizeRoleList(row?.applicantRoles || [])
      if (fromRow.length > 0) return fromRow
      const ownerUserId = String(row?.ownerUserId || '')
      const directoryEntry = directoryByUserId.get(ownerUserId)
      return normalizeRoleList(directoryEntry?.roles || [])
    },
    [directoryByUserId],
  )

  const staffOptions = useMemo(() => {
    const map = new Map()
    staffDirectory.forEach((row) => map.set(row.key, row))
    assignmentRows.forEach((row) => {
      const key =
        row.employeeId && String(row.employeeId).trim()
          ? `id:${String(row.employeeId).trim()}`
          : `email:${
              String(row.email || '')
                .trim()
                .toLowerCase() ||
              String(row.employee || '')
                .trim()
                .toLowerCase()
            }`
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: row.employeeId ? String(row.employeeId) : '',
          name: row.employee || '-',
          employee: row.employee || '-',
          email: String(row.email || '')
            .trim()
            .toLowerCase(),
          phone: String(row.phone || '').trim(),
          icNumber: String(row.icNumber || '').trim(),
          team: row.team || 'Unassigned',
          isActive: true,
        })
      }
    })
    return Array.from(map.values()).sort((a, b) =>
      String(a.employee || '').localeCompare(String(b.employee || ''), undefined, {
        sensitivity: 'base',
      }),
    )
  }, [assignmentRows, staffDirectory])

  const normalizedUserRoles = useMemo(() => normalizeRoleList(user?.roles || []), [user?.roles])
  const isSystemAdmin = useMemo(
    () =>
      normalizedUserRoles.includes('System Administrator') || hasPermission(user, 'system.admin'),
    [normalizedUserRoles, user],
  )

  return {
    ...claimsAdminData,
    statusColorMap,
    getClaimPeriodMeta,
    getSalaryAdjustmentsTotalForRow,
    getSalaryProjectedNetForRow,
    getAssignmentNetAssignedForRow,
    getAssignmentPeriodMetaForRow,
    getOvertimePeriodMetaForRow,
    groupedVisibleClaimRows,
    groupedVisibleSalaryRows,
    groupedVisibleOvertimeRows,
    groupedVisibleAssignmentRows,
    getClaimKey,
    selectedClaims,
    selectedClaim,
    selectedOvertimeRecord,
    selectedClaimTypeMeta,
    submittedClaimItems,
    selectedClaimItem,
    selectedClaimItemDetails,
    submittedTotalLabel,
    submittedDisplayTotal,
    claimHistoryEntries,
    selectedOvertimeStatusLabel,
    selectedOvertimePendingActionHint,
    selectedOvertimeWorkflowTimeline,
    getOvertimeApplicantRolesForRecord,
    staffOptions,
    normalizedUserRoles,
    isSystemAdmin,
    adminOvertimeRows,
    salaryContractIncompleteTotalCount,
  }
}

export default useSalaryClaimsDerived
