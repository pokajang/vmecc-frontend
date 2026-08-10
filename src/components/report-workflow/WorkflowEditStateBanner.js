import React from 'react'
import { CAlert, CButton } from '@coreui/react'

const WorkflowEditStateBanner = ({
  displayId,
  children,
  sourceMode = '',
  hasDraftSource = false,
  onLoadOriginal,
  onLoadDraft,
  originalLabel = 'Load Original',
  draftLabel = 'Load Draft',
}) => {
  const showSourceActions = Boolean(onLoadOriginal || onLoadDraft)

  return (
    <CAlert
      color="info"
      className={
        showSourceActions
          ? 'd-flex flex-wrap align-items-center justify-content-between gap-2'
          : undefined
      }
    >
      <span>
        Editing <strong>{displayId}</strong>. {children}
      </span>
      {showSourceActions ? (
        <div className="d-flex flex-wrap gap-2">
          {onLoadOriginal ? (
            <CButton
              type="button"
              color={sourceMode === 'original' ? 'primary' : 'light'}
              onClick={onLoadOriginal}
            >
              {originalLabel}
            </CButton>
          ) : null}
          {onLoadDraft ? (
            <CButton
              type="button"
              color={sourceMode === 'draft' ? 'primary' : 'light'}
              disabled={!hasDraftSource}
              onClick={onLoadDraft}
            >
              {draftLabel}
            </CButton>
          ) : null}
        </div>
      ) : null}
    </CAlert>
  )
}

export default WorkflowEditStateBanner
