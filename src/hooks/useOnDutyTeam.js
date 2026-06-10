import { useEffect, useState } from 'react'
import { fetchRosters, fetchShiftWindows } from 'src/services/apiClient'

const toMinutes = (str) => {
  const [h, m] = (str || '00:00').split(':').map(Number)
  return h * 60 + m
}

const inRange = (current, start, end) => {
  if (start <= end) return current >= start && current < end
  return current >= start || current < end // crosses midnight
}

const useOnDutyTeam = () => {
  const [onDuty, setOnDuty] = useState(null) // { team: string, shift: 'day'|'night' }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const today = new Date().toLocaleDateString('en-CA')
        const [rosterResp, shiftResp] = await Promise.all([
          fetchRosters({ date: today, status: 'published' }),
          fetchShiftWindows().catch(() => null),
        ])

        if (cancelled) return

        const rows = rosterResp?.data || []
        const row = rows[0]
        if (!row) {
          setOnDuty(null)
          return
        }

        const windows = shiftResp?.data || {
          day_start: '07:00',
          day_end: '19:00',
          night_start: '19:00',
          night_end: '07:00',
        }

        const now = new Date()
        const currentMins = now.getHours() * 60 + now.getMinutes()
        const dayStart = toMinutes(windows.day_start)
        const dayEnd = toMinutes(windows.day_end)
        const nightStart = toMinutes(windows.night_start)
        const nightEnd = toMinutes(windows.night_end)

        const activeShift = inRange(currentMins, dayStart, dayEnd)
          ? 'day'
          : inRange(currentMins, nightStart, nightEnd)
            ? 'night'
            : null

        if (!activeShift) {
          setOnDuty(null)
          return
        }

        const team = activeShift === 'day' ? row.dayShift?.team : row.nightShift?.team
        setOnDuty(team ? { team, shift: activeShift } : null)
      } catch {
        setOnDuty(null)
      }
    }

    load()
    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return onDuty
}

export default useOnDutyTeam
