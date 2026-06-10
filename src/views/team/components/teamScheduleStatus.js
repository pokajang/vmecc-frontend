const DEFAULT_SHIFT_WINDOWS = {
  day_start: '07:00',
  day_end: '19:00',
  night_start: '19:00',
  night_end: '07:00',
}

const toMinutes = (value) => {
  const [hoursRaw, minutesRaw] = String(value || '00:00')
    .split(':')
    .map((part) => Number.parseInt(part, 10))
  return (Number.isNaN(hoursRaw) ? 0 : hoursRaw) * 60 + (Number.isNaN(minutesRaw) ? 0 : minutesRaw)
}

const inRange = (current, start, end) => {
  if (start <= end) return current >= start && current < end
  return current >= start || current < end
}

const formatRosterDate = (value) => {
  const [year, month, day] = String(value || '')
    .slice(0, 10)
    .split('-')
  if (!year || !month || !day) return String(value || '').trim()
  return `${day}-${month}-${year}`
}

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const formatShiftName = (slug, shiftObj = {}) => {
  const label = String(shiftObj?.name || shiftObj?.label || '').trim()
  if (label) return label
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const getShiftStart = (slug, shiftObj = {}, shiftWindows = DEFAULT_SHIFT_WINDOWS) => {
  if (shiftObj?.start) return toMinutes(shiftObj.start)
  if (slug === 'day') return toMinutes(shiftWindows.day_start)
  if (slug === 'night') return toMinutes(shiftWindows.night_start)
  return 0
}

const getShiftEnd = (slug, shiftObj = {}, shiftWindows = DEFAULT_SHIFT_WINDOWS) => {
  if (shiftObj?.end) return toMinutes(shiftObj.end)
  if (slug === 'day') return toMinutes(shiftWindows.day_end)
  if (slug === 'night') return toMinutes(shiftWindows.night_end)
  return getShiftStart(slug, shiftObj, shiftWindows)
}

const belongsToTeam = (team, shiftObj = {}) => {
  if (!team || !shiftObj) return false
  if (shiftObj.team_id != null && String(shiftObj.team_id) === String(team.id)) return true
  const shiftTeam = String(shiftObj.team || '')
    .trim()
    .toLowerCase()
  const teamName = String(team.name || '')
    .trim()
    .toLowerCase()
  return Boolean(shiftTeam && teamName && shiftTeam === teamName)
}

export const resolveTeamScheduleStatus = ({
  team,
  rosterRows = [],
  shiftWindows = DEFAULT_SHIFT_WINDOWS,
  now = new Date(),
}) => {
  if (!team) return 'Unscheduled'

  const today = formatDateKey(now)
  const yesterday = formatDateKey(addDays(now, -1))
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const rows = (Array.isArray(rosterRows) ? rosterRows : [])
    .filter((row) => String(row?.date || '').slice(0, 10) >= yesterday)
    .sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')))

  const entries = rows.flatMap((row) =>
    Object.entries(row?.shifts || {})
      .filter(([, shiftObj]) => belongsToTeam(team, shiftObj))
      .map(([slug, shiftObj]) => ({
        date: String(row?.date || '').slice(0, 10),
        slug,
        shiftObj,
        start: getShiftStart(slug, shiftObj, shiftWindows),
        end: getShiftEnd(slug, shiftObj, shiftWindows),
      })),
  )

  const activeEntry = entries.find((entry) => {
    if (entry.date === today) return inRange(currentMinutes, entry.start, entry.end)
    return entry.date === yesterday && entry.start > entry.end && currentMinutes < entry.end
  })
  if (activeEntry) {
    return `On Duty - ${formatShiftName(activeEntry.slug, activeEntry.shiftObj)} ${formatRosterDate(activeEntry.date)}`
  }

  const todayEntries = entries.filter((entry) => entry.date === today)
  const nextTodayEntry = todayEntries
    .filter((entry) => entry.start >= currentMinutes)
    .sort((a, b) => a.start - b.start)[0]
  if (nextTodayEntry) {
    return `Next Shift - ${formatShiftName(nextTodayEntry.slug, nextTodayEntry.shiftObj)} ${formatRosterDate(nextTodayEntry.date)}`
  }

  const upcomingEntry = entries
    .filter((entry) => entry.date > today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.start - b.start
    })[0]
  if (upcomingEntry) {
    return `Upcoming Shift - ${formatShiftName(upcomingEntry.slug, upcomingEntry.shiftObj)} ${formatRosterDate(upcomingEntry.date)}`
  }

  return 'Unscheduled'
}

export const resolveTeamScheduleStatusMap = ({
  teams = [],
  rosterRows = [],
  shiftWindows = DEFAULT_SHIFT_WINDOWS,
  now = new Date(),
}) =>
  (Array.isArray(teams) ? teams : []).reduce((acc, team) => {
    if (team?.id == null) return acc
    acc[team.id] = resolveTeamScheduleStatus({ team, rosterRows, shiftWindows, now })
    return acc
  }, {})
