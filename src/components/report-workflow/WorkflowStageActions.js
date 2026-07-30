import React from 'react'
import { CButton } from '@coreui/react'
import FormActionGroup from 'src/components/FormActionGroup'
import WorkflowInlineFeedback from './WorkflowInlineFeedback'

const WorkflowStageActions = ({
  onBack,
  backLabel = 'Back',
  onReset,
  resetLabel = 'Reset',
  onSaveDraft,
  saveLabel = 'Save Draft',
  onPrimary,
  primaryLabel = 'Continue',
  primaryType = 'button',
  statusMessage = '',
  feedback = null,
  blockerMessage = '',
  isSaving = false,
  saveDisabled = false,
  primaryDisabled = false,
  showPrimary = true,
  auxiliaryActions = null,
  leading = null,
  mobileBehavior = 'in-flow',
  actionsAlign = 'end',
  className = '',
  ariaLabel = 'Workflow actions',
}) => {
  const resolvedFeedback =
    feedback ||
    (blockerMessage
      ? {
          kind: 'error',
          message: blockerMessage,
        }
      : null)
  const visibleStatus = String(statusMessage || '').trim()
  const statusNode = visibleStatus ? (
    <div className="workflow-stage-actions__status" role="status" aria-live="polite">
      {visibleStatus}
    </div>
  ) : null
  const resolvedLeading =
    mobileBehavior === 'compact-sticky' ? (
      leading
    ) : leading && statusNode ? (
      <div className="workflow-stage-actions__leading">
        {statusNode}
        {leading}
      </div>
    ) : (
      leading || statusNode
    )

  return (
    <div
      className={['workflow-stage-actions', className].filter(Boolean).join(' ')}
      aria-busy={isSaving || undefined}
    >
      {resolvedFeedback ? <WorkflowInlineFeedback {...resolvedFeedback} /> : null}
      <FormActionGroup
        className="workflow-stage-actions__group"
        mobileBehavior={mobileBehavior}
        actionsAlign={actionsAlign}
        leading={resolvedLeading}
        statusMessage={visibleStatus}
        ariaLabel={ariaLabel}
      >
        {typeof onBack === 'function' ? (
          <CButton type="button" color="light" onClick={onBack}>
            {backLabel}
          </CButton>
        ) : null}
        {typeof onReset === 'function' ? (
          <CButton type="button" color="light" onClick={onReset}>
            {resetLabel}
          </CButton>
        ) : null}
        {auxiliaryActions}
        {typeof onSaveDraft === 'function' ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            disabled={saveDisabled || isSaving}
            onClick={onSaveDraft}
          >
            {isSaving ? 'Saving…' : saveLabel}
          </CButton>
        ) : null}
        {showPrimary ? (
          <CButton
            type={primaryType}
            color="primary"
            disabled={primaryDisabled || isSaving}
            onClick={primaryType === 'submit' ? undefined : onPrimary}
          >
            {primaryLabel}
          </CButton>
        ) : null}
      </FormActionGroup>
    </div>
  )
}

export default WorkflowStageActions
