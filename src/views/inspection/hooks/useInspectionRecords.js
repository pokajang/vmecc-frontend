import { useCallback, useEffect, useMemo, useState } from 'react'
import useTableRows from 'src/hooks/useTableRows'
import {
  deleteInspectionRecord,
  fetchInspectionRecords,
  isInspectionApiEnabled,
  persistInspectionRecord,
  persistInspectionRecords,
} from '../inspectionApi'
import { loadInspectionRecords } from '../inspectionStorage'
import { toDateTime } from '../inspectionSharedUtils'

const byNewest = (a, b) => toDateTime(b) - toDateTime(a)

const useInspectionRecords = ({ userId, reportId, draftRows = [] }) => {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('reportedAt:desc')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const apiEnabledForInspection = isInspectionApiEnabled()

  const loadRows = useCallback(
    async (signal = { cancelled: false }) => {
      if (!userId) return
      try {
        setLoadError(null)
        const rows = apiEnabledForInspection
          ? await fetchInspectionRecords(userId)
          : loadInspectionRecords(userId)
        if (signal.cancelled) return
        setRecords(rows.sort(byNewest))
      } catch (error) {
        if (signal.cancelled) return
        setLoadError(error)
      } finally {
        if (!signal.cancelled) setIsLoading(false)
      }
    },
    [apiEnabledForInspection, userId],
  )

  const reloadRecords = () => loadRows()

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

  const recordsInScope = useMemo(
    () => records.concat(Array.isArray(draftRows) ? draftRows : []),
    [draftRows, records],
  )

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
  }, [nowMs, period, recordsInScope, search, sort, statusFilter, typeFilter])

  const selectedRecord = useMemo(
    () => recordsInScope.find((x) => String(x.id) === String(reportId || '')) || null,
    [recordsInScope, reportId],
  )

  const typeOptions = useMemo(
    () => [
      { value: 'All', label: 'All incident types' },
      ...Array.from(new Set(recordsInScope.map((row) => String(row.incidentType || '').trim())))
        .filter(Boolean)
        .map((type) => ({ value: type, label: type })),
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

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredRecords)

  const clearFilters = () => {
    setSearch('')
    setPeriod('all')
    setSort('reportedAt:desc')
    setTypeFilter('All')
    setStatusFilter('All')
  }

  return {
    records,
    loadError,
    isLoading,
    search,
    setSearch,
    period,
    setPeriod,
    sort,
    setSort,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    filteredRecords,
    selectedRecord,
    typeOptions,
    statusOptions,
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
