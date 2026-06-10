import { useEffect } from 'react'
import { parseTimestamp } from '../utils/claimFormUtils'
import { createSalaryItem, hasDraftContent, normalizeItem } from '../utils/salaryClaimUtils'

const useSalaryClaimHydration = ({
  periodValue,
  periodConfirmedProp,
  periodConfirmed,
  headerPeriod,
  localAutosaveKey,
  draftPayload,
  hasHydratedDraftRef,
  setSavedItems,
  setDraftItem,
  setHeader,
  setShowForm,
  setActiveDraftId,
  setActiveDraftBackendId,
  setPayrollBaselineConfirmed,
  setPeriodConfirmed,
  onPeriodChange,
  onPeriodConfirmedChange,
  setLastSavedSnapshot,
  buildSnapshot,
  initialSnapshot,
  pushToast,
  previousPeriodRef,
  hasInitializedPeriodRef,
}) => {
  useEffect(() => {
    if (periodValue !== headerPeriod) {
      setHeader((prev) => ({ ...prev, period: periodValue || '' }))
    }
  }, [headerPeriod, periodValue, setHeader])

  useEffect(() => {
    if (periodConfirmedProp !== periodConfirmed) {
      setPeriodConfirmed(Boolean(periodConfirmedProp))
    }
  }, [periodConfirmed, periodConfirmedProp, setPeriodConfirmed])

  useEffect(() => {
    hasHydratedDraftRef.current = true
    let recovered = null
    try {
      const raw = localStorage.getItem(localAutosaveKey)
      recovered = raw ? JSON.parse(raw) : null
    } catch {
      recovered = null
    }
    const hasRecoveredLocal = hasDraftContent(recovered)
    const hasBackendDraft = Boolean(draftPayload && hasDraftContent(draftPayload))
    const useRecoveredLocal =
      hasRecoveredLocal &&
      (!hasBackendDraft ||
        parseTimestamp(recovered?.updatedAt) > parseTimestamp(draftPayload?.updatedAt))

    const sourceDraft =
      useRecoveredLocal && hasBackendDraft
        ? {
            ...draftPayload,
            ...recovered,
            id: recovered?.id || draftPayload?.id || null,
            backendId: recovered?.backendId || draftPayload?.backendId || null,
            backendDraftId: recovered?.backendDraftId || draftPayload?.backendDraftId || null,
          }
        : useRecoveredLocal
          ? recovered
          : hasBackendDraft
            ? draftPayload
            : null

    if (sourceDraft) {
      const resolvedPeriod = periodValue || sourceDraft.period || ''
      const periodChangedFromDraft =
        Boolean(periodValue) && Boolean(sourceDraft.period) && periodValue !== sourceDraft.period
      const nextSavedItems = Array.isArray(sourceDraft.savedItems)
        ? sourceDraft.savedItems.map((item) => normalizeItem(item))
        : []
      const nextDraftItem = normalizeItem({
        ...createSalaryItem(),
        ...(sourceDraft.draftItem || {}),
      })
      const nextPeriodConfirmed =
        typeof sourceDraft.periodConfirmed === 'boolean'
          ? sourceDraft.periodConfirmed
          : Boolean(periodConfirmedProp)
      const nextBaselineConfirmed = periodChangedFromDraft
        ? false
        : Boolean(sourceDraft.payrollBaselineConfirmed)
      setSavedItems(nextSavedItems)
      setDraftItem(nextDraftItem)
      setHeader((prev) => ({ ...prev, period: resolvedPeriod || prev.period }))
      setShowForm(false)
      setActiveDraftId(sourceDraft.id || null)
      setActiveDraftBackendId(Number(sourceDraft.backendId || 0) || null)
      setPayrollBaselineConfirmed(nextBaselineConfirmed)
      if (!periodValue && sourceDraft.period && onPeriodChange) {
        onPeriodChange(sourceDraft.period)
      }
      if (typeof sourceDraft.periodConfirmed === 'boolean') {
        setPeriodConfirmed(sourceDraft.periodConfirmed)
        if (onPeriodConfirmedChange) {
          onPeriodConfirmedChange(sourceDraft.periodConfirmed)
        }
      }
      setLastSavedSnapshot(
        buildSnapshot({
          period: resolvedPeriod || '',
          periodConfirmed: nextPeriodConfirmed,
          savedItems: nextSavedItems,
          draftItem: nextDraftItem,
          payrollBaselineConfirmed: nextBaselineConfirmed,
        }),
      )
      if (useRecoveredLocal) {
        pushToast('Recovered newer local draft data.', {
          title: 'Local draft restored',
          color: 'info',
        })
      }
      return
    }

    const periodFromParent = String(periodValue || '').trim()
    if (!hasRecoveredLocal) {
      setLastSavedSnapshot(
        buildSnapshot({
          period: periodFromParent,
          periodConfirmed: Boolean(periodConfirmedProp),
          savedItems: [],
          draftItem: createSalaryItem(),
          payrollBaselineConfirmed: false,
        }),
      )
      return
    }
    const recoveredPeriod = String(recovered?.period || '').trim() || periodFromParent
    const recoveredSavedItems = Array.isArray(recovered?.savedItems)
      ? recovered.savedItems.map((item) => normalizeItem(item))
      : []
    const recoveredDraftItem = normalizeItem({
      ...createSalaryItem(),
      ...(recovered?.draftItem || {}),
    })
    const recoveredPeriodConfirmed = Boolean(recovered?.periodConfirmed)
    const recoveredBaselineConfirmed = Boolean(recovered?.payrollBaselineConfirmed)
    setSavedItems(recoveredSavedItems)
    setDraftItem(recoveredDraftItem)
    setHeader((prev) => ({ ...prev, period: recoveredPeriod || prev.period }))
    setShowForm(false)
    setActiveDraftId(recovered?.id || null)
    setActiveDraftBackendId(Number(recovered?.backendId || 0) || null)
    setPayrollBaselineConfirmed(recoveredBaselineConfirmed)
    setPeriodConfirmed(recoveredPeriodConfirmed)
    if (recoveredPeriod && recoveredPeriod !== periodFromParent && onPeriodChange) {
      onPeriodChange(recoveredPeriod)
    }
    if (onPeriodConfirmedChange) {
      onPeriodConfirmedChange(recoveredPeriodConfirmed)
    }
    setLastSavedSnapshot(initialSnapshot)
    pushToast('Recovered your unsaved salary claim form from local backup.', {
      title: 'Draft recovered',
      color: 'info',
    })
  }, [
    buildSnapshot,
    draftPayload,
    hasHydratedDraftRef,
    initialSnapshot,
    localAutosaveKey,
    onPeriodChange,
    onPeriodConfirmedChange,
    periodConfirmedProp,
    periodValue,
    pushToast,
    setActiveDraftBackendId,
    setActiveDraftId,
    setDraftItem,
    setHeader,
    setLastSavedSnapshot,
    setPayrollBaselineConfirmed,
    setPeriodConfirmed,
    setSavedItems,
    setShowForm,
  ])

  useEffect(() => {
    if (!hasInitializedPeriodRef.current) {
      hasInitializedPeriodRef.current = true
      previousPeriodRef.current = headerPeriod
      return
    }
    if (
      periodConfirmed &&
      previousPeriodRef.current &&
      previousPeriodRef.current !== headerPeriod
    ) {
      setPayrollBaselineConfirmed(false)
    }
    previousPeriodRef.current = headerPeriod
  }, [
    hasInitializedPeriodRef,
    headerPeriod,
    periodConfirmed,
    previousPeriodRef,
    setPayrollBaselineConfirmed,
  ])
}

export default useSalaryClaimHydration
