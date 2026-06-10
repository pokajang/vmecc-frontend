import { useEffect, useState } from 'react'
import {
  loadMyOvertimeDraftApiFirst,
  loadMyOvertimePolicyApiFirst,
  loadMyOvertimeRecordsApiFirst,
} from 'src/services/overtimeApi'
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

  useEffect(() => {
    if (!userId) return
    if (canUseOvertimeModule && isOvertimeEligibilityLoading) return
    let active = true
    const hydrateRows = async () => {
      if (canUseOvertimeModule && overtimeEligibilityResolved && !isOvertimeEligibleEffective) {
        setOvertimeRecords([])
        setOvertimeDraft(null)
        setIsOvertimeLoading(false)
        return
      }

      if (typeof onHydrationStart === 'function') onHydrationStart()

      setIsOvertimeLoading(true)
      const [loadedPolicy, loadedRecords, loadedDraft] = await Promise.all([
        loadMyOvertimePolicyApiFirst(),
        loadMyOvertimeRecordsApiFirst(userId),
        loadMyOvertimeDraftApiFirst(userId),
      ])
      if (!active) return

      const normalizedPolicy = normalizeOvertimeApprovalRules(
        loadedPolicy?.data || DEFAULT_OVERTIME_APPROVAL_RULES,
      )
      setOvertimePolicy(normalizedPolicy)

      const loadedRows = Array.isArray(loadedRecords?.data) ? loadedRecords.data : []
      setOvertimeRecords(loadedRows.map((row) => ({ ...row })))
      setOvertimeDraft(normalizeOvertimeDraftPayload(loadedDraft?.data))
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

    hydrateRows()
    return () => {
      active = false
    }
  }, [
    canUseOvertimeModule,
    isOvertimeEligibilityLoading,
    isOvertimeEligibleEffective,
    onHydrationStart,
    overtimeEligibilityResolved,
    pushToast,
    userId,
  ])

  return {
    overtimePolicy,
    setOvertimePolicy,
    overtimeRecords,
    setOvertimeRecords,
    overtimeDraft,
    setOvertimeDraft,
    isOvertimeLoading,
    setIsOvertimeLoading,
  }
}

export default useOvertimeData
