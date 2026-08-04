import React from 'react'
import { CButton } from '@coreui/react'
import { Plus } from 'lucide-react'

const RoleAssignmentAddButton = ({
  label = 'Add assignment',
  disabled = false,
  onClick,
  ...buttonProps
}) => (
  <CButton
    {...buttonProps}
    type="button"
    size="sm"
    color="secondary"
    variant="outline"
    disabled={disabled}
    onClick={onClick}
  >
    <Plus size={14} className="me-1" />
    {label}
  </CButton>
)

export default RoleAssignmentAddButton
