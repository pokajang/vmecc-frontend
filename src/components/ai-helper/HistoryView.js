import { CTooltip } from '@coreui/react'
import { ArrowLeft, Loader, Trash2 } from 'lucide-react'

import { formatHistoryTime } from './constants'

const HistoryView = ({
  activeThreadId,
  backButtonRef,
  deleteTarget,
  deletingThread,
  error,
  initialLoading,
  loading,
  threads,
  onBack,
  onCancelDelete,
  onConfirmDelete,
  onDeleteTarget,
  onOpenThread,
  onRefresh,
}) => (
  <div className="ai-helper-history ai-helper-history--page">
    <div className="ai-helper-history__header">
      <div>
        <button
          type="button"
          className="ai-helper-history__back"
          ref={backButtonRef}
          onClick={onBack}
          aria-label="Back to chat"
        >
          <ArrowLeft size={16} />
          <span>Back to chat</span>
        </button>
        <div className="ai-helper-history__heading">Chat history</div>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>
        {loading ? (
          <>
            <Loader size={14} className="icon-spin" aria-hidden="true" />
            Refreshing
          </>
        ) : (
          'Refresh'
        )}
      </button>
    </div>
    {error ? <div className="ai-helper-history__error">{error}</div> : null}
    {deleteTarget ? (
      <div className="ai-helper-history-confirm">
        <div>
          Delete "<span>{deleteTarget.title || 'this chat'}</span>"?
        </div>
        <div className="ai-helper-history-confirm__actions">
          <button type="button" onClick={onCancelDelete} disabled={deletingThread}>
            Cancel
          </button>
          <button type="button" onClick={onConfirmDelete} disabled={deletingThread}>
            {deletingThread ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    ) : null}
    {initialLoading ? (
      <div className="ai-helper-history__empty">Loading history...</div>
    ) : threads.length ? (
      <>
        {loading ? (
          <div className="ai-helper-history__loading-inline" aria-live="polite">
            <Loader size={14} className="icon-spin" aria-hidden="true" />
            <span>Updating chat history...</span>
          </div>
        ) : null}
        <div
          className={`ai-helper-history__list${
            loading ? ' ai-helper-history__list--refreshing' : ''
          }`}
        >
          {threads.map((item) => (
            <div
              key={item.id}
              className={`ai-helper-history__item${activeThreadId === item.id ? ' active' : ''}`}
            >
              <button
                type="button"
                className="ai-helper-history__open"
                onClick={() => onOpenThread(item.id)}
              >
                <span className="ai-helper-history__title">{item.title || 'Ask AI chat'}</span>
                <span className="ai-helper-history__meta">
                  {formatHistoryTime(item.updated_at)}
                  {item.last_message ? ` - ${item.last_message}` : ''}
                </span>
              </button>
              <CTooltip content="Delete chat" placement="left">
                <button
                  type="button"
                  className="ai-helper-history__delete"
                  aria-label={`Delete ${item.title || 'chat'}`}
                  onClick={() => onDeleteTarget(item)}
                  disabled={deletingThread}
                >
                  <Trash2 size={15} />
                </button>
              </CTooltip>
            </div>
          ))}
        </div>
      </>
    ) : (
      <>
        {loading ? (
          <div className="ai-helper-history__loading-inline" aria-live="polite">
            <Loader size={14} className="icon-spin" aria-hidden="true" />
            <span>Updating chat history...</span>
          </div>
        ) : null}
        <div className="ai-helper-history__empty">No previous chats yet.</div>
      </>
    )}
  </div>
)

export default HistoryView
