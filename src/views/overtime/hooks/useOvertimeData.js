import { useEffect, useState } from 'react'
import {
  loadMyOvertimeDraftApiFirst,
  loadMyOvertimePolicyApiFirst,
  loadMyOvertimeRecordsApiFirst,
} from 'src/services/overtimeApi'
import { createPayrollRequestContext } from 'src/services/payrollPrivacy'
import { DEFAULT_OVERTIME_APPROVAL_RULES, normalizeOvertimeApprovalRules } from '../overtimePolicy'
import { normalizeOvertimeDraftPayload } from '../domain/overtimeFormDomain'

const useOvertimeData = ({
  userId,
  canUseOvertimeModule,
  isOvertimeEligibilityLoading,
  overtimeEligibilityResolved,
  isOvertimeEligibleEffective,
  pushToast,
  onHydrationStart,
}) => {
  const [overtimePolicy, setOvertimePolicy] = useState(() =>
    normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES),
  )
  const [overtimeRecords, setOvertimeRecords] = useState([])
  const [overtimeDraft, setOvertimeDraft] = useState(null)
  const [isOvertimeLoading, setIsOvertimeLoading] = useState(true)
  const [isApiUnavailable, setIsApiUnavailable] = useState(false)
  const [hydratedUserId, setHydratedUserId] = useState('')

  useEffect(() => {
    if (!userId) return undefined
    if (canUseOvertimeModule && isOvertimeEligibilityLoading) return undefined
    const requestContext = createPayrollRequestContext(userId)
    const hydrateRows = async () => {
      if (canUseOvertimeModule && overtimeEligibilityResolved && !isOvertimeEligibleEffective) {
        setHydratedUserId(String(userId))
        setOvertimeRecords([])
        setOvertimeDraft(null)
        setIsApiUnavailable(false)
        setIsOvertimeLoading(false)
        return
      }

      if (typeof onHydrationStart === 'function') onHydrationStart()

      setIsOvertimeLoading(true)
      const [loadedPolicy, loadedRecords, loadedDraft] = await Promise.all([
        loadMyOvertimePolicyApiFirst({ signal: requestContext.signal }),
        loadMyOvertimeRecordsApiFirst(userId, {}, { signal: requestContext.signal }),
        loadMyOvertimeDraftApiFirst(userId, { signal: requestContext.signal }),
      ])
      if (!requestContext.isCurrent()) return

      setHydratedUserId(String(userId))
      setOvertimePolicy(
        normalizeOvertimeApprovalRules(loadedPolicy?.data || DEFAULT_OVERTIME_APPROVAL_RULES),
      )

      const loadedRows = Array.isArray(loadedRecords?.data) ? loadedRecords.data : []
      setOvertimeRecords(loadedRows.map((row) => ({ ...row })))
      setOvertimeDraft(normalizeOvertimeDraftPayload(loadedDraft?.data))
      setIsApiUnavailable(!loadedRecords?.ok || !loadedDraft?.ok)
      setIsOvertimeLoading(false)

      if (!loadedRecords?.ok) {
        pushToast?.('Unable to load overtime records from API.', {
          title: 'Load failed',
          color: 'danger',
        })
      }

      if (!loadedPolicy?.ok) {
        pushToast?.('Unable to load overtime policy. Using default policy.', {
          title: 'Policy fallback',
          color: 'warning',
        })
      }
    }

    void hydrateRows().finally(requestContext.release)
    return requestContext.abort
  }, [
    canUseOvertimeModule,
    isOvertimeEligibilityLoading,
    isOvertimeEligibleEffective,
    onHydrationStart,
    overtimeEligibilityResolved,
    pushToast,
    userId,
  ])

  const hasCurrentIdentity = String(userId || '') === hydratedUserId

  return {
    overtimePolicy: hasCurrentIdentity
      ? overtimePolicy
      : normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES),
    setOvertimePolicy,
    overtimeRecords: hasCurrentIdentity ? overtimeRecords : [],
    setOvertimeRecords,
    overtimeDraft: hasCurrentIdentity ? overtimeDraft : null,
    setOvertimeDraft,
    isOvertimeLoading: userId ? !hasCurrentIdentity || isOvertimeLoading : false,
    setIsOvertimeLoading,
    isApiUnavailable: hasCurrentIdentity ? isApiUnavailable : false,
  }
}

export default useOvertimeData
