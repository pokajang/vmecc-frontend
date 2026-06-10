import { useEffect, useState } from 'react'
import { apiRequest } from 'src/services/apiClient'

export default function useLeaveGuidanceMessage({
  shouldShowLeaveGuidanceMessage,
  startDate,
  endDate,
  startTimeSlot,
  endTimeSlot,
  requestedDays,
  formatDayCount,
}) {
  const [leaveGuidanceMessage, setLeaveGuidanceMessage] = useState('')

  useEffect(() => {
    if (!shouldShowLeaveGuidanceMessage) {
      return
    }

    let active = true
    const query = new URLSearchParams({
      start_date: String(startDate),
      end_date: String(endDate),
      start_time_slot: String(startTimeSlot || ''),
      end_time_slot: String(endTimeSlot || ''),
      submitted_days: String(requestedDays || 0),
    })

    apiRequest(`/leave/compute-days?${query.toString()}`)
      .then((result) => {
        if (!active) return
        const computedDays = Number(result?.meta?.computed_days ?? result?.data?.computed_days ?? 0)
        if (!Number.isFinite(computedDays) || computedDays <= 0) {
          setLeaveGuidanceMessage('')
          return
        }
        if (Math.abs(computedDays - Number(requestedDays || 0)) > 0.0001) {
          setLeaveGuidanceMessage(
            `Recommended leave days based on weekends/public holidays is ${formatDayCount(computedDays)} day(s).`,
          )
          return
        }
        setLeaveGuidanceMessage('Selected leave days align with holiday guidance.')
      })
      .catch(() => {
        if (!active) return
        setLeaveGuidanceMessage('')
      })

    return () => {
      active = false
    }
  }, [
    endDate,
    endTimeSlot,
    formatDayCount,
    requestedDays,
    shouldShowLeaveGuidanceMessage,
    startDate,
    startTimeSlot,
  ])

  return leaveGuidanceMessage
}
