import React from 'react'

const FEEDBACK_COLOR_CLASS = {
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

const InlineFeedbackMessage = ({ feedback, className = '' }) => {
  if (!feedback?.message) return null

  const colorClass = FEEDBACK_COLOR_CLASS[feedback.color] || 'text-muted'
  const classes = ['small', colorClass, className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="status" aria-live="polite">
      {feedback.title ? <span className="fw-semibold">{feedback.title}: </span> : null}
      <span>{feedback.message}</span>
    </div>
  )
}

export default InlineFeedbackMessage
