import React from 'react'
import { CAlert, CButton } from '@coreui/react'

const FEEDBACK_COLORS = {
  error: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info',
  loading: 'info',
}

const WorkflowInlineFeedback = ({
  kind = 'error',
  title = '',
  message = '',
  action = null,
  className = '',
  compact = false,
}) => {
  const visibleMessage = String(message || '').trim()
  if (!visibleMessage && !title) return null

  const isUrgent = kind === 'error' || kind === 'warning'
  const actionLabel = String(action?.label || '').trim()

  return (
    <CAlert
      color={FEEDBACK_COLORS[kind] || FEEDBACK_COLORS.info}
      className={[
        'workflow-inline-feedback',
        compact ? 'workflow-inline-feedback--compact' : '',
        'mb-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
    >
      <div className="workflow-inline-feedback__content">
        <div className="workflow-inline-feedback__copy">
          {title ? <div className="workflow-inline-feedback__title">{title}</div> : null}
          {visibleMessage ? (
            <div className="workflow-inline-feedback__message">{visibleMessage}</div>
          ) : null}
        </div>
        {actionLabel && typeof action?.onAction === 'function' ? (
          <CButton
            type="button"
            color={FEEDBACK_COLORS[kind] || FEEDBACK_COLORS.info}
            variant="outline"
            size={compact ? 'sm' : undefined}
            className="workflow-inline-feedback__action"
            disabled={Boolean(action.disabled)}
            onClick={action.onAction}
          >
            {actionLabel}
          </CButton>
        ) : null}
      </div>
    </CAlert>
  )
}

export default WorkflowInlineFeedback
