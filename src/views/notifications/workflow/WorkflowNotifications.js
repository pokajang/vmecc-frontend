import React, { useRef, useState } from 'react'
import { CheckCheck, Trash2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import useWorkflowNotifications from 'src/hooks/useWorkflowNotifications'
import { buildWorkflowNotificationDetailPath } from 'src/services/workflowNotifications'
import TableLoader from 'src/components/TableLoader'
import WorkflowNotificationCard from '../WorkflowNotificationCard'
import MobileOverlaySection from 'src/components/header/MobileOverlaySection'

export const groupWorkflowNotifications = (items = []) => {
  const actionRequired = []
  const updates = []
  ;(Array.isArray(items) ? items : []).forEach((item) => {
    if (item?.actionRequiredForViewer) {
      actionRequired.push(item)
    } else {
      updates.push(item)
    }
  })
  return [
    {
      key: 'action-required',
      label: 'Action Required',
      items: actionRequired,
    },
    {
      key: 'updates',
      label: 'Other Updates',
      items: updates,
    },
  ].filter((group) => group.items.length > 0)
}

const resolveFeedbackConfirmColor = (color) => {
  if (['primary', 'success', 'info', 'warning', 'danger'].includes(color)) return color
  return 'info'
}

const WorkflowNotifications = ({ onClose }) => {
  const navigate = useNavigate()
  const {
    items,
    loading,
    submitting,
    error,
    refresh,
    markRead,
    markAllRead,
    deleteOne,
    deleteAll,
  } = useWorkflowNotifications({ unreadOnly: false })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  const deleteAllTriggerRef = useRef(null)
  const groupedItems = groupWorkflowNotifications(items)

  const handleClick = (item) => {
    if (item.unread) {
      markRead(item.id)
    }
    onClose?.()
    navigate(item.deepLink || buildWorkflowNotificationDetailPath({ event: item }))
  }

  const handleRequestDeleteAll = () => {
    setConfirmOpen(true)
  }

  const handleCancelDeleteAll = () => {
    setConfirmOpen(false)
    setTimeout(() => deleteAllTriggerRef.current?.focus(), 0)
  }

  const clearFeedback = () => {
    setFeedback(null)
  }

  const runBatchAction = async (actionName, action, successMessage) => {
    setFeedback(null)
    setActiveAction(actionName)
    try {
      const succeeded = await action()
      if (succeeded) {
        setFeedback({ color: 'success', message: successMessage })
      }
    } finally {
      setActiveAction(null)
    }
  }

  const handleMarkAllRead = () =>
    runBatchAction('mark-all-read', markAllRead, 'All messages marked as read.')

  const handleConfirmDeleteAll = async () => {
    setConfirmOpen(false)
    await runBatchAction('delete-all', deleteAll, 'All messages deleted.')
  }

  const handleRefresh = () => runBatchAction('refresh', refresh, 'Messages refreshed successfully.')

  return (
    <>
      <ActionConfirmModal
        visible={Boolean(feedback?.message)}
        title={feedback?.title || 'Notice'}
        message={feedback?.message || ''}
        confirmLabel="OK"
        confirmColor={resolveFeedbackConfirmColor(feedback?.color)}
        isNotice
        showCancelAction={false}
        onClose={clearFeedback}
        onConfirm={clearFeedback}
      />
      <ActionConfirmModal
        visible={confirmOpen}
        title="Delete all notifications?"
        message={`This will remove ${items.length} notification${items.length !== 1 ? 's' : ''} from your list.`}
        confirmLabel="Delete all"
        confirmColor="danger"
        confirmDisabled={submitting}
        onClose={handleCancelDeleteAll}
        onConfirm={handleConfirmDeleteAll}
      />
      <div className="notification-drawer-content" data-testid="workflow-notifications-module">
        {/* Batch actions */}
        <div className="notification-drawer-actions" data-testid="workflow-notifications-actions">
          <button
            ref={deleteAllTriggerRef}
            type="button"
            className="notification-drawer-action-btn"
            onClick={handleMarkAllRead}
            disabled={loading || submitting || items.every((i) => !i.unread)}
            aria-label="Mark all notifications as read"
            title="Mark all as read"
            aria-busy={activeAction === 'mark-all-read'}
          >
            <CheckCheck aria-hidden="true" />
          </button>
          <button
            type="button"
            className="notification-drawer-action-btn notification-drawer-action-btn--danger"
            onClick={handleRequestDeleteAll}
            disabled={loading || submitting || items.length === 0}
            aria-label="Delete all notifications"
            title="Delete all notifications"
          >
            <Trash2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className="notification-drawer-action-btn"
            onClick={handleRefresh}
            disabled={loading || submitting}
            aria-label="Refresh notifications"
            title="Refresh notifications"
            aria-busy={activeAction === 'refresh'}
          >
            <RefreshCw
              className={activeAction === 'refresh' ? 'notification-drawer-action-icon--spin' : ''}
              aria-hidden="true"
            />
          </button>
        </div>

        {loading && (
          <div className="px-3 py-3">
            <TableLoader />
          </div>
        )}

        {!loading && error && <div className="notification-drawer-empty text-danger">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="notification-drawer-empty" data-testid="workflow-notifications-empty">
            No notifications yet.
          </div>
        )}

        {!loading && !error && groupedItems.length > 0 ? (
          <div data-testid="workflow-notifications-list">
            {groupedItems.map((group) => (
              <section key={group.key} className="notification-drawer-group">
                <MobileOverlaySection
                  className="notification-drawer-group-title"
                  count={group.items.length}
                >
                  {group.label}
                </MobileOverlaySection>
                {group.items.map((item) => (
                  <WorkflowNotificationCard
                    key={item.id}
                    item={item}
                    onClick={handleClick}
                    onDelete={deleteOne}
                    onMarkRead={markRead}
                  />
                ))}
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

export default WorkflowNotifications
