import { useEffect, useMemo, useState } from 'react'
import useTableRows from 'src/hooks/useTableRows'
import {
  fetchReportRecords,
  isReportApiEnabled,
  persistReportRecords,
  runReportApiBackfillMigration,
} from '../reportApi'
import { loadReportRecords } from '../reportStorage'
import { toDateTime } from '../utils'

const byNewest = (a, b) => toDateTime(b) - toDateTime(a)

const useReportRecords = ({ userId, reportTypeSlug, reportId, draftRows = [] }) => {
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('reportedAt:desc')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const apiEnabledForType = isReportApiEnabled(reportTypeSlug)
  const shouldRunBackfill = apiEnabledForType

  const reloadRecords = async () => {
    if (!userId) return
    const rows = apiEnabledForType
      ? await fetchReportRecords(userId)
      : loadReportRecords(userId).filter(
          (row) =>
            String(row?.reportType || '').toLowerCase() ===
            String(reportTypeSlug || '').toLowerCase(),
        )
    setRecords(rows.sort(byNewest))
    setIsLoading(false)
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const load = async () => {
      if (shouldRunBackfill) {
        await runReportApiBackfillMigration({ userId, reportTypeSlug })
      }
      const rows = apiEnabledForType
        ? await fetchReportRecords(userId)
        : loadReportRecords(userId).filter(
            (row) =>
              String(row?.reportType || '').toLowerCase() ===
              String(reportTypeSlug || '').toLowerCase(),
          )
      if (cancelled) return
      setRecords(rows.sort(byNewest))
      setIsLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [apiEnabledForType, reportTypeSlug, shouldRunBackfill, userId])

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
    const saved = await persistReportRecords(userId, intended)
    if (!saved) return { saved: false, trimmed: false }
    await reloadRecords()
    return { saved: true, trimmed: false }
  }

  const recordsInScope = useMemo(() => {
    const rows = records.concat(Array.isArray(draftRows) ? draftRows : [])
    if (!reportTypeSlug) return rows
    return rows.filter((row) => String(row.reportType || '').toLowerCase() === reportTypeSlug)
  }, [draftRows, records, reportTypeSlug])

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
    setRecords,
    reloadRecords,
  }
}

export default useReportRecords
