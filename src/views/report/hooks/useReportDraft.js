import { useEffect } from 'react'
import { loadReportDraft } from '../reportStorage'

const useReportDraft = ({
  userId,
  reportTypeSlug,
  draftLoadedRef,
  setForm,
  setSetupConfirmed,
  setRespondingTeamConfirmed,
  setDetailsConfirmed,
  pushToast,
  normalizeDraft,
  skipDraftLoad = false,
  onDraftLoaded,
  loadDraft,
}) => {
  useEffect(() => {
    if (!userId || draftLoadedRef.current) return
    if (skipDraftLoad) return
    draftLoadedRef.current = true
    let cancelled = false
    const run = async () => {
      const draft =
        typeof loadDraft === 'function'
          ? await loadDraft({ userId, reportTypeSlug })
          : await loadReportDraft(userId, reportTypeSlug)
      if (!draft || cancelled) return
      const restoredSetupConfirmed = Boolean(draft?.setupConfirmed)
      const restoredRespondingTeamConfirmed = Boolean(draft?.respondingTeamConfirmed)
      const restoredDetailsConfirmed = Boolean(draft?.detailsConfirmed)
      const normalizedDraft =
        typeof normalizeDraft === 'function' ? normalizeDraft(draft || {}) : draft || {}
      const draftForm = { ...normalizedDraft }
      delete draftForm.setupConfirmed
      delete draftForm.respondingTeamConfirmed
      delete draftForm.detailsConfirmed
      delete draftForm.savedAt
      setForm((prev) => ({
        ...prev,
        ...draftForm,
        chronology: draftForm.chronology?.length ? draftForm.chronology : prev.chronology,
      }))
      if (typeof onDraftLoaded === 'function') {
        onDraftLoaded(draftForm)
      }
      if (typeof setSetupConfirmed === 'function') {
        setSetupConfirmed(restoredSetupConfirmed)
      }
      if (typeof setRespondingTeamConfirmed === 'function') {
        setRespondingTeamConfirmed(restoredRespondingTeamConfirmed)
      }
      if (typeof setDetailsConfirmed === 'function') {
        setDetailsConfirmed(restoredDetailsConfirmed)
      }
      pushToast('Saved draft restored.', { title: 'Draft loaded', color: 'info' })
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    draftLoadedRef,
    pushToast,
    reportTypeSlug,
    setForm,
    setDetailsConfirmed,
    setRespondingTeamConfirmed,
    setSetupConfirmed,
    userId,
    normalizeDraft,
    skipDraftLoad,
    onDraftLoaded,
    loadDraft,
  ])
}

export default useReportDraft
