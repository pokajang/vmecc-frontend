import React from 'react'
import { CAlert } from '@coreui/react'
import { CircleAlert, Inbox, Loader } from 'lucide-react'

const PageState = ({
  variant = 'loading',
  title = '',
  message = '',
  action = null,
  minHeight = 160,
  className = '',
}) => {
  if (variant === 'error') {
    return (
      <CAlert color="danger" role="alert" className={className}>
        <div className="d-flex align-items-start gap-2">
          <CircleAlert size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
          <div className="flex-grow-1">
            {title ? <div className="fw-semibold">{title}</div> : null}
            {message ? <div className={title ? 'mt-1' : ''}>{message}</div> : null}
            {action ? <div className="mt-3">{action}</div> : null}
          </div>
        </div>
      </CAlert>
    )
  }

  const isLoading = variant === 'loading'
  const Icon = isLoading ? Loader : Inbox

  return (
    <div
      role={isLoading ? 'status' : undefined}
      aria-live={isLoading ? 'polite' : undefined}
      className={`d-flex flex-column align-items-center justify-content-center gap-2 text-center text-body-secondary ${className}`.trim()}
      style={{ minHeight }}
    >
      <Icon size={22} className={isLoading ? 'icon-spin' : ''} aria-hidden="true" />
      {title ? <div className="fw-semibold text-body">{title}</div> : null}
      {message ? <div className="small">{message}</div> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

export default PageState
