import { useEffect } from 'react'
import { loadInspectionDraft } from '../inspectionStorage'

const useInspectionDraft = ({
  userId,
  draftLoadedRef,
  setForm,
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
      try {
        const draft =
          typeof loadDraft === 'function'
            ? await loadDraft({ userId })
            : await loadInspectionDraft(userId)
        if (!draft || cancelled) return
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
        pushToast('Saved draft restored.', { title: 'Draft loaded', color: 'info' })
      } catch (error) {
        pushToast(error?.message || 'Unable to load saved draft.', {
          title: 'Draft load failed',
          color: 'warning',
        })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    draftLoadedRef,
    pushToast,
    setForm,
    userId,
    normalizeDraft,
    skipDraftLoad,
    onDraftLoaded,
    loadDraft,
  ])
}

export default useInspectionDraft
