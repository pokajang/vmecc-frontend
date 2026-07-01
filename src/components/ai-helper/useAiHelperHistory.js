import { useCallback, useEffect, useRef, useState } from 'react'

import {
  deleteAiHelperThread,
  fetchAiHelperThreadById,
  fetchAiHelperThreads,
} from 'src/services/apiClient'
import { isAiHelperListFresh, safeAiHelperError } from './constants'

const useAiHelperHistory = ({
  authUser,
  currentThreadId,
  currentThreadIdRef,
  onActiveThreadDeleted,
  onThreadOpened,
  sending,
  sendingRef,
}) => {
  const authUserId = authUser?.id
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyLastLoadedAt, setHistoryLastLoadedAt] = useState(null)
  const [historyError, setHistoryError] = useState(null)
  const [historyThreads, setHistoryThreads] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingThread, setDeletingThread] = useState(false)
  const historyRequestIdRef = useRef(0)
  const historyListRequestRef = useRef(null)
  const historyOpenRequestRef = useRef(0)
  const authUserIdRef = useRef(null)

  useEffect(() => {
    authUserIdRef.current = authUserId || null
  }, [authUserId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistoryLoading(false)
    setHistoryLoaded(false)
    setHistoryLastLoadedAt(null)
    historyRequestIdRef.current = 0
    historyListRequestRef.current = null
    setHistoryThreads([])
    setHistoryError(null)
    setDeleteTarget(null)
  }, [authUserId])

  const loadHistory = useCallback(
    ({ force = false, showError = true, background = false } = {}) => {
      if (!authUserId) return Promise.resolve()
      if (!force && historyLoaded && isAiHelperListFresh(historyLastLoadedAt)) {
        return Promise.resolve()
      }

      if (historyListRequestRef.current) {
        return historyListRequestRef.current
      }

      const requestId = ++historyRequestIdRef.current
      setHistoryLoading(true)
      if (showError && !background) setHistoryError(null)

      const request = fetchAiHelperThreads()
        .then((response) => {
          if (requestId !== historyRequestIdRef.current) return
          if (authUserIdRef.current !== authUserId) return
          setHistoryThreads(response?.data || [])
          setHistoryLoaded(true)
          setHistoryLastLoadedAt(Date.now())
        })
        .catch((error) => {
          if (requestId !== historyRequestIdRef.current) return
          if (showError) {
            setHistoryError(safeAiHelperError(error, 'Could not load chat history.'))
          }
        })
        .finally(() => {
          if (requestId !== historyRequestIdRef.current) return
          setHistoryLoading(false)
          historyListRequestRef.current = null
        })

      historyListRequestRef.current = request
      return request
    },
    [authUserId, historyLastLoadedAt, historyLoaded],
  )

  const openHistoryThread = useCallback(
    (threadId) => {
      if (!threadId || (sendingRef?.current ?? sending)) return

      const requestId = ++historyOpenRequestRef.current
      onThreadOpened({ loading: true, loadingLabel: 'Opening chat...', error: null })
      setHistoryError(null)

      fetchAiHelperThreadById(threadId)
        .then((response) => {
          if (requestId !== historyOpenRequestRef.current) return
          onThreadOpened({
            thread: response?.data?.thread || null,
            messages: response?.data?.messages || [],
            loading: false,
            error: null,
          })
        })
        .catch((error) => {
          if (requestId !== historyOpenRequestRef.current) return
          setHistoryError(safeAiHelperError(error, 'Could not open this chat.'))
          onThreadOpened({ loading: false })
        })
    },
    [onThreadOpened, sending, sendingRef],
  )

  const confirmDeleteThread = useCallback(() => {
    if (!deleteTarget?.id || deletingThread) return
    setDeletingThread(true)
    setHistoryError(null)
    deleteAiHelperThread(deleteTarget.id)
      .then(() => {
        setHistoryThreads((prev) => prev.filter((item) => item.id !== deleteTarget.id))
        setHistoryLoaded(true)
        setHistoryLastLoadedAt(Date.now())
        const activeThreadId = currentThreadIdRef?.current ?? currentThreadId
        if (activeThreadId === deleteTarget.id) {
          onActiveThreadDeleted()
        }
        setDeleteTarget(null)
      })
      .catch((error) => setHistoryError(safeAiHelperError(error, 'Could not delete this chat.')))
      .finally(() => setDeletingThread(false))
  }, [currentThreadId, currentThreadIdRef, deleteTarget, deletingThread, onActiveThreadDeleted])

  const recordThreadActivity = useCallback((thread, lastMessage) => {
    if (!thread?.id) return
    setHistoryThreads((prev) => [
      { ...thread, last_message: lastMessage },
      ...prev.filter((item) => item.id !== thread.id),
    ])
    setHistoryLoaded(true)
    setHistoryLastLoadedAt(Date.now())
  }, [])

  return {
    deleteTarget,
    deletingThread,
    historyError,
    historyInitialLoading: historyLoading && !historyLastLoadedAt,
    historyLoading,
    historyThreads,
    confirmDeleteThread,
    loadHistory,
    openHistoryThread,
    recordThreadActivity,
    setDeleteTarget,
    setHistoryError,
  }
}

export default useAiHelperHistory
