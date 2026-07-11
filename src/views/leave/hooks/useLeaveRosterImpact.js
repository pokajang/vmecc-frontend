import { useEffect, useState } from 'react'
import { loadLeaveRosterImpact } from '../leavePersistence'

export default function useLeaveRosterImpact({
  startDate,
  endDate,
  workShift,
  startTimeSlot,
  endTimeSlot,
}) {
  const [impact, setImpact] = useState(null)
  const requestKey = `${startDate}|${endDate}|${workShift}|${startTimeSlot}|${endTimeSlot}`

  useEffect(() => {
    if (!startDate || !endDate) {
      return undefined
    }

    let active = true
    const timeout = setTimeout(async () => {
      const result = await loadLeaveRosterImpact({
        start_date: startDate,
        end_date: endDate,
        work_shift: workShift,
        start_time_slot: startTimeSlot,
        end_time_slot: endTimeSlot,
      })
      if (active) setImpact({ key: requestKey, data: result.ok ? result.data : null })
    }, 250)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [endDate, endTimeSlot, requestKey, startDate, startTimeSlot, workShift])

  return startDate && endDate && impact?.key === requestKey ? impact.data : null
}
