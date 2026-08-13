import React from 'react'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'

const REVIEW_ACTION_LABEL = 'Continue to Review'
const REVIEW_UPDATE_ACTION_LABEL = 'Continue to Review Updates'

const ActionSection = ({ sectionLabel = '', wrapperClassName = '', children }) => (
  <div className={['d-grid gap-2', wrapperClassName].filter(Boolean).join(' ')}>
    {sectionLabel ? (
      <div className="small fw-semibold text-body-secondary">{sectionLabel}</div>
    ) : null}
    {children}
  </div>
)

const buildSyncFeedback = (draftSyncState, onRetryDraftSync) => {
  if (String(draftSyncState?.status || '').trim() !== 'failed') return null

  return {
    kind: 'error',
    title: 'Draft sync failed',
    message:
      String(draftSyncState?.message || '').trim() ||
      'Your inspection remains open. Retry when the connection is available.',
    action: {
      label: 'Retry sync',
      onAction: onRetryDraftSync,
    },
  }
}

export const InspectionFormActions = ({
  alignLeft = false,
  className = '',
  draftStatus,
  draftSyncState,
  readiness = null,
  leadingAction = null,
  isMobileSticky = false,
  isUpdateMode = false,
  onRequestReview,
  onRetryDraftSync,
  reviewScopeMessage = '',
  sectionLabel = '',
  submissionMode = 'review',
  validationStatusMessage,
  wrapperClassName = '',
}) => {
  const reviewLabel =
    submissionMode === 'direct'
      ? isUpdateMode
        ? 'Update Report'
        : 'Submit Report'
      : isUpdateMode
        ? REVIEW_UPDATE_ACTION_LABEL
        : REVIEW_ACTION_LABEL

  return (
    <ActionSection sectionLabel={sectionLabel} wrapperClassName={wrapperClassName}>
      <WorkflowStageActions
        className={['inspection-form-actions', className].filter(Boolean).join(' ')}
        actionsAlign={alignLeft ? 'start' : 'end'}
        mobileBehavior={isMobileSticky ? 'compact-sticky' : 'in-flow'}
        statusMessage={
          validationStatusMessage ||
          reviewScopeMessage ||
          (submissionMode === 'direct'
            ? 'This submits immediately without a separate review screen.'
            : '') ||
          draftStatus
        }
        feedback={buildSyncFeedback(draftSyncState, onRetryDraftSync)}
        auxiliaryActions={leadingAction}
        onPrimary={onRequestReview}
        primaryLabel={reviewLabel}
        primaryDisabled={readiness?.isReadyToReview === false}
        primaryFirst={isMobileSticky}
        ariaLabel="Inspection form actions"
      />
    </ActionSection>
  )
}

export const InspectionFormDraftOnlyActions = ({
  alignLeft = false,
  className = '',
  disabledReviewMessage = '',
  draftStatus,
  draftSyncState,
  getLatestForm,
  leadingAction = null,
  isMobileSticky = false,
  isUpdateMode = false,
  onRetryDraftSync,
  onSaveDraft,
  sectionLabel = '',
  statusMessage = '',
  wrapperClassName = '',
}) => {
  const reviewLabel = isUpdateMode ? REVIEW_UPDATE_ACTION_LABEL : REVIEW_ACTION_LABEL

  return (
    <ActionSection sectionLabel={sectionLabel} wrapperClassName={wrapperClassName}>
      <WorkflowStageActions
        className={['inspection-form-actions', className].filter(Boolean).join(' ')}
        actionsAlign={alignLeft ? 'start' : 'end'}
        mobileBehavior={isMobileSticky ? 'compact-sticky' : 'in-flow'}
        statusMessage={
          disabledReviewMessage ||
          statusMessage ||
          draftStatus ||
          'This inspection type can be saved as draft only.'
        }
        feedback={buildSyncFeedback(draftSyncState, onRetryDraftSync)}
        auxiliaryActions={leadingAction}
        onSaveDraft={() => onSaveDraft?.(getLatestForm())}
        saveLabel={isUpdateMode ? 'Save Update Draft' : 'Save Draft'}
        showPrimary={Boolean(disabledReviewMessage)}
        primaryLabel={reviewLabel}
        primaryDisabled
        primaryFirst={isMobileSticky}
        ariaLabel="Inspection draft actions"
      />
    </ActionSection>
  )
}
