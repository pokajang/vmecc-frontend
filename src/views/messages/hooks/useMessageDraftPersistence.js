import { useEffect, useMemo, useRef, useState } from 'react'
import { logError } from 'src/services/logger'

const useMessageDraftPersistence = ({ authUserId }) => {
  const [drafts, setDrafts] = useState({})
  const draftSaveTimerRef = useRef(null)
  const draftsStorageKeyRef = useRef(null)

  const draftsStorageKey = useMemo(
    () => (authUserId ? `vmecc_message_drafts_${authUserId}` : null),
    [authUserId],
  )
  const lastThreadKey = useMemo(
    () => (authUserId ? `vmecc_last_thread_id_${authUserId}` : null),
    [authUserId],
  )

  useEffect(() => {
    if (draftsStorageKey) draftsStorageKeyRef.current = draftsStorageKey
  }, [draftsStorageKey])

  useEffect(() => {
    let cancelled = false
    const syncDrafts = (nextDrafts) => {
      queueMicrotask(() => {
        if (!cancelled) setDrafts(nextDrafts)
      })
    }
    if (!draftsStorageKey) {
      syncDrafts({})
      return () => {
        cancelled = true
      }
    }
    try {
      const raw = localStorage.getItem(draftsStorageKey)
      syncDrafts(raw ? JSON.parse(raw) : {})
    } catch {
      syncDrafts({})
    }
    return () => {
      cancelled = true
    }
  }, [draftsStorageKey])

  useEffect(() => {
    if (!draftsStorageKey) return
    clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftsStorageKey, JSON.stringify(drafts))
      } catch (err) {
        logError('[Messages] Draft save failed', err)
      }
    }, 500)
    return () => clearTimeout(draftSaveTimerRef.current)
  }, [drafts, draftsStorageKey])

  useEffect(() => {
    if (authUserId || !draftsStorageKeyRef.current) return
    try {
      localStorage.removeItem(draftsStorageKeyRef.current)
    } catch {
      // ignore storage failures
    }
    draftsStorageKeyRef.current = null
  }, [authUserId])

  return {
    drafts,
    setDrafts,
    lastThreadKey,
  }
}

export default useMessageDraftPersistence
