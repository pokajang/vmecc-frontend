import React from 'react'
import { Bell, CalendarDays, Clock, FileText, Heart, User, Users, WalletCards } from 'lucide-react'
import WorkflowChoiceStage from 'src/components/report-workflow/WorkflowChoiceStage'

export const LEAVE_TYPE_OPTIONS = [
  {
    value: 'Annual Leave',
    title: 'Annual Leave',
    description: '',
    icon: CalendarDays,
  },
  {
    value: 'Medical Leave',
    title: 'Medical Leave',
    description: '',
    icon: Clock,
  },
  {
    value: 'Emergency Leave',
    title: 'Emergency Leave',
    description: '',
    icon: Bell,
  },
  {
    value: 'Compassionate Leave',
    title: 'Compassionate Leave',
    description: 'Leave related to bereavement or critical family events.',
    icon: User,
  },
  {
    value: 'Maternity Leave',
    title: 'Maternity Leave',
    description: '',
    icon: Heart,
  },
  {
    value: 'Paternity Leave',
    title: 'Paternity Leave',
    description: '',
    icon: Users,
  },
  {
    value: 'Unpaid Leave',
    title: 'Unpaid Leave',
    description: 'Extended leave that is outside paid entitlement.',
    icon: WalletCards,
  },
  {
    value: 'Other Leave',
    title: 'Other Leave',
    description: 'Non-statutory leave that requires clear written justification.',
    icon: FileText,
  },
]

export const getLeaveTypeOption = (value) =>
  LEAVE_TYPE_OPTIONS.find((option) => option.value === value) || LEAVE_TYPE_OPTIONS[0]

const LeaveTypeSelection = ({ selectedType, onSelect, onContinue }) => {
  return (
    <WorkflowChoiceStage
      title="Choose leave type"
      testId="leave-type-selection"
      options={LEAVE_TYPE_OPTIONS}
      value={selectedType}
      onChange={onSelect}
      onContinue={onContinue}
      continueTestId="leave-type-continue"
      continueDisabled={!selectedType}
      showDescription
      columns={{ xs: 6, md: 6, lg: 4 }}
      rowClassName="g-2 g-md-3"
      ariaLabel="Choose Leave Type"
      testIdPrefix="leave-type"
    />
  )
}

export default LeaveTypeSelection
