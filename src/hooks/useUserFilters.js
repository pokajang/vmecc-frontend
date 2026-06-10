import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const sortOptions = [
  { value: 'last_login_at:desc', label: 'Login: Newest' },
  { value: 'last_login_at:asc', label: 'Login: Oldest' },
]

const getInitialFilters = (searchParams, roles) => {
  const q = searchParams.get('q') ?? ''
  const roleParam = searchParams.get('role') ?? 'All'
  const statusParam = searchParams.get('status') ?? 'All'
  const sortFieldParam = searchParams.get('sort') ?? 'last_login_at'
  const sortDirParam = searchParams.get('dir') ?? 'desc'

  const validRole = roleParam === 'All' || roles.includes(roleParam) ? roleParam : 'All'
  const validStatus = ['All', 'Active', 'Inactive', 'Deleted'].includes(statusParam)
    ? statusParam
    : 'All'
  const validSortField = ['name', 'email', 'roles', 'status', 'last_login_at'].includes(
    sortFieldParam,
  )
    ? sortFieldParam
    : 'name'
  const validSortDir = sortDirParam === 'desc' ? 'desc' : 'asc'

  return {
    search: q,
    roleFilter: validRole,
    statusFilter: validStatus,
    sort: { field: validSortField, dir: validSortDir },
  }
}

const useUserFilters = (roles = []) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFilters = getInitialFilters(searchParams, roles)
  const [search, setSearch] = useState(initialFilters.search)
  const [roleFilter, setRoleFilter] = useState(initialFilters.roleFilter)
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter)
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState(initialFilters.sort)
  const syncTimerRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams()

    if (search) params.set('q', search)
    if (roleFilter !== 'All') params.set('role', roleFilter)
    if (statusFilter !== 'All') params.set('status', statusFilter)
    if (sort.field !== 'last_login_at' || sort.dir !== 'desc') {
      params.set('sort', sort.field)
      params.set('dir', sort.dir)
    }

    const next = params.toString()
    if (next === searchParams.toString()) return

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
    }
    syncTimerRef.current = setTimeout(() => {
      setSearchParams(params, { replace: true })
    }, 300)

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
      }
    }
  }, [search, roleFilter, statusFilter, sort, searchParams, setSearchParams])

  const toggleSort = useCallback((field) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { field, dir: 'asc' }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setRoleFilter('All')
    setStatusFilter('All')
    setPeriod('all')
    setSort({ field: 'name', dir: 'asc' })
  }, [])

  return {
    sortOptions,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    period,
    setPeriod,
    sort,
    setSort,
    toggleSort,
    clearFilters,
  }
}

export default useUserFilters
