import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteMessageApi,
  deleteMessageAttachmentApi,
  deleteThreadApi,
  deleteThreadForEveryoneApi,
  fetchMessageContacts,
  fetchThreadMessages,
  markThreadRead,
  sendInAppMessage,
  uploadMessageAttachment,
} from 'src/services/apiClient'
import { useSelector } from 'react-redux'
import { hasPermission } from 'src/utils/authz'
import useMessageThreads, { isMessagingIdle } from 'src/hooks/useMessageThreads'
import { logError } from 'src/services/logger'
import MessagesAccessState from './components/MessagesAccessState'
import MessagesLayout from './components/MessagesLayout'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_THREAD_BACKOFF,
  THREAD_LIMIT,
  compressImage,
  shouldBackoff,
  shouldCompressImage,
} from './messageAttachmentUtils'
import useNewChatActions from './hooks/useNewChatActions'
import useMessagesResponsiveState from './hooks/useMessagesResponsiveState'
import useMessageDraftPersistence from './hooks/useMessageDraftPersistence'

const Messages = () => {
  const authUser = useSelector((state) => state.authUser)
  const canMessage = useMemo(() => hasPermission(authUser, 'self.messages'), [authUser])
  const { threads, loading, error: threadsError, refresh, updateThreads } = useMessageThreads()
  const [threadMessages, setThreadMessages] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [query, setQuery] = useState('')
  const [compose, setCompose] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState(null)
  const [contactQuery, setContactQuery] = useState('')
  const [firstUnreadId, setFirstUnreadId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageError, setImageError] = useState(null)

  const activeUserId = activeThread?.user?.id
  const activeUserName = activeThread?.user?.name || activeThread?.user?.email || 'Chat'
  const {
    isVisible,
    isMobile,
    mobileView,
    setMobileView,
    showThreadPanel,
    showListPanel,
    shouldPollThread,
    handleBackToList,
  } = useMessagesResponsiveState({ activeUserId })

  const composerRef = useRef(null)
  const threadCacheRef = useRef({})
  const threadLoadingRef = useRef({}) // tracks in-flight fetches per userId
  const recentThreadIdsRef = useRef([])
  const threadBackoffRef = useRef(0)
  const threadBackoffUntilRef = useRef(0)
  const lastSeenMessageIdRef = useRef(null)
  const threadsRef = useRef(threads)
  const activeUserIdRef = useRef(activeUserId)
  threadsRef.current = threads
  activeUserIdRef.current = activeUserId

  const { drafts, setDrafts, lastThreadKey } = useMessageDraftPersistence({
    authUserId: authUser?.id,
  })

  const updateThreadCache = useCallback((userId, next) => {
    if (!userId) return
    const key = String(userId)
    threadCacheRef.current[key] = next
    const recent = recentThreadIdsRef.current.filter((id) => id !== key)
    recent.unshift(key)
    const trimmed = recent.slice(0, 10)
    recentThreadIdsRef.current = trimmed
    Object.keys(threadCacheRef.current).forEach((id) => {
      if (!trimmed.includes(id)) {
        delete threadCacheRef.current[id]
      }
    })
  }, [])

  // --- Reset on user change ---
  useEffect(() => {
    threadCacheRef.current = {}
    threadLoadingRef.current = {}
    recentThreadIdsRef.current = []
    lastSeenMessageIdRef.current = null
    threadBackoffRef.current = 0
    threadBackoffUntilRef.current = 0
    setThreadMessages([])
    setActiveThread(null)
    setFirstUnreadId(null)
    setError(null)
    setSendError(null)
    // On logout (authUser?.id is now undefined/null), wipe the previous user's
    // draft storage so a subsequent user on the same browser cannot read them.
    if (!authUser?.id && draftsStorageKeyRef.current) {
      try {
        localStorage.removeItem(draftsStorageKeyRef.current)
      } catch {
        // ignore — storage unavailable
      }
      draftsStorageKeyRef.current = null
    }
  }, [authUser?.id])

  const loadThreadMessages = useCallback(
    async (userId) => {
      if (!userId) return
      if (threadLoadingRef.current[userId]) return // prevent concurrent fetches
      threadLoadingRef.current[userId] = true
      setThreadLoading(true)
      try {
        const response = await fetchThreadMessages(userId, { limit: THREAD_LIMIT })
        // Discard if the user switched threads while this fetch was in-flight
        if (activeUserIdRef.current !== userId) return
        const next = response?.data || []
        updateThreadCache(userId, next)
        lastSeenMessageIdRef.current = next[next.length - 1]?.id || null
        const firstUnread = next.find(
          (message) => message.recipient?.id === authUser?.id && !message.read_at,
        )
        setFirstUnreadId(firstUnread?.id || null)
        setThreadMessages(next)
      } catch (err) {
        if (activeUserIdRef.current !== userId) return
        setError(err.payload?.message || 'Unable to load message thread.')
      } finally {
        threadLoadingRef.current[userId] = false
        if (activeUserIdRef.current === userId) setThreadLoading(false)
      }
    },
    [authUser?.id, updateThreadCache],
  )

  const refreshThreadMessages = useCallback(
    async (userId) => {
      if (!userId) return
      if (Date.now() < threadBackoffUntilRef.current) return
      try {
        const response = await fetchThreadMessages(userId, { limit: THREAD_LIMIT })
        // Discard if the user switched threads while this fetch was in-flight
        if (activeUserIdRef.current !== userId) return
        threadBackoffRef.current = 0
        threadBackoffUntilRef.current = 0
        const next = response?.data || []
        updateThreadCache(userId, next)
        lastSeenMessageIdRef.current = next[next.length - 1]?.id || null
        const firstUnread = next.find(
          (message) => message.recipient?.id === authUser?.id && !message.read_at,
        )
        if (firstUnread) {
          const markReadAt = new Date().toISOString()
          markThreadRead(userId).catch(() => refresh()) // re-sync server unread count if mark-read failed
          const marked = next.map((message) =>
            message.recipient?.id === authUser?.id && !message.read_at
              ? { ...message, read_at: markReadAt }
              : message,
          )
          updateThreadCache(userId, marked)
          updateThreads((prev) =>
            prev.map((t) => (t.user?.id === userId ? { ...t, unread_count: 0 } : t)),
          )
          setFirstUnreadId(null)
          setThreadMessages(marked)
        } else {
          setFirstUnreadId(null)
          setThreadMessages(next)
        }
      } catch (err) {
        if (shouldBackoff(err)) {
          const prev = threadBackoffRef.current
          const next = Math.min(prev ? prev * 2 : 15000, MAX_THREAD_BACKOFF)
          threadBackoffRef.current = next
          threadBackoffUntilRef.current = Date.now() + next
        }
        // 401 = session expired — surface to the user rather than silently backing off
        if (err?.status === 401) {
          setError('Your session has expired. Please refresh the page to log in again.')
        }
      }
    },
    [authUser?.id, refresh, updateThreadCache, updateThreads],
  )

  // --- Auto-select last thread on desktop ---
  useEffect(() => {
    if (!activeThread && threads.length && !isMobile) {
      const lastId = (() => {
        if (!lastThreadKey) return null
        try {
          return localStorage.getItem(lastThreadKey)
        } catch {
          return null
        }
      })()
      const preferred = threads.find((t) => String(t.user?.id) === String(lastId)) || threads[0]
      setActiveThread(preferred)
    }
  }, [threads, activeThread, isMobile, lastThreadKey])

  // --- Load messages when active thread changes ---
  useEffect(() => {
    if (!activeThread?.user?.id) return
    setFirstUnreadId(null)
    lastSeenMessageIdRef.current = null
    const cached = threadCacheRef.current[String(activeThread.user.id)]
    if (cached && cached.length) {
      setThreadMessages(cached)
      const firstUnread = cached.find(
        (message) => message.recipient?.id === authUser?.id && !message.read_at,
      )
      setFirstUnreadId(firstUnread?.id || null)
    }
    if (!isMobile || mobileView === 'thread') {
      if (!cached || !cached.length) {
        loadThreadMessages(activeThread.user.id)
      }
      if (activeThread.unread_count > 0) {
        const markReadAt = new Date().toISOString()
        markThreadRead(activeThread.user.id)
          .then(() => setFirstUnreadId(null))
          .catch(() => refresh()) // re-sync server unread count if mark-read failed
        setThreadMessages((prev) => {
          const next = prev.map((message) =>
            message.recipient?.id === authUser?.id && !message.read_at
              ? { ...message, read_at: markReadAt }
              : message,
          )
          updateThreadCache(activeThread.user.id, next)
          return next
        })
        updateThreads((prev) =>
          prev.map((t) => (t.user?.id === activeThread.user.id ? { ...t, unread_count: 0 } : t)),
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread?.user?.id, isMobile, mobileView])

  // --- Restore draft when switching threads ---
  useEffect(() => {
    if (!activeUserId) return
    const draft = drafts[activeUserId] || ''
    setCompose(draft)
    requestAnimationFrame(() => resizeComposer(composerRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId])

  useEffect(() => {
    if (!activeUserId) return
    if (compose) return
    const draft = drafts[activeUserId] || ''
    if (!draft) return
    setCompose(draft)
    requestAnimationFrame(() => resizeComposer(composerRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, activeUserId, compose])

  // --- Clear active thread if it disappears from thread list ---
  useEffect(() => {
    if (!activeUserId || !threads.length) return
    const stillExists = threads.some((t) => t.user?.id === activeUserId)
    if (!stillExists) {
      setActiveThread(null)
      setThreadMessages([])
      setFirstUnreadId(null)
      if (isMobile) setMobileView('list')
    }
  }, [threads, activeUserId, isMobile, setMobileView])

  // --- Thread message polling ---
  useEffect(() => {
    if (!isVisible) return
    if (!shouldPollThread) return
    const threadTimer = setInterval(() => {
      if (document.hidden || isMessagingIdle()) return
      const activeThreadData = threadsRef.current.find((t) => t.user?.id === activeUserId)
      const latestMessageId = activeThreadData?.last_message?.id || null
      if (latestMessageId && latestMessageId !== lastSeenMessageIdRef.current) {
        refreshThreadMessages(activeUserId)
      }
    }, 8000)
    return () => clearInterval(threadTimer)
  }, [activeUserId, isVisible, shouldPollThread, refreshThreadMessages])

  // --- Refresh threads on tab visibility ---
  useEffect(() => {
    if (!isVisible) return
    refresh()
  }, [isVisible, refresh])

  const handleSelectThread = useCallback(
    (thread) => {
      setActiveThread(thread)
      // Clear any pending image when switching threads
      setImageFile(null)
      setImagePreview(null)
      setImageError(null)
      setSendError(null)
      if (thread?.user?.id) {
        if (lastThreadKey) {
          try {
            localStorage.setItem(lastThreadKey, String(thread.user.id))
          } catch {
            // ignore storage failures
          }
        }
        const cached = threadCacheRef.current[String(thread.user.id)]
        if (cached && cached.length) {
          setThreadMessages(cached)
          const firstUnread = cached.find(
            (message) => message.recipient?.id === authUser?.id && !message.read_at,
          )
          setFirstUnreadId(firstUnread?.id || null)
        }
      }
      if (isMobile) {
        setMobileView('thread')
      }
    },
    [authUser?.id, isMobile, lastThreadKey, setMobileView],
  )

  const handleImageSelect = useCallback(async (file) => {
    setImageError(null)
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }
    let finalFile = file
    if (shouldCompressImage(file)) {
      try {
        finalFile = await compressImage(file)
      } catch {
        setImageError('Could not compress image. Please try a smaller file.')
        return
      }
    }
    if (finalFile.size > MAX_IMAGE_SIZE) {
      setImageError('Image is too large even after compression. Please use a smaller file.')
      return
    }
    setImageFile(finalFile)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(finalFile)
  }, [])

  const handleImageClear = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
  }, [])

  const handleSend = useCallback(async () => {
    if ((!compose.trim() && !imageFile) || !activeThread?.user?.id || sending) return
    setSending(true)
    setSendError(null)
    let attachmentId = null
    if (imageFile) {
      try {
        const uploadResponse = await uploadMessageAttachment(imageFile)
        attachmentId = uploadResponse?.data?.id ?? null
      } catch (err) {
        setImageError(err.payload?.message || 'Failed to upload image.')
        setSending(false)
        return
      }
    }
    try {
      const response = await sendInAppMessage({
        to_user_id: activeThread.user.id,
        body: compose.trim() || undefined,
        attachment_id: attachmentId || undefined,
      })
      const newMessage = response?.data
        ? {
            ...response.data,
            sender: {
              id: authUser?.id,
              name: authUser?.name,
              email: authUser?.email,
            },
            recipient: activeThread.user,
            // Carry the local blob URL so AttachmentImage can render instantly
            // for the sender without waiting for an authenticated network fetch.
            _localPreview: imagePreview ?? undefined,
          }
        : null
      if (newMessage) {
        setThreadMessages((prev) => {
          const next = [...prev, newMessage]
          updateThreadCache(activeThread.user.id, next)
          return next
        })
        updateThreads((prev) =>
          prev.map((t) =>
            t.user?.id === activeThread.user.id
              ? { ...t, last_message: newMessage, unread_count: 0 }
              : t,
          ),
        )
      } else {
        await loadThreadMessages(activeThread.user.id)
        await refresh()
      }
      setCompose('')
      setImageFile(null)
      setImagePreview(null)
      setImageError(null)
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[activeThread.user.id]
        return next
      })
      if (composerRef.current) {
        composerRef.current.style.height = 'auto'
      }
    } catch (err) {
      // Upload succeeded but send failed — delete the orphaned attachment so it doesn't linger on the server
      if (attachmentId) {
        deleteMessageAttachmentApi(attachmentId).catch((cleanupErr) => {
          logError('[Messages] Orphaned attachment cleanup failed', cleanupErr, { attachmentId })
        })
      }
      setSendError(err.payload?.message || 'Unable to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }, [
    compose,
    imageFile,
    activeThread,
    sending,
    authUser,
    loadThreadMessages,
    refresh,
    imagePreview,
    setDrafts,
    updateThreadCache,
    updateThreads,
  ])

  const handleDeleteMessage = useCallback(
    async (messageId) => {
      const message = threadMessages.find((m) => m.id === messageId)
      const attachmentId = message?.attachment?.id || null
      // Capture a stable snapshot of the pre-delete state keyed by messageId so
      // concurrent deletes each roll back only their own removal on failure.
      const snapshotBeforeDelete = [...threadMessages]
      setThreadMessages((msgs) => {
        const next = msgs.filter((m) => m.id !== messageId)
        updateThreadCache(activeUserId, next)
        return next
      })
      updateThreads((ts) =>
        ts.map((t) => {
          if (t.user?.id !== activeUserId) return t
          const isLast = t.last_message?.id === messageId
          if (!isLast) return t
          const remaining = snapshotBeforeDelete.filter((m) => m.id !== messageId)
          const newLast = remaining[remaining.length - 1] || null
          return { ...t, last_message: newLast }
        }),
      )
      try {
        await deleteMessageApi(messageId)
        if (attachmentId) {
          deleteMessageAttachmentApi(attachmentId).catch((cleanupErr) => {
            logError('[Messages] Attachment deletion failed', cleanupErr, { attachmentId })
          })
        }
      } catch (err) {
        // Restore only the failed message back into whatever the current array is,
        // so a concurrent successful delete is not re-introduced.
        setThreadMessages((msgs) => {
          if (msgs.some((m) => m.id === messageId)) return msgs
          const insertAt = snapshotBeforeDelete.findIndex((m) => m.id === messageId)
          const next = [...msgs]
          next.splice(insertAt < 0 ? next.length : insertAt, 0, message)
          updateThreadCache(activeUserId, next)
          return next
        })
        setError(err.payload?.message || 'Unable to delete message.')
      }
    },
    [threadMessages, activeUserId, updateThreadCache, updateThreads],
  )

  const removeThreadFromUI = useCallback(
    (userId) => {
      updateThreads((ts) => ts.filter((t) => t.user?.id !== userId))
      if (activeUserId === userId) {
        setActiveThread(null)
        setThreadMessages([])
        setFirstUnreadId(null)
        if (isMobile) setMobileView('list')
      }
    },
    [activeUserId, isMobile, setMobileView, updateThreads],
  )

  const handleDeleteThread = useCallback(
    async (userId) => {
      removeThreadFromUI(userId)
      try {
        await deleteThreadApi(userId)
      } catch (err) {
        setError(err.payload?.message || 'Unable to hide thread.')
        refresh()
      }
    },
    [removeThreadFromUI, refresh],
  )

  const handleDeleteThreadForEveryone = useCallback(
    async (userId) => {
      removeThreadFromUI(userId)
      try {
        await deleteThreadForEveryoneApi(userId)
      } catch (err) {
        setError(err.payload?.message || 'Unable to delete thread.')
        refresh()
      }
    },
    [removeThreadFromUI, refresh],
  )

  const resizeComposer = useCallback((element) => {
    if (!element) return
    element.style.height = 'auto'
    const maxHeight = 160
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`
  }, [])

  const handleComposeChange = useCallback(
    (value) => {
      setCompose(value)
      if (activeUserId) {
        setDrafts((prev) => ({ ...prev, [activeUserId]: value }))
      }
      resizeComposer(composerRef.current)
    },
    [activeUserId, resizeComposer, setDrafts],
  )

  const handleComposerKeyDown = useCallback(
    (event) => {
      if (isMobile) return
      if (event.key !== 'Enter') return
      if (event.shiftKey) return
      if (event.isComposing) return
      event.preventDefault()
      handleSend()
    },
    [isMobile, handleSend],
  )

  const unreadTotal = useMemo(
    () =>
      threads.reduce((sum, t) => {
        if (t.user?.id === activeUserId) return sum
        return sum + (t.unread_count || 0)
      }, 0),
    [threads, activeUserId],
  )

  const loadContacts = useCallback(
    async (searchTerm = '') => {
      setContactsLoading(true)
      setContactsError(null)
      try {
        const response = await fetchMessageContacts({ search: searchTerm || undefined })
        const next = (response?.data || []).filter((u) => u?.id !== authUser?.id)
        setContacts(next)
      } catch (err) {
        setContactsError(err.payload?.message || 'Unable to load contacts.')
      } finally {
        setContactsLoading(false)
      }
    },
    [authUser?.id],
  )

  const { handleCloseNewChat, handleOpenNewChat, handleSelectContact } = useNewChatActions({
    contacts,
    contactsLoading,
    contactQuery,
    loadContacts,
    threads,
    isMobile,
    updateThreads,
    setActiveThread,
    setMobileView,
    setShowNewChat,
    setContactQuery,
  })

  useEffect(() => {
    if (!showNewChat) return
    const timer = setTimeout(() => {
      loadContacts(contactQuery)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactQuery, showNewChat])

  if (loading || !canMessage) {
    return <MessagesAccessState loading={loading} canMessage={canMessage} />
  }

  return (
    <MessagesLayout
      isMobile={isMobile}
      mobileView={mobileView}
      onBackToList={handleBackToList}
      unreadTotal={unreadTotal}
      onOpenNewChat={handleOpenNewChat}
      error={error}
      onClearError={() => setError(null)}
      threadsError={threadsError}
      onRefresh={() => refresh()}
      threads={threads}
      drafts={drafts}
      authUserId={authUser?.id}
      activeUserId={activeUserId}
      query={query}
      onQueryChange={setQuery}
      onSelectThread={handleSelectThread}
      onDeleteThread={handleDeleteThread}
      onDeleteThreadForEveryone={handleDeleteThreadForEveryone}
      showListPanel={showListPanel}
      loading={loading}
      activeThread={activeThread}
      activeUserName={activeUserName}
      messages={threadMessages}
      threadLoading={threadLoading}
      firstUnreadId={firstUnreadId}
      compose={compose}
      onComposeChange={handleComposeChange}
      onComposerKeyDown={handleComposerKeyDown}
      onSend={handleSend}
      onDeleteMessage={handleDeleteMessage}
      sending={sending}
      sendError={sendError}
      composerRef={composerRef}
      showThreadPanel={showThreadPanel}
      imageFile={imageFile}
      imagePreview={imagePreview}
      onImageSelect={handleImageSelect}
      onImageClear={handleImageClear}
      imageError={imageError}
      showNewChat={showNewChat}
      onCloseNewChat={handleCloseNewChat}
      contactQuery={contactQuery}
      onContactQueryChange={setContactQuery}
      contactsLoading={contactsLoading}
      contactsError={contactsError}
      contacts={contacts}
      onSelectContact={handleSelectContact}
    />
  )
}

export default Messages
