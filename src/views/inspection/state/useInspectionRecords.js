import { useCallback, useEffect, useMemo, useState } from 'react'
import useTableRows from 'src/hooks/useTableRows'
import {
  deleteInspectionRecord,
  fetchInspectionRecords,
  isInspectionApiEnabled,
  loadInspectionRecordsForScope,
  persistInspectionRecord,
  persistInspectionRecords,
} from '../domain/api/inspectionApi'
import { toDateTime } from '../domain/utils/inspectionSharedUtils'
import { stripInspectionContext } from '../domain/utils/typeOptionUtils'

const byNewest = (a, b) => toDateTime(b) - toDateTime(a)

const normalizeIdentity = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const getUserIdentitySet = (user) => {
  const values = [user?.id, user?.name, user?.email, user?.username, user?.employeeId]
    .map(normalizeIdentity)
    .filter(Boolean)
  return new Set(values)
}

const getRecordOwnerTokens = (row) =>
  [
    row?.submittedBy,
    row?.submitted_by,
    row?._preparedBy,
    row?.preparedBy,
    row?.prepared_by,
    row?.createdBy,
    row?.created_by,
    row?.userId,
    row?.user_id,
    row?.ownerId,
    row?.owner_id,
    row?.timeline?.[0]?.by,
  ]
    .map(normalizeIdentity)
    .filter(Boolean)

const isMineRecord = (row, userIdentitySet) => {
  if (row?.recordKind === 'draft') return true
  const ownerTokens = getRecordOwnerTokens(row)
  if (ownerTokens.length === 0) return true
  if (userIdentitySet.size === 0) return false
  return ownerTokens.some((token) => userIdentitySet.has(token))
}

const useInspectionRecords = ({
  user,
  userId,
  reportId,
  draftRows = [],
  actionFilter = '',
  initialStatusFilter = 'All',
}) => {
  const [records, setRecords] = useState([])
  const [recordScope, setRecordScope] = useState('mine')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('reportedAt:desc')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState(
    actionFilter === 'review'
      ? 'Submitted'
      : actionFilter === 'approve'
        ? 'Reviewed'
        : initialStatusFilter,
  )
  const [checklistFilter, setChecklistFilter] = useState('All')
  const [hasChecklistFilter, setHasChecklistFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const apiEnabledForInspection = isInspectionApiEnabled()

  const loadRows = useCallback(
    async (signal = { cancelled: false }) => {
      if (!userId) return
      try {
        setIsLoading(true)
        setLoadError(null)
        const rows = apiEnabledForInspection
          ? await fetchInspectionRecords({
              scope: actionFilter ? 'actionable' : recordScope,
              action: actionFilter,
              status: !actionFilter && initialStatusFilter !== 'All' ? initialStatusFilter : '',
            })
          : loadInspectionRecordsForScope({ userId, scope: recordScope })
        if (signal.cancelled) return
        setRecords(rows.sort(byNewest))
      } catch (error) {
        if (signal.cancelled) return
        setLoadError(error)
      } finally {
        if (!signal.cancelled) setIsLoading(false)
      }
    },
    [actionFilter, apiEnabledForInspection, initialStatusFilter, recordScope, userId],
  )

  const reloadRecords = useCallback(() => loadRows(), [loadRows])

  useEffect(() => {
    const signal = { cancelled: false }
    const timerId = window.setTimeout(() => {
      loadRows(signal)
    }, 0)
    return () => {
      signal.cancelled = true
      window.clearTimeout(timerId)
    }
  }, [loadRows])

  useEffect(() => {
    if (period === 'all') return
    const refreshNow = () => setNowMs(Date.now())
    const kickoffId = window.setTimeout(refreshNow, 0)
    const timerId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60 * 1000)
    return () => {
      window.clearTimeout(kickoffId)
      window.clearInterval(timerId)
    }
  }, [period])

  const persistRecords = async (next) => {
    const intended = (Array.isArray(next) ? next : []).sort(byNewest)
    try {
      const saved = await persistInspectionRecords(userId, intended)
      if (!saved) return { saved: false, trimmed: false }
      await reloadRecords()
      return { saved: true, trimmed: false }
    } catch (error) {
      return { saved: false, trimmed: false, error }
    }
  }

  const persistRecord = async (row) => {
    try {
      const saved = await persistInspectionRecord(userId, row)
      if (!saved) return { saved: false }
      await reloadRecords()
      return { saved: true }
    } catch (error) {
      return { saved: false, error }
    }
  }

  const deleteRecord = async (rowId) => {
    try {
      const saved = await deleteInspectionRecord(userId, rowId)
      if (!saved) return { saved: false }
      await reloadRecords()
      return { saved: true }
    } catch (error) {
      return { saved: false, error }
    }
  }

  const userIdentitySet = useMemo(() => getUserIdentitySet(user || { id: userId }), [user, userId])
  const allRecordsWithDrafts = useMemo(
    () => records.concat(Array.isArray(draftRows) ? draftRows : []),
    [draftRows, records],
  )

  const recordsInScope = useMemo(() => {
    if (recordScope === 'all') {
      return allRecordsWithDrafts.filter((row) => row?.recordKind !== 'queued')
    }
    return allRecordsWithDrafts.filter((row) => isMineRecord(row, userIdentitySet))
  }, [allRecordsWithDrafts, recordScope, userIdentitySet])

  const filteredRecords = useMemo(() => {
    let next = [...recordsInScope]
    const term = search.trim().toLowerCase()

    if (term) {
      next = next.filter((x) =>
        `${x.displayId} ${x.incidentType} ${x.location} ${x.status}`.toLowerCase().includes(term),
      )
    }

    if (typeFilter !== 'All') {
      next = next.filter((x) => String(x.incidentType || '') === typeFilter)
    }

    if (statusFilter !== 'All') {
      next = next.filter((x) => String(x.status || '') === statusFilter)
    }

    if (hasChecklistFilter !== 'All') {
      const wantsChecklist = hasChecklistFilter === 'yes'
      next = next.filter((x) => {
        const selectedCount = (Array.isArray(x.checklist) ? x.checklist : []).filter(
          (item) => item && item.selected !== false,
        ).length
        return wantsChecklist ? selectedCount > 0 : selectedCount === 0
      })
    }

    if (checklistFilter !== 'All') {
      next = next.filter((x) =>
        (Array.isArray(x.checklist) ? x.checklist : []).some(
          (item) =>
            item &&
            item.selected !== false &&
            (String(item.id || '') === checklistFilter ||
              String(item.label || '') === checklistFilter),
        ),
      )
    }

    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = nowMs - days * 24 * 60 * 60 * 1000
        next = next.filter((x) => toDateTime(x) >= cutoff)
      }
    }

    const [sortField, sortDir] = sort.split(':')
    next.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'incidentType') {
        const av = String(a.incidentType || '').toLowerCase()
        const bv = String(b.incidentType || '').toLowerCase()
        if (av === bv) return 0
        return av > bv ? dir : -dir
      }
      const av = toDateTime(a)
      const bv = toDateTime(b)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    })

    return next
  }, [
    checklistFilter,
    hasChecklistFilter,
    nowMs,
    period,
    recordsInScope,
    search,
    sort,
    statusFilter,
    typeFilter,
  ])

  const selectedRecord = useMemo(
    () => allRecordsWithDrafts.find((x) => String(x.id) === String(reportId || '')) || null,
    [allRecordsWithDrafts, reportId],
  )

  const typeOptions = useMemo(
    () => [
      { value: 'All', label: 'All types' },
      ...Array.from(new Set(recordsInScope.map((row) => String(row.incidentType || '').trim())))
        .filter(Boolean)
        .map((type) => ({ value: type, label: stripInspectionContext(type) || type })),
    ],
    [recordsInScope],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All status' },
      ...Array.from(new Set(recordsInScope.map((row) => String(row.status || '').trim())))
        .filter(Boolean)
        .map((status) => ({ value: status, label: status })),
    ],
    [recordsInScope],
  )

  const checklistOptions = useMemo(
    () => [
      { value: 'All', label: 'All checklist items' },
      ...Array.from(
        new Map(
          recordsInScope
            .flatMap((row) => (Array.isArray(row.checklist) ? row.checklist : []))
            .filter((item) => item && item.selected !== false && String(item.label || '').trim())
            .map((item) => [
              String(item.id || item.label || '').trim(),
              {
                value: String(item.id || item.label || '').trim(),
                label: String(item.label).trim(),
              },
            ]),
        ).values(),
      ),
    ],
    [recordsInScope],
  )

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredRecords)

  const clearFilters = () => {
    setSearch('')
    setPeriod('all')
    setSort('reportedAt:desc')
    setTypeFilter('All')
    setStatusFilter('All')
    setChecklistFilter('All')
    setHasChecklistFilter('All')
  }

  return {
    records,
    loadError,
    isLoading,
    search,
    setSearch,
    recordScope,
    setRecordScope,
    period,
    setPeriod,
    sort,
    setSort,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    checklistFilter,
    setChecklistFilter,
    hasChecklistFilter,
    setHasChecklistFilter,
    scopedRecords: recordsInScope,
    filteredRecords,
    selectedRecord,
    typeOptions,
    statusOptions,
    checklistOptions,
    recordsInScopeCount: recordsInScope.length,
    rowsToShow,
    setRowsToShow,
    visibleRows,
    clearFilters,
    persistRecords,
    persistRecord,
    deleteRecord,
    setRecords,
    reloadRecords,
  }
}

export default useInspectionRecords
