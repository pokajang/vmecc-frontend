import React from 'react'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import ResponsiveChoiceSelector from './ResponsiveChoiceSelector'
import WorkflowInlineFeedback from './WorkflowInlineFeedback'
import WorkflowStageActions from './WorkflowStageActions'

const WorkflowChoiceStage = ({
  title,
  description = '',
  options = [],
  value,
  onChange,
  onContinue,
  continueLabel = 'Continue',
  continueTestId,
  continueDisabled,
  disabled = false,
  error = '',
  ariaLabel,
  testIdPrefix = '',
  columns = { xs: 12, md: 3 },
  rowClassName,
  variant = 'compact',
  showDescription = true,
  advanceOnSelect = false,
  children = null,
  className = '',
  testId,
}) => {
  const isMobile = useReportIsMobile()
  const resolvedContinueDisabled =
    typeof continueDisabled === 'boolean' ? continueDisabled : !value || disabled
  const handleChange = (nextValue, option) => {
    onChange?.(nextValue, option)
    if (advanceOnSelect) onContinue?.(nextValue, option)
  }

  return (
    <section
      className={['workflow-choice-stage', 'd-grid gap-3', className].filter(Boolean).join(' ')}
      data-testid={testId}
    >
      <div className="workflow-choice-stage__heading d-grid gap-1">
        <h2 className="h6 mb-0">{title}</h2>
        {description ? <p className="small text-body-secondary mb-0">{description}</p> : null}
      </div>
      <ResponsiveChoiceSelector
        isMobile={isMobile}
        options={options}
        value={value}
        onChange={handleChange}
        selectionMode={advanceOnSelect ? 'action' : 'single'}
        disabled={disabled}
        ariaLabel={ariaLabel || title}
        testIdPrefix={testIdPrefix}
        columns={columns}
        rowClassName={rowClassName}
        variant={variant}
        showDescription={showDescription}
      />
      {children}
      {error ? <WorkflowInlineFeedback kind="error" message={error} compact /> : null}
      {!advanceOnSelect ? (
        <WorkflowStageActions
          onPrimary={() => onContinue?.(value)}
          primaryLabel={continueLabel}
          primaryTestId={continueTestId}
          primaryDisabled={resolvedContinueDisabled}
          mobileLayout="stacked-primary-first"
          stackedMobileBehavior="compact-sticky"
          dockAtEnd
          ariaLabel={`${title} actions`}
        />
      ) : null}
    </section>
  )
}

export default WorkflowChoiceStage
