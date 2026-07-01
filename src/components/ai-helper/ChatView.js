import { CTooltip } from '@coreui/react'
import { Loader, Send, Square, X } from 'lucide-react'

import { knowledgeEntryName } from './constants'
import MessageBubble from './MessageBubble'

const ChatView = ({
  copiedMessageId,
  draft,
  draftRef,
  knowledgeEntries,
  knowledgeLoading,
  landingGuidancePreview,
  loadingThread,
  messages,
  promptStarters,
  scrollRef,
  sendError,
  sending,
  threadLoadingLabel,
  onCopyMessage,
  onDismissError,
  onDraftChange,
  onKeyDown,
  onOpenKnowledgeList,
  onReportMessage,
  onRetryMessage,
  onSendMessage,
  onStopGeneration,
}) => (
  <>
    <div ref={scrollRef} className="ai-helper-messages">
      {loadingThread ? (
        <div className="ai-helper-empty">
          <Loader size={18} className="icon-spin" />
          <span>{threadLoadingLabel}</span>
        </div>
      ) : messages.length ? (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            copied={copiedMessageId === message.id}
            onCopy={onCopyMessage}
            onReport={onReportMessage}
            onRetry={onRetryMessage}
            retryDisabled={sending}
          />
        ))
      ) : (
        <div className="ai-helper-empty">
          <div className="ai-helper-empty__intro">
            <span>Ask anything about VMECC.</span>
          </div>
          <div className="ai-helper-starters" aria-label="Suggested Ask AI prompts">
            {promptStarters.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSendMessage({ prompt, clearDraft: true })}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
          </div>
          {knowledgeLoading || landingGuidancePreview.length ? (
            <div className="ai-helper-guidance-preview">
              <div className="ai-helper-guidance-preview__header">
                <span>Available Guidance ({knowledgeEntries.length})</span>
                {knowledgeEntries.length ? (
                  <button type="button" onClick={onOpenKnowledgeList}>
                    Show all
                  </button>
                ) : null}
              </div>
              {knowledgeLoading ? (
                <div className="ai-helper-guidance-preview__loading">Loading guidance...</div>
              ) : (
                <div
                  className="ai-helper-guidance-preview__list"
                  aria-label="Available guidance files"
                >
                  {landingGuidancePreview.map((entry) => (
                    <CTooltip key={entry.id} content={knowledgeEntryName(entry)} placement="top">
                      <button type="button" onClick={onOpenKnowledgeList}>
                        {knowledgeEntryName(entry)}
                      </button>
                    </CTooltip>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>

    {sendError ? (
      <div className="ai-helper-error" aria-live="polite">
        <span>{sendError}</span>
        <button type="button" onClick={onDismissError} aria-label="Dismiss error">
          <X size={14} />
        </button>
      </div>
    ) : null}

    <div className="ai-helper-composer">
      <textarea
        ref={draftRef}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask about VMECC in English or BM"
        rows={2}
        aria-label="Ask AI message"
      />
      {sending ? (
        <CTooltip content="Stop response" placement="top">
          <button
            type="button"
            className="ai-helper-send ai-helper-stop"
            onClick={onStopGeneration}
            aria-label="Stop Ask AI response"
            title="Stop response"
          >
            <Square size={16} />
          </button>
        </CTooltip>
      ) : (
        <button
          type="button"
          className="ai-helper-send"
          onClick={onSendMessage}
          disabled={!draft.trim()}
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      )}
    </div>
    <div className="ai-helper-footnote">AI can make mistakes. Always verify facts.</div>
  </>
)

export default ChatView
