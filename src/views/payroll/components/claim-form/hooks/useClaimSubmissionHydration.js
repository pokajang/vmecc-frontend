import { useEffect } from 'react'
import { parseTimestamp } from '../utils/claimFormUtils'
import {
  createClaimItem,
  getDefaultCategory,
  hasDraftContent,
  normalizeItem,
} from '../utils/claimSubmissionUtils'

const useClaimSubmissionHydration = ({
  claimType,
  periodValue,
  periodConfirmedProp,
  headerPeriod,
  periodConfirmed,
  localAutosaveKey,
  draftPayload,
  claimCategoryOptions,
  hasHydratedDraftRef,
  setSavedItems,
  setDraftItem,
  setHeader,
  setShowForm,
  setActiveDraftId,
  setActiveDraftBackendId,
  setPeriodConfirmed,
  onPeriodChange,
  onPeriodConfirmedChange,
  setLastSavedSnapshot,
  buildSnapshot,
  initialSnapshot,
  pushToast,
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
      const nextSavedItems = Array.isArray(sourceDraft.savedItems)
        ? sourceDraft.savedItems.map((item) => normalizeItem(item))
        : []
      const nextDraftItem = normalizeItem({
        ...createClaimItem(claimType),
        ...(sourceDraft.draftItem || {}),
      })
      const nextPeriodConfirmed =
        typeof sourceDraft.periodConfirmed === 'boolean'
          ? sourceDraft.periodConfirmed
          : Boolean(periodConfirmedProp)
      setSavedItems(nextSavedItems)
      setDraftItem(nextDraftItem)
      setHeader((prev) => ({ ...prev, period: resolvedPeriod || prev.period }))
      setShowForm(false)
      setActiveDraftId(sourceDraft.id || null)
      setActiveDraftBackendId(Number(sourceDraft.backendId || 0) || null)
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
          draftItem: createClaimItem(claimType),
        }),
      )
      return
    }
    const recoveredPeriod = String(recovered?.period || '').trim() || periodFromParent
    const recoveredSavedItems = Array.isArray(recovered?.savedItems)
      ? recovered.savedItems.map((item) => normalizeItem(item))
      : []
    const recoveredDraftItem = normalizeItem({
      ...createClaimItem(claimType),
      ...(recovered?.draftItem || {}),
    })
    const recoveredPeriodConfirmed = Boolean(recovered?.periodConfirmed)
    setSavedItems(recoveredSavedItems)
    setDraftItem(recoveredDraftItem)
    setHeader((prev) => ({ ...prev, period: recoveredPeriod || prev.period }))
    setShowForm(false)
    setActiveDraftId(recovered?.id || null)
    setActiveDraftBackendId(Number(recovered?.backendId || 0) || null)
    setPeriodConfirmed(recoveredPeriodConfirmed)
    if (recoveredPeriod && recoveredPeriod !== periodFromParent && onPeriodChange) {
      onPeriodChange(recoveredPeriod)
    }
    if (onPeriodConfirmedChange) {
      onPeriodConfirmedChange(recoveredPeriodConfirmed)
    }
    setLastSavedSnapshot(initialSnapshot)
    pushToast('Recovered your unsaved claim form from local backup.', {
      title: 'Draft recovered',
      color: 'info',
    })
  }, [
    buildSnapshot,
    claimType,
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
    setPeriodConfirmed,
    setSavedItems,
    setShowForm,
  ])

  useEffect(() => {
    setDraftItem((prev) => {
      const nextCategory = claimCategoryOptions.includes(prev.category)
        ? prev.category
        : getDefaultCategory(claimType)
      return {
        ...createClaimItem(claimType),
        ...prev,
        category: nextCategory,
      }
    })
  }, [claimCategoryOptions, claimType, setDraftItem])
}

export default useClaimSubmissionHydration
