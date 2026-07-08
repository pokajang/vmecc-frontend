import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import AiHelperHeader from './AiHelperHeader'
import ChatView from './ChatView'
import {
  AI_HELPER_LANDING_GROUP_LIMIT,
  KNOWLEDGE_VIEW_LIST,
  KNOWLEDGE_VIEW_UPLOAD,
  LANGUAGE_STORAGE_KEY,
  isMarkdownKnowledgeEntry,
  normalizeResponseLanguage,
  STORAGE_KEY,
} from './constants'
import HistoryView from './HistoryView'
import KnowledgeView from './KnowledgeView'
import ReportModal from './ReportModal'
import useAiHelperChat from './useAiHelperChat'
import useAiHelperContext from './useAiHelperContext'
import useAiHelperHistory from './useAiHelperHistory'
import useAiHelperKnowledge from './useAiHelperKnowledge'
import useAiHelperNotice from './useAiHelperNotice'
import useVisibleKnowledgeModules from './useVisibleKnowledgeModules'
import useMediaQuery from 'src/hooks/useMediaQuery'

const AiHelperPanel = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const open = useSelector((state) => state.aiHelperOpen)
  const authUser = useSelector((state) => state.authUser)
  const moduleActivation = useSelector((state) => state.moduleActivation)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [responseLanguage, setResponseLanguage] = useState(() => {
    try {
      return normalizeResponseLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
    } catch {
      return 'bm'
    }
  })
  const [panelMode, setPanelMode] = useState('chat')
  const panelRef = useRef(null)
  const scrollRef = useRef(null)
  const draftRef = useRef(null)
  const backButtonRef = useRef(null)
  const currentThreadIdRef = useRef(null)
  const sendingRef = useRef(false)
  const activeThreadDeletedRef = useRef(null)
  const threadOpenedRef = useRef(null)

  const historyOpen = panelMode === 'history'
  const knowledgeOpen = panelMode === 'knowledge'
  const { clearNotice, notice, showNotice, showPersistentNotice } = useAiHelperNotice()
  const { currentPageContext, contextPage, promptStarters, refreshCurrentContext, routeContext } =
    useAiHelperContext({ location, open })
  const { isSysAdmin, visibleKnowledgeModules } = useVisibleKnowledgeModules({
    authUser,
    moduleActivation,
  })

  const history = useAiHelperHistory({
    authUser,
    currentThreadIdRef,
    onActiveThreadDeleted: () => activeThreadDeletedRef.current?.(),
    onThreadOpened: (payload) => threadOpenedRef.current?.(payload),
    sending: false,
    sendingRef,
  })
  const chat = useAiHelperChat({
    authUser,
    contextPage,
    open,
    recordThreadActivity: history.recordThreadActivity,
    responseLanguage,
    routeContext,
    showNotice,
  })
  const knowledge = useAiHelperKnowledge({
    authUser,
    currentPageContext,
    isSysAdmin,
    refreshCurrentContext,
    routeContext,
    visibleKnowledgeModules,
  })
  const {
    closeReportModal,
    handleThreadOpened,
    messages,
    reportTarget,
    resetChat,
    sending,
    stopGeneration,
    thread,
  } = chat
  const { loadHistory } = history
  const {
    closeKnowledgeReader,
    knowledgeEntries,
    knowledgeReaderOpen,
    knowledgeView,
    loadKnowledge,
  } = knowledge
  const knowledgeEntriesForDisplay = useMemo(
    () =>
      isSysAdmin
        ? knowledgeEntries
        : knowledgeEntries.filter(
            (entry) =>
              !isMarkdownKnowledgeEntry(entry) ||
              String(entry?.visibility || 'shared').toLowerCase() === 'shared',
          ),
    [isSysAdmin, knowledgeEntries],
  )

  const landingGuidancePreview = useMemo(
    () => knowledgeEntriesForDisplay.slice(0, AI_HELPER_LANDING_GROUP_LIMIT),
    [knowledgeEntriesForDisplay],
  )

  useEffect(() => {
    currentThreadIdRef.current = thread?.id || null
    sendingRef.current = sending
    activeThreadDeletedRef.current = () => {
      resetChat()
      setPanelMode('chat')
    }
    threadOpenedRef.current = (payload) => {
      handleThreadOpened(payload)
      if (payload.thread !== undefined || payload.messages !== undefined) {
        setPanelMode('chat')
      }
    }
  }, [handleThreadOpened, resetChat, sending, thread?.id])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    } catch {
      // Storage may be unavailable in private or test environments.
    }

    if (open) {
      dispatch({ type: 'set', sidebarShow: false })
    }
  }, [dispatch, open])

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, responseLanguage)
    } catch {
      // Storage may be unavailable in private or test environments.
    }
  }, [responseLanguage])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, sending, open])

  useEffect(() => {
    if (!open || !authUser?.id) return
    loadHistory({ showError: false, background: true })
    loadKnowledge({ showError: false, background: true })
  }, [authUser?.id, loadHistory, loadKnowledge, open])

  useEffect(() => {
    if (open && historyOpen) {
      loadHistory()
    }
  }, [historyOpen, loadHistory, open])

  useEffect(() => {
    if (open && knowledgeOpen && knowledgeView === KNOWLEDGE_VIEW_LIST) {
      loadKnowledge()
    }
  }, [knowledgeOpen, knowledgeView, loadKnowledge, open])

  useEffect(() => {
    if (
      !open ||
      !knowledgeOpen ||
      !knowledgeEntriesForDisplay.some((entry) => entry.status === 'processing')
    ) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadKnowledge({ force: true, showError: false, background: true })
      refreshCurrentContext()
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [knowledgeEntriesForDisplay, knowledgeOpen, loadKnowledge, open, refreshCurrentContext])

  useEffect(() => {
    if (!open) return
    const focusTarget = historyOpen || knowledgeOpen ? backButtonRef.current : draftRef.current
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => focusTarget?.focus?.())
      return
    }
    focusTarget?.focus?.()
  }, [historyOpen, knowledgeOpen, open])

  const closePanel = useCallback(() => {
    stopGeneration()
    clearNotice()
    closeKnowledgeReader()
    dispatch({
      type: 'set',
      aiHelperOpen: false,
      ...(isDesktop ? { sidebarShow: true } : {}),
    })
  }, [clearNotice, closeKnowledgeReader, dispatch, isDesktop, stopGeneration])

  const startNew = useCallback(() => {
    resetChat()
    setPanelMode('chat')
    history.setDeleteTarget(null)
    knowledge.setKnowledgeDeleteTarget(null)
    closeKnowledgeReader()
  }, [closeKnowledgeReader, history, knowledge, resetChat])

  const toggleHistory = useCallback(() => {
    setPanelMode((currentMode) => {
      const opening = currentMode !== 'history'
      if (opening) {
        history.setHistoryError(null)
        closeKnowledgeReader()
      } else {
        history.setDeleteTarget(null)
      }
      return opening ? 'history' : 'chat'
    })
  }, [closeKnowledgeReader, history])

  const toggleKnowledge = useCallback(() => {
    setPanelMode((currentMode) => {
      const opening = currentMode !== 'knowledge'
      if (opening) {
        knowledge.setKnowledgeView(KNOWLEDGE_VIEW_UPLOAD)
        history.setDeleteTarget(null)
      } else {
        knowledge.setKnowledgeDeleteTarget(null)
        closeKnowledgeReader()
      }
      return opening ? 'knowledge' : 'chat'
    })
  }, [closeKnowledgeReader, history, knowledge])

  const closeSubView = useCallback(() => {
    history.setDeleteTarget(null)
    knowledge.setKnowledgeDeleteTarget(null)
    closeKnowledgeReader()
    knowledge.setKnowledgeView(KNOWLEDGE_VIEW_UPLOAD)
    setPanelMode('chat')
  }, [closeKnowledgeReader, history, knowledge])

  const openKnowledgeList = useCallback(() => {
    history.setDeleteTarget(null)
    knowledge.setKnowledgeDeleteTarget(null)
    closeKnowledgeReader()
    knowledge.setKnowledgeError(null)
    knowledge.setKnowledgeView(KNOWLEDGE_VIEW_LIST)
    setPanelMode('knowledge')
  }, [closeKnowledgeReader, history, knowledge])

  useEffect(() => {
    if (!open) return undefined

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()

      if (sending) {
        stopGeneration()
        return
      }

      if (reportTarget) {
        closeReportModal()
        return
      }

      if (knowledgeOpen && knowledgeReaderOpen) {
        closeKnowledgeReader()
        return
      }

      if (historyOpen || knowledgeOpen) {
        closeSubView()
        return
      }

      closePanel()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [
    closePanel,
    closeKnowledgeReader,
    closeReportModal,
    closeSubView,
    historyOpen,
    knowledgeOpen,
    knowledgeReaderOpen,
    open,
    reportTarget,
    sending,
    stopGeneration,
  ])

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      chat.sendMessage()
    }
  }

  if (!open) return null

  return (
    <aside ref={panelRef} className="ai-helper-panel" aria-label="Ask AI" tabIndex={-1}>
      <AiHelperHeader
        historyOpen={historyOpen}
        knowledgeOpen={knowledgeOpen}
        responseLanguage={responseLanguage}
        sending={chat.sending}
        onClose={closePanel}
        onNewChat={startNew}
        onResponseLanguageChange={setResponseLanguage}
        onToggleHistory={toggleHistory}
        onToggleKnowledge={toggleKnowledge}
      />

      {notice ? (
        <div className="ai-helper-notice" aria-live="polite">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="Dismiss notice">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {historyOpen ? (
        <HistoryView
          activeThreadId={chat.thread?.id}
          backButtonRef={backButtonRef}
          deleteTarget={history.deleteTarget}
          deletingThread={history.deletingThread}
          error={history.historyError}
          initialLoading={history.historyInitialLoading}
          loading={history.historyLoading}
          threads={history.historyThreads}
          onBack={closeSubView}
          onCancelDelete={() => history.setDeleteTarget(null)}
          onConfirmDelete={history.confirmDeleteThread}
          onDeleteTarget={history.setDeleteTarget}
          onOpenThread={history.openHistoryThread}
          onRefresh={() => history.loadHistory({ force: true })}
        />
      ) : knowledgeOpen ? (
        <KnowledgeView
          authUser={authUser}
          backButtonRef={backButtonRef}
          canManageKnowledge={isSysAdmin}
          isSysAdmin={isSysAdmin}
          knowledgeAcknowledged={knowledge.knowledgeAcknowledged}
          knowledgeDeleteTarget={knowledge.knowledgeDeleteTarget}
          knowledgeEntries={knowledgeEntriesForDisplay}
          knowledgeError={knowledge.knowledgeError}
          knowledgeFile={knowledge.knowledgeFile}
          knowledgeFileInputKey={knowledge.knowledgeFileInputKey}
          knowledgeInitialLoading={knowledge.knowledgeInitialLoading}
          knowledgeLoading={knowledge.knowledgeLoading}
          knowledgeReaderError={knowledge.knowledgeReaderError}
          knowledgeReaderLoading={knowledge.knowledgeReaderLoading}
          knowledgeReaderPdfError={knowledge.knowledgeReaderPdfError}
          knowledgeReaderPdfLoading={knowledge.knowledgeReaderPdfLoading}
          knowledgeReaderPdfUrl={knowledge.knowledgeReaderPdfUrl}
          knowledgeReaderHasOriginal={knowledge.knowledgeReaderHasOriginal}
          knowledgeReaderMarkdownError={knowledge.knowledgeReaderMarkdownError}
          knowledgeReaderMarkdownLoading={knowledge.knowledgeReaderMarkdownLoading}
          knowledgeReaderMarkdownSource={knowledge.knowledgeReaderMarkdownSource}
          knowledgeReaderOpen={knowledge.knowledgeReaderOpen}
          knowledgeReaderTab={knowledge.knowledgeReaderTab}
          knowledgeModuleKey={knowledge.knowledgeModuleKey}
          knowledgeScope={knowledge.knowledgeScope}
          knowledgeTitle={knowledge.knowledgeTitle}
          knowledgeUpdatingId={knowledge.knowledgeUpdatingId}
          knowledgeUploading={knowledge.knowledgeUploading}
          knowledgeView={knowledge.knowledgeView}
          knowledgeVisibility={knowledge.knowledgeVisibility}
          markdownAcknowledged={knowledge.markdownAcknowledged}
          markdownFile={knowledge.markdownFile}
          markdownFileInputKey={knowledge.markdownFileInputKey}
          markdownModuleKey={knowledge.markdownModuleKey}
          markdownScope={knowledge.markdownScope}
          markdownTitle={knowledge.markdownTitle}
          markdownUploading={knowledge.markdownUploading}
          selectedKnowledgeDetail={knowledge.selectedKnowledgeDetail}
          visibleKnowledgeModules={visibleKnowledgeModules}
          onBack={closeSubView}
          onConfirmDeleteKnowledge={knowledge.confirmDeleteKnowledge}
          onKnowledgeAcknowledgedChange={knowledge.setKnowledgeAcknowledged}
          onKnowledgeDeleteTargetChange={knowledge.setKnowledgeDeleteTarget}
          onKnowledgeErrorChange={knowledge.setKnowledgeError}
          onKnowledgeFileChange={knowledge.handleKnowledgeFileChange}
          onKnowledgeModuleKeyChange={knowledge.setKnowledgeModuleKey}
          onKnowledgeReaderClose={knowledge.closeKnowledgeReader}
          onKnowledgeReaderTabChange={knowledge.setKnowledgeReaderTab}
          onKnowledgeScopeChange={knowledge.setKnowledgeScope}
          onKnowledgeTitleChange={knowledge.setKnowledgeTitle}
          onKnowledgeViewChange={knowledge.setKnowledgeView}
          onKnowledgeVisibilityChange={knowledge.setKnowledgeVisibility}
          onLoadKnowledge={() => knowledge.loadKnowledge({ force: true })}
          onOpenKnowledge={knowledge.openKnowledgeReader}
          onMarkdownAcknowledgedChange={knowledge.setMarkdownAcknowledged}
          onMarkdownFileChange={knowledge.handleMarkdownFileChange}
          onMarkdownModuleKeyChange={knowledge.setMarkdownModuleKey}
          onMarkdownScopeChange={knowledge.setMarkdownScope}
          onMarkdownTitleChange={knowledge.setMarkdownTitle}
          onUploadKnowledge={() => knowledge.uploadKnowledge(showPersistentNotice)}
          onUploadMarkdownKnowledge={() => knowledge.uploadMarkdownKnowledge(showPersistentNotice)}
        />
      ) : (
        <ChatView
          copiedMessageId={chat.copiedMessageId}
          draft={chat.draft}
          draftRef={draftRef}
          knowledgeEntries={knowledgeEntriesForDisplay}
          knowledgeLoading={knowledge.knowledgeLoading}
          landingGuidancePreview={landingGuidancePreview}
          loadingThread={chat.loadingThread}
          messages={chat.messages}
          promptStarters={promptStarters}
          scrollRef={scrollRef}
          sendError={chat.sendError}
          sending={chat.sending}
          threadLoadingLabel={chat.threadLoadingLabel}
          onCopyMessage={chat.copyMessage}
          onDismissError={() => chat.setSendError(null)}
          onDraftChange={chat.setDraft}
          onKeyDown={handleKeyDown}
          onOpenKnowledgeList={openKnowledgeList}
          onReportMessage={chat.openReportModal}
          onRetryMessage={chat.retryMessage}
          onSendMessage={chat.sendMessage}
          onStopGeneration={chat.stopGeneration}
        />
      )}

      <ReportModal
        error={chat.reportError}
        reason={chat.reportReason}
        submitting={chat.reportSubmitting}
        target={chat.reportTarget}
        onClose={chat.closeReportModal}
        onReasonChange={(value) => {
          chat.setReportReason(value)
          if (chat.reportError) chat.setReportError(null)
        }}
        onSubmit={chat.submitReport}
      />
    </aside>
  )
}

export default AiHelperPanel
