import { useCallback, useMemo } from 'react'
import { buildWorkflowHistoryEntries } from 'src/components/auditHistory'
import { getWorkflowPendingActionHint } from '../leaveRecordUtils'
import {
  filterAssignments,
  filterHolidays,
  filterLeaveRecords,
  makeOptionsFromUnique,
} from '../utils'
import { normalizeRoleList } from 'src/views/staff/shared/workflowDomain'

export default function useLeaveManagementDerivedState({
  leaveId,
  leaveRouteValue,
  parsedRouteRecordKey,
  actorName,
  user,
  allLeaveRecords,
  assignmentRows,
  holidayRows,
  staffDirectory,
  search,
  statusFilter,
  typeFilter,
  period,
  sort,
  assignmentSearch,
  assignmentTypeFilter,
  assignmentTeamFilter,
  assignmentSort,
  holidaySearch,
  holidayScopeFilter,
  holidayStateFilter,
  holidayYearFilter,
  holidaySort,
}) {
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

  const adminLeaveRows = useMemo(() => {
    const map = new Map()

    ;(Array.isArray(allLeaveRecords) ? allLeaveRecords : []).forEach((row, index) => {
      const ownerUserId = String(row?.ownerUserId || '')
      const leaveIdValue = String(row?.id || '').trim()
      if (!leaveIdValue) return

      const recordKey = String(row?.recordKey || `${ownerUserId}::${leaveIdValue}`)
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
        id: leaveIdValue,
        ownerUserId,
        recordKey,
        employee,
        team,
        applicantRoles,
      })
    })

    return Array.from(map.values())
  }, [allLeaveRecords, directoryByUserId, teamByEmployee])

  const filteredRecords = useMemo(
    () => filterLeaveRecords(adminLeaveRows, { search, statusFilter, typeFilter, period, sort }),
    [adminLeaveRows, period, search, sort, statusFilter, typeFilter],
  )

  const filteredAssignments = useMemo(
    () =>
      filterAssignments(assignmentRows, {
        search: assignmentSearch,
        typeFilter: assignmentTypeFilter,
        teamFilter: assignmentTeamFilter,
        sort: assignmentSort,
      }),
    [assignmentRows, assignmentSearch, assignmentSort, assignmentTeamFilter, assignmentTypeFilter],
  )

  const filteredHolidays = useMemo(
    () =>
      filterHolidays(holidayRows, {
        search: holidaySearch,
        scopeFilter: holidayScopeFilter,
        stateFilter: holidayStateFilter,
        yearFilter: holidayYearFilter,
        sort: holidaySort,
      }),
    [
      holidayRows,
      holidayScopeFilter,
      holidaySearch,
      holidaySort,
      holidayStateFilter,
      holidayYearFilter,
    ],
  )

  const actorRoles = useMemo(() => normalizeRoleList(user?.roles || []), [user?.roles])
  const isSystemAdministrator = actorRoles.includes('System Administrator')

  const selectedRecord = useMemo(() => {
    if (!leaveId) return null
    if (parsedRouteRecordKey) {
      return adminLeaveRows.find((row) => row.recordKey === parsedRouteRecordKey) || null
    }
    return adminLeaveRows.find((row) => String(row.id) === leaveRouteValue) || null
  }, [adminLeaveRows, leaveId, leaveRouteValue, parsedRouteRecordKey])

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
  }, [actorName, selectedRecord])

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

  const typeOptions = useMemo(
    () => makeOptionsFromUnique(adminLeaveRows, 'leaveType', 'All leave types'),
    [adminLeaveRows],
  )

  const statusOptions = useMemo(
    () => makeOptionsFromUnique(adminLeaveRows, 'status', 'All status'),
    [adminLeaveRows],
  )

  const assignmentTypeOptions = useMemo(
    () => makeOptionsFromUnique(assignmentRows, 'leaveType', 'All leave types'),
    [assignmentRows],
  )

  const assignmentTeamOptions = useMemo(
    () => makeOptionsFromUnique(assignmentRows, 'team', 'All teams'),
    [assignmentRows],
  )

  const holidayScopeOptions = useMemo(
    () => [
      { value: 'All', label: 'All scopes' },
      { value: 'National', label: 'National' },
      { value: 'State', label: 'State' },
    ],
    [],
  )

  const holidayStateOptions = useMemo(
    () => makeOptionsFromUnique(holidayRows, 'state', 'All states'),
    [holidayRows],
  )

  const holidayYearOptions = useMemo(() => {
    const currentYear = String(new Date().getFullYear())
    const fromRows = Array.from(
      new Set(
        holidayRows
          .map((row) => {
            const parsed = new Date(row?.date)
            const derivedYear = Number.isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear())
            return String(row?.year || derivedYear || '').trim()
          })
          .filter(Boolean),
      ),
    ).sort((a, b) => Number(b) - Number(a))

    const values = fromRows.includes(currentYear) ? fromRows : [currentYear, ...fromRows]
    return [
      { value: 'All', label: 'All years' },
      ...values.map((value) => ({
        value,
        label: value,
      })),
    ]
  }, [holidayRows])

  const staffOptions = useMemo(() => {
    const fromDirectory = staffDirectory.map((row) => ({
      ...row,
      employee: row.employee || row.name || '',
      name: row.name || row.employee || '',
      team: row.team || 'Unassigned',
      id: row.id || '',
      key: row.key,
      isActive: row.isActive !== false,
    }))
    const fromAssignments = assignmentRows.map((row) => ({
      employee: row.employee || '',
      name: row.employee || '',
      team: row.team || 'Unassigned',
      id: row.employeeId ? String(row.employeeId) : '',
      key:
        row.employeeId && String(row.employeeId).trim()
          ? `id:${String(row.employeeId).trim()}`
          : `email:${String(row.email || row.employee || '')
              .trim()
              .toLowerCase()}`,
      email: String(row.email || '')
        .trim()
        .toLowerCase(),
      isActive: true,
      roles: [],
      raw: row,
    }))
    const seen = new Set()

    return [...fromDirectory, ...fromAssignments]
      .reduce((acc, item) => {
        const key = String(item.key || `${item.employee}::${item.team}`)
        if (seen.has(key)) return acc
        seen.add(key)
        acc.push(item)
        return acc
      }, [])
      .sort((a, b) =>
        String(a.name || a.employee || '').localeCompare(
          String(b.name || b.employee || ''),
          undefined,
          { sensitivity: 'base' },
        ),
      )
  }, [assignmentRows, staffDirectory])

  const getApplicantRolesForRecord = useCallback(
    (row) => {
      const fromRow = normalizeRoleList(row?.applicantRoles || [])
      if (fromRow.length > 0) return fromRow
      const ownerUserId = String(row?.ownerUserId || '')
      const directoryEntry = directoryByUserId.get(ownerUserId)
      return normalizeRoleList(directoryEntry?.roles || [])
    },
    [directoryByUserId],
  )

  const existingNationalDefaultsForYear = useMemo(() => {
    const year =
      holidayYearFilter && holidayYearFilter !== 'All'
        ? Number(holidayYearFilter)
        : new Date().getFullYear()
    return holidayRows.filter(
      (row) =>
        row?.isDefaultNational && Number(row?.year || new Date(row?.date).getFullYear()) === year,
    )
  }, [holidayRows, holidayYearFilter])

  return {
    actorRoles,
    isSystemAdministrator,
    adminLeaveRows,
    filteredRecords,
    filteredAssignments,
    filteredHolidays,
    selectedRecord,
    selectedRecordPendingActionHint,
    selectedRecordHistoryEntries,
    typeOptions,
    statusOptions,
    assignmentTypeOptions,
    assignmentTeamOptions,
    holidayScopeOptions,
    holidayStateOptions,
    holidayYearOptions,
    staffOptions,
    getApplicantRolesForRecord,
    existingNationalDefaultsForYear,
  }
}
