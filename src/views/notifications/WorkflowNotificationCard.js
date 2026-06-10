import React from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { formatDateTime } from './notificationUtils'
import { getModuleLabel, getEventLabel } from './notificationConstants'

const WorkflowNotificationCard = ({ item, onClick, onDelete, onMarkRead }) => {
  if (!item) return null

  const moduleLabel = getModuleLabel(item)
  const eventLabel = getEventLabel(item)
  const summary =
    String(item.message || item.title || '').trim() || `${moduleLabel} ${eventLabel || 'update'}`

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(item.id)
  }

  const handleMarkRead = (e) => {
    e.stopPropagation()
    onMarkRead(item.id)
  }

  return (
    <div
      className={`notification-item${item.unread ? ' unread' : ''}${item.actionRequiredForViewer ? ' action-required' : ''}`}
    >
      <button type="button" className="notification-item-main" onClick={() => onClick(item)}>
        <span className="notification-item-dot" aria-hidden="true" />
        <span className="notification-item-body">
          <span className="notification-item-text">{summary}</span>
          {item.actionRequiredForViewer && (
            <span className="notification-item-action-chip">Action required</span>
          )}
          <span className="notification-item-meta">
            {moduleLabel}
            {eventLabel ? ` - ${eventLabel}` : ''}
            {' - '}
            {formatDateTime(item.createdAt)}
          </span>
        </span>
      </button>
      {item.unread && (
        <button
          type="button"
          className="notification-item-action"
          onClick={handleMarkRead}
          aria-label="Mark as read"
        >
          <Eye size={13} />
        </button>
      )}
      <button
        type="button"
        className="notification-item-action notification-item-action--delete"
        onClick={handleDelete}
        aria-label="Delete notification"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default WorkflowNotificationCard
