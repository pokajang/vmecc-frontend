import { useCallback, useEffect, useState } from 'react'
import { CToast, CToastBody, CToastHeader } from '@coreui/react'
import { leaveEntitlementRows } from '../data'
import { loadLeaveAssignments } from '../leaveAssignmentStorage'
import { deleteHoliday, loadHolidays, updateHoliday } from '../holidayApi'
import { loadAllLeaveRecords } from 'src/views/leave/leavePersistence'

const isExactDemoAssignmentRow = (row) =>
  leaveEntitlementRows.some(
    (seed) =>
      String(seed.id || '') === String(row?.id || '') &&
      Number(seed.year || 0) === Number(row?.year || 0) &&
      String(seed.employee || '') === String(row?.employee || '') &&
      String(seed.team || '') === String(row?.team || '') &&
      String(seed.leaveType || '') === String(row?.leaveType || '') &&
      Number(seed.entitlement || 0) === Number(row?.entitlement || 0) &&
      Number(seed.used || 0) === Number(row?.used || 0) &&
      Number(seed.pending || 0) === Number(row?.pending || 0),
  )

const sanitizeLoadedAssignments = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : []
  return safeRows.filter((row) => !isExactDemoAssignmentRow(row))
}

export default function useLeaveManagementDataActions({ userId, isHrUser, holidayYearFilter }) {
  const [assignmentRows, setAssignmentRows] = useState([])
  const [allLeaveRecords, setAllLeaveRecords] = useState([])
  const [holidayRows, setHolidayRows] = useState([])
  const [isLeaveRecordsLoading, setIsLeaveRecordsLoading] = useState(false)
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false)
  const [isHolidaysLoading, setIsHolidaysLoading] = useState(false)
  const [toast, addToast] = useState(null)

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const hydrateAssignmentsFromStorage = useCallback(async () => {
    setIsAssignmentsLoading(true)
    try {
      const result = await loadLeaveAssignments(userId)
      const rows = Array.isArray(result?.rows) ? result.rows : []
      setAssignmentRows(sanitizeLoadedAssignments(rows))
    } catch {
      setAssignmentRows([])
    } finally {
      setIsAssignmentsLoading(false)
    }
  }, [userId])

  const refreshAllLeaveRecords = useCallback(
    async ({ showWarningToast = true } = {}) => {
      setIsLeaveRecordsLoading(true)
      try {
        const result = await loadAllLeaveRecords()
        setAllLeaveRecords(Array.isArray(result?.data) ? result.data : [])
        return result
      } catch {
        if (showWarningToast) {
          pushToast('Unable to load leave records.', {
            title: 'Load error',
            color: 'warning',
          })
        }
        return { ok: false, data: [] }
      } finally {
        setIsLeaveRecordsLoading(false)
      }
    },
    [pushToast],
  )

  const hydrateHolidaysFromApi = useCallback(async () => {
    if (!isHrUser) return
    setIsHolidaysLoading(true)
    const result = await loadHolidays()
    setIsHolidaysLoading(false)
    if (result.ok) {
      setHolidayRows(result.rows)
    } else {
      pushToast(result.error || 'Unable to load holidays.', {
        title: 'Load error',
        color: 'warning',
      })
    }
  }, [isHrUser, pushToast])

  useEffect(() => {
    hydrateAssignmentsFromStorage()
  }, [hydrateAssignmentsFromStorage])

  useEffect(() => {
    if (!userId || !isHrUser) return
    refreshAllLeaveRecords({ showWarningToast: true })
  }, [isHrUser, refreshAllLeaveRecords, userId])

  useEffect(() => {
    if (!userId || !isHrUser) return
    hydrateHolidaysFromApi()
  }, [hydrateHolidaysFromApi, isHrUser, userId])

  const onSaveHoliday = useCallback(
    async ({ id, name, date, scope, state }, options = {}) => {
      const isSilent = Boolean(options?.silent)
      if (!name || !date) {
        return { ok: false, error: 'Holiday name and date are required.' }
      }

      const result = await updateHoliday(id, { name, date, scope, state })
      if (!result.ok) return result

      if (result.row) {
        setHolidayRows((prev) => {
          const exists = prev.some((r) => String(r.id) === String(result.row.id))
          if (exists)
            return prev.map((r) => (String(r.id) === String(result.row.id) ? result.row : r))
          return [result.row, ...prev]
        })
      } else {
        await hydrateHolidaysFromApi()
      }

      if (!isSilent) {
        pushToast(`Holiday ${id ? 'updated' : 'saved'}: ${name} (${date}).`, {
          title: id ? 'Updated' : 'Saved',
          color: 'success',
        })
      }

      return { ok: true }
    },
    [hydrateHolidaysFromApi, pushToast],
  )

  const onWizardSavedSummary = useCallback(
    ({ nationalCount = 0, additionalCount = 0 } = {}) => {
      const parts = []
      if (nationalCount > 0) parts.push(`${nationalCount} national`)
      if (additionalCount > 0) parts.push(`${additionalCount} additional`)
      const message =
        parts.length > 0
          ? `Saved ${parts.join(' and ')} holiday${nationalCount + additionalCount !== 1 ? 's' : ''}.`
          : 'Holidays saved.'
      pushToast(message, { title: 'Holidays Saved', color: 'success' })
      hydrateHolidaysFromApi()
    },
    [hydrateHolidaysFromApi, pushToast],
  )

  const onDeleteHoliday = useCallback(
    async ({ id, name } = {}) => {
      if (!id) return { ok: false, error: 'Missing holiday ID.' }
      const result = await deleteHoliday(id)
      if (!result.ok) return result
      setHolidayRows((prev) => prev.filter((r) => String(r.id) !== String(id)))
      pushToast(`Holiday deleted: ${name || id}.`, { title: 'Deleted', color: 'success' })
      return { ok: true }
    },
    [pushToast],
  )

  const existingNationalDefaultsForYear = (Array.isArray(holidayRows) ? holidayRows : []).filter(
    (row) =>
      row?.isDefaultNational &&
      Number(row?.year || new Date(row?.date).getFullYear()) ===
        (holidayYearFilter && holidayYearFilter !== 'All'
          ? Number(holidayYearFilter)
          : new Date().getFullYear()),
  )

  return {
    assignmentRows,
    allLeaveRecords,
    holidayRows,
    isLeaveRecordsLoading,
    isAssignmentsLoading,
    isHolidaysLoading,
    toast,
    pushToast,
    hydrateAssignmentsFromStorage,
    refreshAllLeaveRecords,
    onSaveHoliday,
    onWizardSavedSummary,
    onDeleteHoliday,
    existingNationalDefaultsForYear,
  }
}
