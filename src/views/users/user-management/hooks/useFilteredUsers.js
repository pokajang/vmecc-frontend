import { useMemo } from 'react'

const sortUsers = (rows, sort) => {
  const next = [...rows]
  next.sort((a, b) => {
    const dir = sort.dir === 'desc' ? -1 : 1
    if (sort.field === 'last_login_at') {
      const av = a.last_login_at ? new Date(a.last_login_at).getTime() : -Infinity
      const bv = b.last_login_at ? new Date(b.last_login_at).getTime() : -Infinity
      if (av === bv) return 0
      return av > bv ? dir : -dir
    }
    const fields = {
      name: (v) => (v?.name || '').toLowerCase(),
      email: (v) => (v?.email || '').toLowerCase(),
      status: (v) => (v?.status || '').toLowerCase(),
      roles: (v) => (v?.roles || []).join(', ').toLowerCase(),
    }
    const getter = fields[sort.field] || fields.name
    const av = getter(a)
    const bv = getter(b)
    if (av === bv) return 0
    return av > bv ? dir : -dir
  })
  return next
}

const useFilteredUsers = ({ users, search, roleFilter, statusFilter, period, sort, nowMs }) =>
  useMemo(() => {
    const term = search.trim().toLowerCase()
    let next = [...users]

    if (term) {
      next = next.filter((u) => {
        const hay = `${u.name || ''} ${u.email || ''} ${(u.roles || []).join(' ')}`.toLowerCase()
        return hay.includes(term)
      })
    }

    if (roleFilter !== 'All') {
      next = next.filter((u) => u.roles?.includes(roleFilter))
    }

    if (statusFilter !== 'All') {
      if (statusFilter === 'Deleted') {
        next = next.filter((u) => Boolean(u.deleted_at))
      } else {
        next = next.filter((u) => !u.deleted_at && (u.status || '') === statusFilter)
      }
    }

    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = new Date(nowMs - days * 24 * 60 * 60 * 1000)
        next = next.filter((u) => {
          if (!u.last_login_at) return false
          const dt = new Date(u.last_login_at)
          return !Number.isNaN(dt.getTime()) && dt >= cutoff
        })
      }
    }

    return sortUsers(next, sort)
  }, [users, search, roleFilter, statusFilter, period, sort, nowMs])

export default useFilteredUsers
