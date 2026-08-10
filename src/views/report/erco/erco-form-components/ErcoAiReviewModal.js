import React from 'react'
import { CAlert, CBadge, CButton, CSpinner } from '@coreui/react'
import { ClipboardCheck } from 'lucide-react'
import ResponsiveReportDialog from 'src/components/report-workflow/ResponsiveReportDialog'
import { AI_REVIEW_STATUS, normalizeReviewStatus, reviewStatusLabel } from '../aiAssist'

const statusColor = (status) => {
  const normalized = normalizeReviewStatus(status)
  if (normalized === AI_REVIEW_STATUS.LOOKS_OK) return 'success'
  if (normalized === AI_REVIEW_STATUS.MISSING_INFORMATION) return 'warning'
  return 'info'
}

const ErcoAiReviewModal = ({
  visible,
  stage,
  items,
  errorMessage,
  canRetry = true,
  onClose,
  onRun,
  onRetry,
}) => {
  const closeDisabled = stage === 'loading'
  const title = (
    <span className="d-flex align-items-center gap-2">
      <ClipboardCheck size={17} />
      Check Report with AI
    </span>
  )
  const body = (
    <div className="d-grid gap-3">
      {stage === 'confirm' ? (
        <div className="text-body-secondary">
          Checks for missing or unclear details without changing or blocking the report.
        </div>
      ) : null}

      {stage === 'loading' ? (
        <div className="d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          <span className="text-body-secondary">Checking report...</span>
        </div>
      ) : null}

      {stage === 'results' ? (
        <div className="d-grid gap-3">
          <div className="text-body-secondary">
            Review these suggestions only if they are relevant to the incident.
          </div>
          {items.length > 0 ? (
            <div className="d-grid gap-2">
              {items.map((item, index) => (
                <div
                  key={`${item.status}-${index}-${item.message}`}
                  className="rounded-3 border bg-body p-3 d-grid gap-2"
                >
                  <div>
                    <CBadge color={statusColor(item.status)}>
                      {reviewStatusLabel(item.status)}
                    </CBadge>
                  </div>
                  <div>{item.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <CAlert color="success" className="mb-0">
              AI did not return any suggestions.
            </CAlert>
          )}
        </div>
      ) : null}

      {stage === 'error' ? (
        <CAlert color="danger" className="mb-0">
          {errorMessage || 'Ask AI could not check the report. You can continue manually.'}
        </CAlert>
      ) : null}
    </div>
  )
  const actions = (
    <>
      {stage === 'confirm' ? (
        <>
          <CButton type="button" color="light" onClick={onClose}>
            Cancel
          </CButton>
          <CButton type="button" color="info" onClick={onRun}>
            Check Report
          </CButton>
        </>
      ) : null}
      {stage === 'loading' ? (
        <CButton type="button" color="light" disabled>
          Checking...
        </CButton>
      ) : null}
      {stage === 'results' ? (
        <CButton type="button" color="primary" onClick={onClose}>
          Close
        </CButton>
      ) : null}
      {stage === 'error' ? (
        <>
          <CButton type="button" color="light" onClick={onClose}>
            Close
          </CButton>
          {canRetry ? (
            <CButton type="button" color="danger" onClick={onRetry}>
              Retry
            </CButton>
          ) : null}
        </>
      ) : null}
    </>
  )

  return (
    <ResponsiveReportDialog
      visible={visible}
      title={title}
      ariaLabel="Check Report with AI"
      onClose={closeDisabled ? undefined : onClose}
      closeDisabled={closeDisabled}
      footer={actions}
      desktopFullscreen="sm"
      scrollable
    >
      {body}
    </ResponsiveReportDialog>
  )
}

export default ErcoAiReviewModal
