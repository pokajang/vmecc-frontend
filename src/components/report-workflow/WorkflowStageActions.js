import React from 'react'
import AppButton from 'src/components/AppButton'
import FormActionGroup from 'src/components/FormActionGroup'
import useMediaQuery from 'src/hooks/useMediaQuery'
import WorkflowInlineFeedback from './WorkflowInlineFeedback'

const MOBILE_WORKFLOW_ACTION_QUERY = '(max-width: 767.98px)'

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
  primaryFirst = false,
  showPrimary = true,
  auxiliaryActions = null,
  leading = null,
  mobileBehavior = 'in-flow',
  mobileLayout = 'default',
  dockAtEnd = false,
  actionsAlign = 'end',
  className = '',
  ariaLabel = 'Workflow actions',
}) => {
  const isMobile = useMediaQuery(MOBILE_WORKFLOW_ACTION_QUERY)
  const usesMobileStackedLayout = mobileLayout === 'stacked-primary-first'
  const isMobileStacked = usesMobileStackedLayout && isMobile
  const resolvedPrimaryFirst = primaryFirst || isMobileStacked
  const resolvedFeedback =
    feedback ||
    (blockerMessage
      ? {
          kind: 'error',
          message: blockerMessage,
        }
      : null)
  const rawStatus = String(statusMessage || '').trim()
  const visibleStatus = /^unsaved changes$/i.test(rawStatus) ? '' : rawStatus
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
  const primaryAction = showPrimary ? (
    <AppButton
      className="workflow-stage-actions__primary"
      type={primaryType}
      intent="primary"
      disabled={primaryDisabled || isSaving}
      onClick={primaryType === 'submit' ? undefined : onPrimary}
    >
      {primaryLabel}
    </AppButton>
  ) : null
  const saveAction =
    typeof onSaveDraft === 'function' ? (
      <AppButton
        type="button"
        intent="neutral"
        disabled={saveDisabled || isSaving}
        onClick={onSaveDraft}
      >
        {isSaving ? 'Saving...' : saveLabel}
      </AppButton>
    ) : null

  return (
    <div
      className={[
        'workflow-stage-actions',
        usesMobileStackedLayout ? 'workflow-stage-actions--mobile-stacked' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={isSaving || undefined}
    >
      {resolvedFeedback ? <WorkflowInlineFeedback {...resolvedFeedback} /> : null}
      <FormActionGroup
        className="workflow-stage-actions__group"
        mobileBehavior={usesMobileStackedLayout ? 'terminal' : mobileBehavior}
        dockAtEnd={dockAtEnd}
        actionsAlign={actionsAlign}
        leading={resolvedLeading}
        statusMessage={visibleStatus}
        ariaLabel={ariaLabel}
      >
        {resolvedPrimaryFirst ? primaryAction : null}
        {isMobileStacked ? saveAction : null}
        {typeof onBack === 'function' ? (
          <AppButton type="button" intent="neutral" disabled={isSaving} onClick={onBack}>
            {backLabel}
          </AppButton>
        ) : null}
        {typeof onReset === 'function' ? (
          <AppButton type="button" intent="neutral" disabled={isSaving} onClick={onReset}>
            {resetLabel}
          </AppButton>
        ) : null}
        {auxiliaryActions}
        {!isMobileStacked ? saveAction : null}
        {!resolvedPrimaryFirst ? primaryAction : null}
      </FormActionGroup>
    </div>
  )
}

export default WorkflowStageActions
