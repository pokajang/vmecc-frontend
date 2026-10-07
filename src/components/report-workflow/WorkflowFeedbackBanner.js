import React from 'react'
import WorkflowInlineFeedback from './WorkflowInlineFeedback'

const WorkflowFeedbackBanner = ({ feedback, onDismiss, className = 'mb-3' }) => {
  if (!feedback?.message && !feedback?.title) return null

  const kind =
    feedback.kind ||
    { danger: 'error', warning: 'warning', success: 'success', info: 'info' }[feedback.color] ||
    'info'

  return (
    <WorkflowInlineFeedback
      kind={kind}
      title={feedback.title || ''}
      message={feedback.message || ''}
      className={className}
      action={typeof onDismiss === 'function' ? { label: 'Dismiss', onAction: onDismiss } : null}
    />
  )
}

export default WorkflowFeedbackBanner
