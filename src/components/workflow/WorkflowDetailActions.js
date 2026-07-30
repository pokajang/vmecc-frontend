import React from 'react'
import FormActionGroup from 'src/components/FormActionGroup'

const WorkflowDetailActions = ({
  children,
  leading = null,
  statusMessage = '',
  ariaLabel = 'Workflow actions',
  className = '',
  mobileBehavior = 'compact-sticky',
}) => (
  <FormActionGroup
    leading={leading}
    statusMessage={statusMessage}
    ariaLabel={ariaLabel}
    className={className}
    mobileBehavior={mobileBehavior}
  >
    {children}
  </FormActionGroup>
)

export default WorkflowDetailActions
