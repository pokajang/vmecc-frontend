import React, { useState } from 'react'
import { CheckCheck, Trash2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useWorkflowNotifications from 'src/hooks/useWorkflowNotifications'
import { buildWorkflowNotificationDetailPath } from 'src/services/workflowNotifications'
import TableLoader from 'src/components/TableLoader'
import WorkflowNotificationCard from '../WorkflowNotificationCard'

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

  const handleClick = (item) => {
    if (item.unread) {
      markRead(item.id)
    }
    onClose?.()
    navigate(buildWorkflowNotificationDetailPath({ event: item }))
  }

  const handleRequestDeleteAll = () => {
    setConfirmOpen(true)
  }

  const handleCancelDeleteAll = () => {
    setConfirmOpen(false)
  }

  const handleConfirmDeleteAll = async () => {
    setConfirmOpen(false)
    await deleteAll()
  }

  return (
    <>
      <div className="notification-drawer-content">
        {/* Batch actions */}
        <div className="notification-drawer-actions">
          <button
            className="notification-drawer-action-btn"
            onClick={markAllRead}
            disabled={loading || submitting || items.every((i) => !i.unread)}
          >
            <CheckCheck size={13} />
            &nbsp;Mark all read
          </button>
          <button
            className="notification-drawer-action-btn notification-drawer-action-btn--danger"
            onClick={handleRequestDeleteAll}
            disabled={loading || submitting || items.length === 0}
          >
            <Trash2 size={13} />
            &nbsp;Delete all
          </button>
          <button
            className="notification-drawer-action-btn ms-auto"
            onClick={refresh}
            disabled={loading || submitting}
          >
            <RefreshCw size={13} />
            &nbsp;Refresh
          </button>
        </div>

        {confirmOpen && (
          <div className="notification-drawer-inline-confirm" role="alert">
            <div className="notification-drawer-inline-confirm__copy">
              <strong>Delete all notifications?</strong>
              <span>
                This will remove {items.length} notification{items.length !== 1 ? 's' : ''} from
                your list.
              </span>
            </div>
            <div className="notification-drawer-inline-confirm__actions">
              <button
                type="button"
                className="notification-drawer-inline-confirm__btn"
                onClick={handleCancelDeleteAll}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notification-drawer-inline-confirm__btn notification-drawer-inline-confirm__btn--danger"
                onClick={handleConfirmDeleteAll}
                disabled={submitting}
              >
                Delete all
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="px-3 py-3">
            <TableLoader />
          </div>
        )}

        {!loading && error && <div className="notification-drawer-empty text-danger">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="notification-drawer-empty">No notifications yet.</div>
        )}

        {!loading &&
          !error &&
          items.map((item) => (
            <WorkflowNotificationCard
              key={item.id}
              item={item}
              onClick={handleClick}
              onDelete={deleteOne}
              onMarkRead={markRead}
            />
          ))}
      </div>
    </>
  )
}

export default WorkflowNotifications
