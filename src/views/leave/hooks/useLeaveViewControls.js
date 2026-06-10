import { useCallback, useMemo, useState } from 'react'

export default function useLeaveViewControls({ pathname, navigate }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('appliedAt:desc')

  const activeSection = useMemo(() => {
    if (pathname === '/leave/new') return 'new-leave'
    if (pathname.startsWith('/leave/')) return 'leave-detail'
    return 'leave-records'
  }, [pathname])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setTypeFilter('All')
    setPeriod('all')
    setSort('appliedAt:desc')
  }, [])

  const openRecord = useCallback(
    (row) => {
      if (!row?.id) return
      navigate(`/leave/${row.id}`)
    },
    [navigate],
  )

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    period,
    setPeriod,
    sort,
    setSort,
    activeSection,
    clearFilters,
    openRecord,
  }
}
