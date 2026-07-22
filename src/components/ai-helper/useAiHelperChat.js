import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchAiHelperThread,
  reportAiHelperMessage,
  streamAiHelperMessage,
} from 'src/services/apiClient'
import { createRequestUuid } from 'src/services/api/requestUuid'
import {
  MESSAGE_STATUS_ABORTED,
  MESSAGE_STATUS_COMPLETED,
  MESSAGE_STATUS_FAILED,
  MESSAGE_STATUS_SLOW,
  MESSAGE_STATUS_STREAMING,
  buildFailedAssistantMessage,
  makeLocalMessage,
  safeAiHelperError,
} from './constants'
import { getAiHelperUiState } from './uiState'

const useAiHelperChat = ({
  authUser,
  contextPage,
  open,
  recordThreadActivity,
  responseLanguage,
  routeContext,
  showNotice,
}) => {
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loadingThread, setLoadingThread] = useState(false)
  const [threadLoadingLabel, setThreadLoadingLabel] = useState('Loading chat history...')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [startNewThread, setStartNewThread] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportError, setReportError] = useState(null)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const abortRef = useRef(null)
  const activeStreamRef = useRef(null)
  const abortedRequestIdsRef = useRef(new Set())
  const sendRequestRef = useRef(0)
  const fetchThreadRequestRef = useRef(0)
  const slowTimerRef = useRef(null)
  const copyTimerRef = useRef(null)

  const updateMessageById = useCallback((messageId, updater) => {
    if (!messageId) return
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message
        return typeof updater === 'function' ? updater(message) : { ...message, ...updater }
      }),
    )
  }, [])

  const markSendFailure = useCallback(
    (assistantMessageId, error, text, pageContext, requestId) => {
      const errorMessage = safeAiHelperError(
        error,
        'Could not reach Ask AI. Check your connection and try again.',
      )
      setSendError(errorMessage)
      updateMessageById(assistantMessageId, (message) => ({
        ...message,
        ...buildFailedAssistantMessage(errorMessage, {
          retry_prompt: text,
          retry_context: pageContext,
          request_id: requestId,
        }),
      }))
      return errorMessage
    },
    [updateMessageById],
  )

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
  }, [])

  const stopGeneration = useCallback(() => {
    const activeStream = activeStreamRef.current
    if (!activeStream) return

    abortedRequestIdsRef.current.add(activeStream.requestId)
    abortRef.current?.abort?.()
    clearSlowTimer()
    setSending(false)
    setStartNewThread(false)
    updateMessageById(activeStream.assistantMessageId, (message) => {
      const hasContent = Boolean(String(message.content || '').trim())
      return {
        ...message,
        content: hasContent ? `${message.content}\n\nStopped.` : 'Stopped.',
        status: MESSAGE_STATUS_ABORTED,
        partial_content: hasContent ? message.content : null,
      }
    })
    activeStreamRef.current = null
    abortRef.current = null
  }, [clearSlowTimer, updateMessageById])

  useEffect(() => {
    if (!open || !authUser?.id) return
    let cancelled = false
    const requestId = ++fetchThreadRequestRef.current
    setLoadingThread(true)
    setThreadLoadingLabel('Loading chat history...')
    fetchAiHelperThread()
      .then((response) => {
        if (cancelled || requestId !== fetchThreadRequestRef.current) return
        setThread(response?.data?.thread || null)
        setMessages(response?.data?.messages || [])
      })
      .catch((error) => {
        if (cancelled || requestId !== fetchThreadRequestRef.current) return
        setMessages([])
        setSendError(safeAiHelperError(error, 'Could not load Ask AI history.'))
      })
      .finally(() => {
        if (!cancelled && requestId === fetchThreadRequestRef.current) setLoadingThread(false)
      })
    return () => {
      cancelled = true
    }
  }, [authUser?.id, open])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
      clearSlowTimer()
      if (abortRef.current?.abort) {
        abortRef.current.abort()
        abortRef.current = null
      }
      activeStreamRef.current = null
      abortRef.current = null
      sendRequestRef.current += 1
      fetchThreadRequestRef.current += 1
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current)
        slowTimerRef.current = null
      }
    }
  }, [clearSlowTimer])

  useEffect(() => {
    if (!open) return
    return () => {
      stopGeneration()
    }
  }, [open, stopGeneration])

  const handleThreadOpened = useCallback((payload = {}) => {
    if (payload?.loading) {
      fetchThreadRequestRef.current += 1
    }

    if (payload.loadingLabel) setThreadLoadingLabel(payload.loadingLabel)
    if (typeof payload.loading === 'boolean') setLoadingThread(payload.loading)
    if (payload.thread !== undefined) setThread(payload.thread)
    if (payload.messages !== undefined) setMessages(payload.messages)
    if (payload.thread !== undefined || payload.messages !== undefined) {
      fetchThreadRequestRef.current += 1
      setStartNewThread(false)
      setSendError(null)
    }
  }, [])

  const copyMessage = useCallback(
    async (message) => {
      if (!message?.content) return

      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
          throw new Error('Clipboard is unavailable.')
        }
        await navigator.clipboard.writeText(message.content)
        setCopiedMessageId(message.id)
        showNotice('Response copied.')
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        copyTimerRef.current = window.setTimeout(() => {
          setCopiedMessageId(null)
          copyTimerRef.current = null
        }, 1800)
      } catch {
        setSendError('Could not copy the response. Select the text and copy it manually.')
      }
    },
    [showNotice],
  )

  const openReportModal = useCallback((message) => {
    setReportTarget(message)
    setReportReason('')
    setReportError(null)
  }, [])

  const closeReportModal = useCallback(() => {
    if (reportSubmitting) return
    setReportTarget(null)
    setReportReason('')
    setReportError(null)
  }, [reportSubmitting])

  const submitReport = useCallback(async () => {
    const reason = reportReason.trim()
    if (!reportTarget?.id || reportSubmitting) return

    if (reason.length < 10) {
      setReportError('Enter at least 10 characters.')
      return
    }

    if (reason.length > 1000) {
      setReportError('Keep the report reason under 1000 characters.')
      return
    }

    setReportSubmitting(true)
    setReportError(null)
    try {
      await reportAiHelperMessage(reportTarget.id, { reason })
      setReportTarget(null)
      setReportReason('')
      showNotice('Report submitted.', 3500)
    } catch (error) {
      setReportError(safeAiHelperError(error, 'Could not submit the report. Try again.'))
    } finally {
      setReportSubmitting(false)
    }
  }, [reportReason, reportSubmitting, reportTarget, showNotice])

  const sendMessage = useCallback(
    async (override = {}) => {
      const text = String(override.prompt ?? draft).trim()
      if (!text || sending) return

      const requestId = ++sendRequestRef.current
      const requestUuid = createRequestUuid()
      const pageContext = override.context || contextPage || routeContext
      const uiState = getAiHelperUiState(pageContext?.path)
      const userMessage = makeLocalMessage('user', text)
      const assistantMessage = makeLocalMessage('assistant', '', MESSAGE_STATUS_STREAMING, {
        request_id: requestId,
        request_uuid: requestUuid,
        retry_prompt: text,
        retry_context: pageContext,
      })
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      if (!override.prompt || override.clearDraft) setDraft('')
      setSending(true)
      setSendError(null)

      const controller = new AbortController()
      abortRef.current = controller
      activeStreamRef.current = { requestId, assistantMessageId: assistantMessage.id }
      const isActiveRequest = () => activeStreamRef.current?.requestId === requestId
      clearSlowTimer()
      slowTimerRef.current = window.setTimeout(() => {
        if (!isActiveRequest()) return
        updateMessageById(assistantMessage.id, (message) => {
          if (message.content) return message
          return {
            ...message,
            status: MESSAGE_STATUS_SLOW,
          }
        })
      }, 9000)

      try {
        await streamAiHelperMessage(
          {
            thread_id: startNewThread ? null : thread?.id || null,
            new_thread: startNewThread,
            message: text,
            page_context: pageContext,
            ui_state: uiState || undefined,
            response_language: responseLanguage,
            request_uuid: requestUuid,
          },
          {
            onMeta: (payload) => {
              if (!isActiveRequest()) return
              if (payload?.thread) setThread(payload.thread)
            },
            onStatus: (payload) => {
              if (!isActiveRequest()) return
              const pipelineStatus = String(payload?.message || '').trim()
              if (!pipelineStatus) return
              updateMessageById(assistantMessage.id, (message) => ({
                ...message,
                pipeline_status: pipelineStatus,
                status: message.content ? message.status : MESSAGE_STATUS_STREAMING,
              }))
            },
            onDelta: (payload) => {
              if (!isActiveRequest()) return
              const delta = payload?.text || ''
              if (!delta) return
              clearSlowTimer()
              updateMessageById(assistantMessage.id, (message) => ({
                ...message,
                content: `${message.content || ''}${delta}`,
                pipeline_status: null,
                status: MESSAGE_STATUS_STREAMING,
              }))
            },
            onDone: (payload) => {
              if (!isActiveRequest()) return
              if (payload?.thread) {
                setThread(payload.thread)
                recordThreadActivity(payload.thread, text)
              }

              if (payload?.message) {
                updateMessageById(assistantMessage.id, (message) => ({
                  ...message,
                  ...payload.message,
                  retry_prompt: text,
                  retry_context: pageContext,
                  request_id: requestId,
                  pipeline_status: null,
                  status: payload.message?.status || MESSAGE_STATUS_COMPLETED,
                }))
                return
              }

              updateMessageById(assistantMessage.id, (message) => ({
                ...message,
                status: message.content ? MESSAGE_STATUS_COMPLETED : MESSAGE_STATUS_FAILED,
                content: message.content || 'No response.',
                retry_prompt: text,
                retry_context: pageContext,
                request_id: requestId,
                pipeline_status: null,
              }))
            },
            onError: (payload) => {
              if (!isActiveRequest()) return
              const streamError =
                payload instanceof Error
                  ? payload
                  : new Error(payload?.message || safeAiHelperError(payload))
              if (!(payload instanceof Error) && payload?.code) {
                streamError.code = payload.code
                streamError.payload = payload
                if (payload.status) streamError.status = payload.status
              }
              markSendFailure(assistantMessage.id, streamError, text, pageContext, requestId)
            },
          },
          { signal: controller.signal },
        )
        if (isActiveRequest()) setStartNewThread(false)
      } catch (error) {
        if (abortedRequestIdsRef.current.has(requestId)) return
        if (!isActiveRequest()) return
        markSendFailure(assistantMessage.id, error, text, pageContext, requestId)
      } finally {
        const ownsActiveRequest = isActiveRequest()
        if (ownsActiveRequest) {
          activeStreamRef.current = null
          abortRef.current = null
          clearSlowTimer()
          setSending(false)
        }
        abortedRequestIdsRef.current.delete(requestId)
      }
    },
    [
      clearSlowTimer,
      contextPage,
      draft,
      markSendFailure,
      recordThreadActivity,
      responseLanguage,
      routeContext,
      sending,
      startNewThread,
      thread?.id,
      updateMessageById,
    ],
  )

  const retryMessage = useCallback(
    (message) => {
      if (sending || !message?.retry_prompt) return
      sendMessage({
        prompt: message.retry_prompt,
        context: message.retry_context || contextPage || routeContext,
      })
    },
    [contextPage, routeContext, sendMessage, sending],
  )

  const resetChat = useCallback(() => {
    stopGeneration()
    setThread(null)
    setMessages([])
    setSendError(null)
    setStartNewThread(true)
  }, [stopGeneration])

  return {
    copiedMessageId,
    draft,
    loadingThread,
    messages,
    reportError,
    reportReason,
    reportSubmitting,
    reportTarget,
    sendError,
    sending,
    thread,
    threadLoadingLabel,
    closeReportModal,
    copyMessage,
    handleThreadOpened,
    openReportModal,
    resetChat,
    retryMessage,
    sendMessage,
    setDraft,
    setReportError,
    setReportReason,
    setSendError,
    stopGeneration,
    submitReport,
  }
}

export default useAiHelperChat
