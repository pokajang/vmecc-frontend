import React from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { formatDateTime } from './notificationUtils'
import { getModuleLabel, getEventLabel } from './notificationConstants'

const ROUTING_SOURCE_LABELS = {
  temporary_coverage: 'Temporary coverage',
  role_assignment: 'Permanent assignment',
  legacy_role: 'Legacy role assignment',
  legacy_team: 'Legacy team assignment',
  organization: 'Organization-wide role',
  fallback: 'Fallback assignment',
}

const workflowContextLabel = (item = {}) => {
  const metadata = item.metadata || {}
  const team = String(metadata.workflowTeamName || '').trim()
  const role = String(metadata.nextActionRole || metadata.workflowApplicantRole || '').trim()
  const source = String(metadata.workflowRoutingSource || '').trim()

  if (!team && !role && !source) return ''

  return [
    team || 'Organization-wide',
    source === 'temporary_coverage' && role ? `Acting ${role}` : role,
    ROUTING_SOURCE_LABELS[source] || '',
  ]
    .filter(Boolean)
    .join(' · ')
}

const WorkflowNotificationCard = ({ item, onClick, onDelete, onMarkRead }) => {
  if (!item) return null

  const moduleLabel = getModuleLabel(item)
  const eventLabel = getEventLabel(item)
  const summary =
    String(item.message || item.title || '').trim() || `${moduleLabel} ${eventLabel || 'update'}`
  const contextLabel = workflowContextLabel(item)

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
        <span className="notification-item-body">
          <span className="notification-item-text">{summary}</span>
          {item.actionRequiredForViewer && (
            <span className="notification-item-action-chip">Action required</span>
          )}
          {contextLabel && <span className="notification-item-meta">{contextLabel}</span>}
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
          <Eye size={13} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="notification-item-action notification-item-action--delete"
        onClick={handleDelete}
        aria-label="Delete notification"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </div>
  )
}

export default WorkflowNotificationCard
