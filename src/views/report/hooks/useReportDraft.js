import { useEffect, useRef } from 'react'
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
  onDraftLoadSettled,
  loadDraft,
}) => {
  const lifecycleRef = useRef({
    loadDraft,
    normalizeDraft,
    onDraftLoaded,
    onDraftLoadSettled,
    pushToast,
  })

  useEffect(() => {
    lifecycleRef.current = {
      loadDraft,
      normalizeDraft,
      onDraftLoaded,
      onDraftLoadSettled,
      pushToast,
    }
  }, [loadDraft, normalizeDraft, onDraftLoaded, onDraftLoadSettled, pushToast])

  useEffect(() => {
    if (!userId || draftLoadedRef.current) return
    if (skipDraftLoad) return
    draftLoadedRef.current = true
    let cancelled = false
    const run = async () => {
      const loadDraftCallback = lifecycleRef.current?.loadDraft
      let draft = null
      try {
        draft =
          typeof loadDraftCallback === 'function'
            ? await loadDraftCallback({ userId, reportTypeSlug })
            : await loadReportDraft(userId, reportTypeSlug)
      } catch {
        if (!cancelled) {
          lifecycleRef.current?.pushToast?.(
            'The saved draft could not be loaded from the server. Start again or retry after reconnecting.',
            { title: 'Draft unavailable', color: 'warning' },
          )
        }
      }
      if (draft && !cancelled) {
        const lifecycle = lifecycleRef.current || {}
        const restoredSetupConfirmed = Boolean(draft?.setupConfirmed)
        const restoredRespondingTeamConfirmed = Boolean(draft?.respondingTeamConfirmed)
        const restoredDetailsConfirmed = Boolean(draft?.detailsConfirmed)
        const normalizedDraft =
          typeof lifecycle.normalizeDraft === 'function'
            ? lifecycle.normalizeDraft(draft || {})
            : draft || {}
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
        if (typeof lifecycle.onDraftLoaded === 'function') {
          lifecycle.onDraftLoaded(draftForm)
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
        lifecycle.pushToast?.('Saved draft restored.', { title: 'Draft loaded', color: 'info' })
      }
      if (!cancelled) lifecycleRef.current?.onDraftLoadSettled?.()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    draftLoadedRef,
    reportTypeSlug,
    setForm,
    setDetailsConfirmed,
    setRespondingTeamConfirmed,
    setSetupConfirmed,
    userId,
    skipDraftLoad,
  ])
}

export default useReportDraft
