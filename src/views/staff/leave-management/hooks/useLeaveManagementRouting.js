import { useCallback, useMemo } from 'react'

const LEAVE_ROUTE_KEY_SEPARATOR = '::'

const decodeRouteKey = (routeValue) => {
  try {
    return decodeURIComponent(String(routeValue || ''))
  } catch {
    return String(routeValue || '')
  }
}

const buildCompositeLeaveRecordKey = (ownerUserId, leaveId) =>
  `${String(ownerUserId || '')}${LEAVE_ROUTE_KEY_SEPARATOR}${String(leaveId || '')}`

const LEAVE_MANAGEMENT_TAB_BY_SLUG = {
  leaves: 'records',
  'set-leaves': 'assignments',
  'set-holidays': 'holidays',
  rules: 'rules',
}
const LEAVE_MANAGEMENT_PATH_BY_TAB = {
  records: 'leaves',
  assignments: 'set-leaves',
  holidays: 'set-holidays',
  rules: 'rules',
}
const DEFAULT_LEAVE_MANAGEMENT_TAB = 'records'

export default function useLeaveManagementRouting({
  location,
  navigate,
  leaveId,
  hydrateAssignmentsFromStorage,
}) {
  const isDetailSection = leaveId !== undefined

  const tabFromPath = useMemo(() => {
    const parts = String(location.pathname || '')
      .split('/')
      .filter(Boolean)
    const last = parts[parts.length - 1] || ''
    return LEAVE_MANAGEMENT_TAB_BY_SLUG[last] || ''
  }, [location.pathname])

  const detailReturnTab = ['records', 'assignments', 'holidays', 'rules'].includes(
    location.state?.tab,
  )
    ? location.state.tab
    : DEFAULT_LEAVE_MANAGEMENT_TAB

  const resolvedManagementTab = isDetailSection
    ? detailReturnTab
    : tabFromPath || DEFAULT_LEAVE_MANAGEMENT_TAB

  const resolvedManagementPath =
    LEAVE_MANAGEMENT_PATH_BY_TAB[resolvedManagementTab] ||
    LEAVE_MANAGEMENT_PATH_BY_TAB[DEFAULT_LEAVE_MANAGEMENT_TAB]

  const switchManagementTab = useCallback(
    (nextTab) => {
      const nextPath = LEAVE_MANAGEMENT_PATH_BY_TAB[nextTab]
      if (!nextPath) return
      navigate(`/staff/leave-management/${nextPath}`, { replace: true })
      if (nextTab === 'assignments') hydrateAssignmentsFromStorage()
    },
    [hydrateAssignmentsFromStorage, navigate],
  )

  const leaveRouteValue = useMemo(() => decodeRouteKey(leaveId), [leaveId])
  const parsedRouteRecordKey = useMemo(() => {
    if (!leaveRouteValue) return null
    if (!leaveRouteValue.includes(LEAVE_ROUTE_KEY_SEPARATOR)) return null
    return leaveRouteValue
  }, [leaveRouteValue])

  const openRecord = useCallback(
    (row) => {
      if (!row?.id) return
      const recordKey = String(
        row?.recordKey || buildCompositeLeaveRecordKey(row?.ownerUserId || '', row?.id),
      ).trim()
      if (!recordKey) return
      navigate(`/staff/leave-management/record/${encodeURIComponent(recordKey)}`, {
        state: { tab: resolvedManagementTab },
      })
    },
    [navigate, resolvedManagementTab],
  )

  return {
    isDetailSection,
    resolvedManagementTab,
    resolvedManagementPath,
    switchManagementTab,
    leaveRouteValue,
    parsedRouteRecordKey,
    openRecord,
  }
}
