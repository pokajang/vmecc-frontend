import { useMemo } from 'react'
import { buildWorkflowHistoryEntries } from 'src/components/auditHistory'
import { OVERTIME_TYPE_OPTIONS } from '../overtimePolicy'
import {
  getOvertimeTypeLabel,
  getWorkflowPendingActionHint,
  getWorkflowStatusLabel,
  toSortableDate,
} from '../utils'
import { buildDraftOvertimeRow } from '../domain/overtimeFormDomain'

const useOvertimeRecordsViewModel = ({
  actorName,
  location,
  overtimeDraft,
  overtimeId,
  overtimePolicy,
  overtimeRecords,
  period,
  search,
  sort,
  statusFilter,
  userId,
}) => {
  const visibleOvertimeTypeOptions = useMemo(() => {
    const visibility = overtimePolicy?.typeVisibility || {}
    const visible = OVERTIME_TYPE_OPTIONS.filter((option) => visibility[option.value] !== false)
    return visible.length > 0 ? visible : OVERTIME_TYPE_OPTIONS
  }, [overtimePolicy])

  const defaultOvertimeType = visibleOvertimeTypeOptions[0]?.value || 'weekday'
  const draftListRow = useMemo(
    () => buildDraftOvertimeRow(overtimeDraft, userId, defaultOvertimeType),
    [defaultOvertimeType, overtimeDraft, userId],
  )
  const linkedDraftRecordId = useMemo(
    () => String(overtimeDraft?.sourceRecordId || '').trim(),
    [overtimeDraft],
  )
  const overtimeRecordsWithDraftState = useMemo(
    () =>
      overtimeRecords.map((row) => ({
        ...row,
        hasDraftChanges:
          linkedDraftRecordId !== '' && String(row?.id || '').trim() === linkedDraftRecordId,
      })),
    [linkedDraftRecordId, overtimeRecords],
  )

  const activeSection = (() => {
    if (location.pathname === '/overtime/new') return 'new-overtime'
    if (location.pathname.startsWith('/overtime/')) return 'overtime-detail'
    return 'overtime-records'
  })()

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    const [sortField, sortDir] = sort.split(':')
    const sourceRows = draftListRow
      ? [draftListRow, ...overtimeRecordsWithDraftState]
      : [...overtimeRecordsWithDraftState]
    let next = sourceRows

    if (term) {
      next = next.filter((row) => {
        const statusLabel = row?.isDraft ? 'Draft' : getWorkflowStatusLabel(row)
        const pendingActionHint = row?.isDraft ? 'Draft' : getWorkflowPendingActionHint(row)
        const draftChangeHint = row?.hasDraftChanges ? 'draft saved draft changes' : ''
        const overtimeTypeLabel = getOvertimeTypeLabel(row?.overtimeType, { short: true })
        const haystack =
          `${row.id} ${overtimeTypeLabel} ${row.reason} ${row.status} ${statusLabel} ${pendingActionHint} ${draftChangeHint}`
            .toLowerCase()
            .trim()
        return haystack.includes(term)
      })
    }

    if (statusFilter !== 'All') {
      next = next.filter((row) => row.status === statusFilter)
    }

    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000)
        next = next.filter((row) => {
          const applied = new Date(row.appliedAt)
          return !Number.isNaN(applied.getTime()) && applied >= cutoff
        })
      }
    }

    const draftRows = next.filter((row) => row?.isDraft)
    next = next.filter((row) => !row?.isDraft)

    const monthDirection = sortField === 'appliedAt' && sortDir === 'asc' ? 1 : -1
    const resolveMonthOrder = (row) => {
      const sortableDate = toSortableDate(row?.appliedAt)
      if (!Number.isFinite(sortableDate)) return null
      const parsed = new Date(sortableDate)
      if (Number.isNaN(parsed.getTime())) return null
      return parsed.getFullYear() * 100 + (parsed.getMonth() + 1)
    }

    const compareWithinMonth = (a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'durationMinutes') {
        const av = Number(a.durationMinutes || 0)
        const bv = Number(b.durationMinutes || 0)
        if (av !== bv) return av > bv ? dir : -dir
      } else {
        const av = toSortableDate(a.appliedAt)
        const bv = toSortableDate(b.appliedAt)
        if (av !== bv) return av > bv ? dir : -dir
      }

      const fallbackAv = toSortableDate(a.appliedAt)
      const fallbackBv = toSortableDate(b.appliedAt)
      if (fallbackAv === fallbackBv) return 0
      return fallbackAv > fallbackBv ? -1 : 1
    }

    next.sort((a, b) => {
      const monthA = resolveMonthOrder(a)
      const monthB = resolveMonthOrder(b)
      if (monthA !== monthB) {
        if (monthA === null) return 1
        if (monthB === null) return -1
        return monthA > monthB ? monthDirection : -monthDirection
      }
      return compareWithinMonth(a, b)
    })

    return [...draftRows, ...next]
  }, [draftListRow, overtimeRecordsWithDraftState, period, search, sort, statusFilter])

  const selectedRecord = useMemo(
    () => overtimeRecords.find((row) => row.id === overtimeId) || null,
    [overtimeId, overtimeRecords],
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
        id: `oh-${selectedRecord.id || 'submitted'}`,
        at: selectedRecord.appliedAt,
        action: 'Submitted',
        by: selectedRecord.submittedBy || actorName,
        remarks: 'Overtime claim submitted.',
      },
    ]
  }, [selectedRecord, actorName])

  const selectedRecordStatusLabel = useMemo(
    () => getWorkflowStatusLabel(selectedRecord),
    [selectedRecord],
  )
  const selectedRecordPendingActionHint = useMemo(
    () => getWorkflowPendingActionHint(selectedRecord),
    [selectedRecord],
  )
  const selectedRecordHistoryEntries = useMemo(
    () =>
      buildWorkflowHistoryEntries(selectedRecord, selectedRecordApprovalHistory, {
        targetLabel: selectedRecord?.id || selectedRecord?.recordKey || '',
        submittedRemarks: 'Overtime claim submitted.',
      }),
    [selectedRecord, selectedRecordApprovalHistory],
  )

  return {
    activeSection,
    defaultOvertimeType,
    draftListRow,
    filteredRecords,
    linkedDraftRecordId,
    overtimeRecordsWithDraftState,
    selectedRecord,
    selectedRecordApprovalHistory,
    selectedRecordHistoryEntries,
    selectedRecordPendingActionHint,
    selectedRecordStatusLabel,
    visibleOvertimeTypeOptions,
  }
}

export default useOvertimeRecordsViewModel
