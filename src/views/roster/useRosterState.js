import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRosters, fetchTeams, fetchShiftWindows, fetchAllShifts, saveRosters, publishRosters } from 'src/services/apiClient'

// Built-in shift definitions used as fallback if the API is unreachable
const FALLBACK_SHIFTS = [
  { slug: 'day',   name: 'Day',   builtin: true },
  { slug: 'night', name: 'Night', builtin: true },
]

const useRosterState = (enabled = true, publishedOnly = false, defaultRangeType = 'month') => {
  const today = new Date()

  const getMonday = (d) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = (day === 0 ? -6 : 1) - day
    date.setDate(date.getDate() + diff)
    return date
  }

  const formatISO = (d) => d.toISOString().slice(0, 10)
  const defaultWeekStart = formatISO(getMonday(today))

  const [rangeType, setRangeType] = useState(defaultRangeType)
  const [dateFilter, setDateFilter] = useState(defaultWeekStart)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [teamFilter, setTeamFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedMonths, setSelectedMonths] = useState([])
  const [roster, setRoster] = useState([])
  const [originalRoster, setOriginalRoster] = useState([])
  const [isDirty, setIsDirty] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [allShifts, setAllShifts] = useState(FALLBACK_SHIFTS) // ordered shift definitions
  const [initialized, setInitialized] = useState(false)
  const [shiftWindows, setShiftWindows] = useState({
    normal_start: '08:00', normal_end: '17:00',
    day_start: '07:00',    day_end: '19:00',
    night_start: '19:00',  night_end: '07:00',
  })

  const teamsRef = useRef([])
  useEffect(() => { teamsRef.current = teams }, [teams])

  const getRangeMonthCount = (value) => value === 'month' ? 12 : 0

  const getRecentMonths = (count, anchorDate = new Date()) => {
    const months = []
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return months
  }

  const addDayName = (row) => {
    const d = new Date(row.date)
    return {
      ...row,
      dayName: row.dayName || d.toLocaleDateString('en-US', { weekday: 'long' }),
    }
  }

  const effectiveMonths = useMemo(() => {
    if (selectedMonths.length) return selectedMonths
    const count = getRangeMonthCount(rangeType) || 1
    return getRecentMonths(count)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonths, rangeType])

  const baseRows = useMemo(() => {
    if (rangeType === 'all') return roster.map(addDayName)

    const skeleton = []
    if (rangeType === 'month') {
      effectiveMonths.forEach((key) => {
        const [year, month] = key.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d += 1) {
          const dateStr = `${key}-${String(d).padStart(2, '0')}`
          skeleton.push({
            date: dateStr,
            dayName: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }),
            shifts: {},
          })
        }
      })
    } else {
      const rangeStartEnd = () => {
        if (rangeType === 'day') {
          return { start: dateFilter ? new Date(dateFilter) : null, end: dateFilter ? new Date(dateFilter) : null }
        }
        if (rangeType === 'week') {
          const monday = getMonday(dateFilter ? new Date(dateFilter) : today)
          const sunday = new Date(monday)
          sunday.setDate(monday.getDate() + 6)
          return { start: monday, end: sunday }
        }
        if (rangeType === 'custom') {
          return { start: startDate ? new Date(startDate) : null, end: endDate ? new Date(endDate) : null }
        }
        return { start: null, end: null }
      }
      const { start, end } = rangeStartEnd()
      if (start && end) {
        const cur = new Date(start)
        while (cur <= end) {
          const dateStr = formatISO(cur)
          skeleton.push({
            date: dateStr,
            dayName: cur.toLocaleDateString('en-US', { weekday: 'long' }),
            shifts: {},
          })
          cur.setDate(cur.getDate() + 1)
        }
      }
    }

    const rosterMap = new Map()
    roster.forEach((r) => rosterMap.set(r.date, addDayName(r)))

    return skeleton.map((row) => {
      const match = rosterMap.get(row.date)
      if (!match) return row
      return { ...row, shifts: match.shifts ?? {} }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, rangeType, effectiveMonths, dateFilter, startDate, endDate])

  const monthOptions = useMemo(() => {
    const opts = new Map()
    const rolling = getRecentMonths(12)
    ;[...rolling, ...selectedMonths].forEach((key) => {
      const [year, month] = key.split('-').map(Number)
      if (!Number.isNaN(year) && !Number.isNaN(month)) {
        const d = new Date(year, month - 1, 1)
        opts.set(key, d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
      }
    })
    baseRows.forEach((row) => {
      const d = new Date(row.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      opts.set(key, d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    })
    return Array.from(opts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, label]) => ({ value, label }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRows, rangeType, selectedMonths])

  const getRange = () => {
    const anchor = dateFilter ? new Date(dateFilter) : today
    if (rangeType === 'day') return { start: new Date(anchor), end: new Date(anchor) }
    if (rangeType === 'week') {
      const monday = getMonday(anchor)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: monday, end: sunday }
    }
    if (rangeType === 'custom') {
      return { start: startDate ? new Date(startDate) : null, end: endDate ? new Date(endDate) : null }
    }
    return { start: null, end: null }
  }

  const scopeLabel = useMemo(() => {
    if (rangeType === 'day') return dateFilter || 'today'
    if (rangeType === 'week') {
      const { start, end } = getRange()
      if (start && end) return `${formatISO(start)} – ${formatISO(end)}`
    }
    if (rangeType === 'custom') {
      if (startDate && endDate) return `${startDate} – ${endDate}`
    }
    if (selectedMonths.length) {
      const labels = selectedMonths
        .slice()
        .sort()
        .map((m) => {
          const [y, mo] = m.split('-').map(Number)
          return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        })
      return labels.join(', ')
    }
    return 'current view'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeType, dateFilter, startDate, endDate, selectedMonths])

  const filtered = useMemo(() => {
    const { start, end } = getRange()
    return baseRows.filter((row) => {
      if (search.trim()) {
        const shiftTeams = Object.values(row.shifts || {}).map((s) => s?.team || '').join(' ')
        const hay = `${row.date} ${shiftTeams}`.toLowerCase()
        if (!hay.includes(search.trim().toLowerCase())) return false
      }
      const rowDate = new Date(row.date)
      if (rangeType === 'all') {
        // no date filtering
      } else if (rangeType === 'month') {
        if (selectedMonths.length) {
          const key = `${rowDate.getFullYear()}-${String(rowDate.getMonth() + 1).padStart(2, '0')}`
          if (!selectedMonths.includes(key)) return false
        }
      } else {
        if (start && rowDate < start) return false
        if (end && rowDate > end) return false
      }
      const matchesTeam = (shift) => teamFilter === 'All' || (shift?.team || '') === teamFilter
      return Object.values(row.shifts || {}).some(matchesTeam) || teamFilter === 'All'
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRows, dateFilter, teamFilter, search, rangeType, startDate, endDate, selectedMonths])

  const monthWeekGroups = useMemo(() => {
    const monthName = (dateStr) =>
      new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const months = new Map()
    filtered
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((row) => {
        const monthLabel = monthName(row.date)
        const dayNum = parseInt(row.date.slice(8, 10), 10)
        const weekLabel = `W${Math.ceil(dayNum / 7)}`
        if (!months.has(monthLabel)) months.set(monthLabel, new Map())
        const weekMap = months.get(monthLabel)
        if (!weekMap.has(weekLabel)) weekMap.set(weekLabel, [])
        weekMap.get(weekLabel).push(row)
      })
    return Array.from(months.entries()).map(([month, weekMap]) => ({
      month,
      weeks: Array.from(weekMap.entries()).map(([week, rows]) => ({ week, rows })),
    }))
  }, [filtered])

  // stats: { teamName: { [shiftSlug]: count, total: count } }
  const stats = useMemo(() => {
    const totals = {}
    filtered.forEach((row) => {
      Object.entries(row.shifts || {}).forEach(([slug, shiftObj]) => {
        if (!shiftObj?.team) return
        const t = shiftObj.team
        if (!totals[t]) totals[t] = { total: 0 }
        totals[t][slug] = (totals[t][slug] || 0) + 1
        totals[t].total += 1
      })
    })
    return totals
  }, [filtered])

  // monthlyStats: per-month per-team counts across all shift slugs
  const monthlyStats = useMemo(() => {
    const monthName = (dateStr) =>
      new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

    const byMonth = {}
    filtered.forEach((row) => {
      const m = monthName(row.date)
      if (!byMonth[m]) byMonth[m] = []
      byMonth[m].push(row)
    })

    const teamNames = teamsRef.current.map((t) => t.name)
    const shiftSlugs = allShifts.map((s) => s.slug)

    return Object.entries(byMonth).map(([month, rows]) => {
      const totalDays = rows.length
      const teamTotals = {}

      rows.forEach((row) => {
        Object.entries(row.shifts || {}).forEach(([slug, shiftObj]) => {
          if (!shiftObj?.team) return
          const t = shiftObj.team
          if (!teamTotals[t]) teamTotals[t] = {}
          teamTotals[t][slug] = (teamTotals[t][slug] || 0) + 1
        })
      })

      // unassigned per shift slot
      const unassigned = {}
      shiftSlugs.forEach((slug) => {
        const assigned = rows.filter((r) => r.shifts?.[slug]?.team).length
        unassigned[slug] = totalDays - assigned
      })

      const teamsData = teamNames.length
        ? teamNames.map((name) => ({ name, shifts: teamTotals[name] || {} }))
        : Object.entries(teamTotals).map(([name, shifts]) => ({ name, shifts }))

      return { month, teams: teamsData, unassigned, totalDays }
    })
  }, [filtered, teams, allShifts])

  const viewPublishStatus = useMemo(() => {
    const assigned = filtered.filter((r) => Object.keys(r.shifts || {}).length > 0)
    if (assigned.length === 0) return null
    const allPublished = assigned.every((r) =>
      Object.values(r.shifts || {}).every((s) => s?.status === 'published')
    )
    return allPublished ? 'published' : 'draft'
  }, [filtered])

  const teamStatuses = useMemo(() => {
    const base = {}
    Object.keys(stats || {}).forEach((t) => { base[t] = 'Unscheduled' })
    const todayStr = formatISO(new Date())
    const todayRow = roster.find((r) => r.date === todayStr)
    if (!todayRow) return base

    const toMinutes = (str) => {
      const [h, m] = (str || '00:00').split(':').map((n) => parseInt(n, 10))
      return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m)
    }
    const inRange = (current, start, end) => {
      if (start <= end) return current >= start && current < end
      return current >= start || current < end
    }
    const now = new Date()
    const currentMins = now.getHours() * 60 + now.getMinutes()

    // Build slug → time window map from allShifts (custom shifts carry start/end)
    // plus built-in windows from shiftWindows settings
    const shiftTimeMap = {
      day:   { start: toMinutes(shiftWindows.day_start),   end: toMinutes(shiftWindows.day_end) },
      night: { start: toMinutes(shiftWindows.night_start), end: toMinutes(shiftWindows.night_end) },
    }
    allShifts.forEach((s) => {
      if (s.builtin === false && s.start && s.end) {
        shiftTimeMap[s.slug] = { start: toMinutes(s.start), end: toMinutes(s.end) }
      }
    })

    const activeShift = Object.entries(shiftTimeMap).find(([, { start, end }]) =>
      start !== end && inRange(currentMins, start, end)
    )?.[0] ?? null

    if (activeShift) {
      const activeTeam = todayRow.shifts?.[activeShift]?.team
      if (activeTeam) base[activeTeam] = 'On Duty'
      Object.entries(todayRow.shifts || {}).forEach(([slug, s]) => {
        if (slug !== activeShift && s?.team && base[s.team] === 'Unscheduled') {
          base[s.team] = 'Next Shift'
        }
      })
    }
    return base
  }, [roster, shiftWindows, stats])

  const refreshRoster = async (teamList = teamsRef.current, statusFilter = null) => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (rangeType === 'day') {
        params.date = dateFilter
      } else if (rangeType === 'week') {
        const { start, end } = getRange()
        params.from = start ? formatISO(start) : undefined
        params.to = end ? formatISO(end) : undefined
      } else if (rangeType === 'month') {
        params.months = getRecentMonths(12)
      } else if (rangeType === 'all') {
        // no date params
      } else if (rangeType === 'custom') {
        params.from = startDate || undefined
        params.to = endDate || undefined
      }

      const resp = await fetchRosters(params)

      const mapShiftEntry = (shiftObj) => {
        if (!shiftObj) return null
        if (shiftObj.team_id) return shiftObj
        const found = teamList?.find((t) => t.name === shiftObj.team)
        return found ? { ...shiftObj, team_id: found.id } : shiftObj
      }

      const rows = (resp?.data || []).map((row) => addDayName({
        date: row.date,
        status: row.status || 'draft',
        shifts: Object.fromEntries(
          Object.entries(row.shifts || {}).map(([slug, s]) => [slug, mapShiftEntry(s)])
        ),
      }))

      setRoster(rows)
      setOriginalRoster(rows)
      setIsDirty(false)
    } catch (err) {
      setError(err.payload?.message || 'Unable to load roster.')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [teamResp, shiftResp, allShiftsResp] = await Promise.all([
          fetchTeams(),
          fetchShiftWindows().catch(() => null),
          fetchAllShifts().catch(() => null),
        ])
        const teamList = teamResp?.data || []
        setTeams(teamList)
        teamsRef.current = teamList
        if (shiftResp?.data) setShiftWindows(shiftResp.data)
        if (allShiftsResp?.data?.length) setAllShifts(allShiftsResp.data)
        await refreshRoster(teamList, publishedOnly ? 'published' : null)
      } catch (err) {
        setError(err.payload?.message || 'Unable to load roster.')
        setLoading(false)
      } finally {
        setInitialized(true)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  useEffect(() => {
    if (rangeType === 'month' && selectedMonths.length === 0) {
      setSelectedMonths(getRecentMonths(6))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeType])

  useEffect(() => {
    const handler = async () => {
      const resp = await fetchAllShifts().catch(() => null)
      if (resp?.data?.length) setAllShifts(resp.data)
    }
    window.addEventListener('custom-shifts-changed', handler)
    return () => window.removeEventListener('custom-shifts-changed', handler)
  }, [])

  useEffect(() => {
    if (!enabled || !initialized) return
    refreshRoster(teamsRef.current, publishedOnly ? 'published' : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, initialized, rangeType, dateFilter, startDate, endDate, selectedMonths])

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const handlePrev = () => {
    if (rangeType === 'day') {
      const d = new Date(dateFilter); d.setDate(d.getDate() - 1); setDateFilter(formatISO(d))
    } else if (rangeType === 'week') {
      const d = new Date(dateFilter); d.setDate(d.getDate() - 7); setDateFilter(formatISO(d))
    } else if (rangeType === 'month') {
      setSelectedMonths(selectedMonths.map((m) => {
        const [y, mo] = m.split('-').map(Number)
        const d = new Date(y, mo - 2, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }))
    }
  }

  const handleNext = () => {
    if (rangeType === 'day') {
      const d = new Date(dateFilter); d.setDate(d.getDate() + 1); setDateFilter(formatISO(d))
    } else if (rangeType === 'week') {
      const d = new Date(dateFilter); d.setDate(d.getDate() + 7); setDateFilter(formatISO(d))
    } else if (rangeType === 'month') {
      setSelectedMonths(selectedMonths.map((m) => {
        const [y, mo] = m.split('-').map(Number)
        const d = new Date(y, mo, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      }))
    }
  }

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const handleRangeChange = (value) => {
    setRangeType(value)
    if (value === 'month') setSelectedMonths(getRecentMonths(6))
    else setSelectedMonths([])
  }

  const handleClear = () => {
    setDateFilter(defaultWeekStart)
    setStartDate('')
    setEndDate('')
    setTeamFilter('All')
    setSearch('')
    if (rangeType === 'month') setSelectedMonths(getRecentMonths(6))
    setEditMode(false)
    if (isDirty) {
      setRoster(originalRoster)
      setIsDirty(false)
    }
  }

  const handleAssign = (date, shiftSlug, teamId) => {
    if (teamId !== null) {
      const existing = roster.find((r) => r.date === date)
      const otherShifts = Object.entries(existing?.shifts || {}).filter(([s]) => s !== shiftSlug)
      const conflict = otherShifts.find(([, s]) => s?.team_id && String(s.team_id) === String(teamId))
      if (conflict) {
        setError(`A team cannot be assigned to more than one shift on the same date.`)
        setTimeout(() => setError(null), 4000)
        return
      }
    }
    setError(null)
    setRoster((prev) => {
      const next = [...prev]
      const idx = next.findIndex((r) => r.date === date)
      const teamObj = teamsRef.current.find((t) => String(t.id) === String(teamId))
      const payload = teamObj ? { team_id: teamObj.id, team: teamObj.name } : null
      if (idx > -1) {
        next[idx] = {
          ...next[idx],
          shifts: { ...next[idx].shifts, [shiftSlug]: payload },
        }
      } else {
        next.push({ date, shifts: { [shiftSlug]: payload } })
      }
      return next
    })
    setIsDirty(true)
  }

  const handleCancelEdit = () => {
    if (isDirty) { setRoster(originalRoster); setIsDirty(false) }
    setEditMode(false)
  }

  // Build entries array for save/publish: [{ date, shifts: [{ shift, team_id }] }]
  const buildEntries = () =>
    filtered.map((row) => ({
      date: row.date,
      shifts: allShifts.map((s) => ({
        shift:   s.slug,
        team_id: row.shifts?.[s.slug]?.team_id != null ? Number(row.shifts[s.slug].team_id) : null,
      })),
    }))

  const handleSaveDraft = async () => {
    const entries = buildEntries()
    if (entries.length === 0) {
      setStatusMessage('Nothing to save.')
      setTimeout(() => setStatusMessage(null), 2500)
      setEditMode(false)
      return
    }
    setIsSavingDraft(true)
    setError(null)
    try {
      await saveRosters(entries)
      setStatusMessage(`Draft saved for ${scopeLabel}.`)
      setTimeout(() => setStatusMessage(null), 3500)
      setEditMode(false)
      setIsDirty(false)
      await refreshRoster()
    } catch (err) {
      setError(err.payload?.message || 'Unable to save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePublish = async () => {
    const entries = buildEntries()
    if (entries.length === 0) {
      setStatusMessage('Nothing to publish.')
      setTimeout(() => setStatusMessage(null), 2500)
      setEditMode(false)
      return
    }
    setIsPublishing(true)
    setError(null)
    try {
      await publishRosters(entries, scopeLabel)
      setStatusMessage(`Roster published for ${scopeLabel}. Teams have been notified.`)
      setTimeout(() => setStatusMessage(null), 5000)
      setEditMode(false)
      setIsDirty(false)
      await refreshRoster()
    } catch (err) {
      setError(err.payload?.message || 'Unable to publish roster.')
    } finally {
      setIsPublishing(false)
    }
  }

  return {
    state: {
      rangeType, dateFilter, startDate, endDate, teamFilter, search, selectedMonths,
      editMode, isSavingDraft, isPublishing, isDirty, statusMessage, error, loading,
      monthOptions, monthWeekGroups, filteredRows: filtered,
      stats, monthlyStats, teams, allShifts, teamStatuses, scopeLabel, viewPublishStatus,
    },
    actions: {
      setDateFilter, setStartDate, setEndDate, setTeamFilter, setSearch,
      setSelectedMonths, setEditMode, handleRangeChange, handleClear,
      handleAssign, handleSaveDraft, handlePublish, handleCancelEdit,
      handlePrev, handleNext,
      onMonthToggle: (value, checked) =>
        setSelectedMonths((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value))),
    },
  }
}

export default useRosterState
