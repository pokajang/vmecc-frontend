import React from 'react'
import { CButton } from '@coreui/react'
import { Bell, CalendarDays, Clock, FileText, Heart, User, Users, WalletCards } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'

export const LEAVE_TYPE_OPTIONS = [
  {
    value: 'Annual Leave',
    title: 'Annual Leave',
    description: 'Planned leave for rest, personal matters, or vacation.',
    icon: CalendarDays,
  },
  {
    value: 'Medical Leave',
    title: 'Medical Leave',
    description: 'Leave for illness, treatment, or medically advised recovery.',
    icon: Clock,
  },
  {
    value: 'Emergency Leave',
    title: 'Emergency Leave',
    description: 'Urgent leave needed for sudden personal or family situations.',
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
    description: 'Leave related to childbirth and postnatal recovery.',
    icon: Heart,
  },
  {
    value: 'Paternity Leave',
    title: 'Paternity Leave',
    description: 'Leave for eligible fathers around childbirth.',
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

const LeaveTypeSelection = ({ selectedType, onSelect, onContinue, onBack = () => {} }) => {
  return (
    <div className="d-grid gap-4">
      <div className="fw-semibold">Choose Leave Type</div>
      <IconOptionGrid
        options={LEAVE_TYPE_OPTIONS}
        value={selectedType}
        onChange={(nextType) => onSelect(nextType)}
        variant="compact"
        columns={{ xs: 6, md: 6, lg: 4 }}
        rowClassName="g-2 g-md-3"
        ariaLabel="Choose Leave Type"
        testIdPrefix="leave-type"
      />

      <div className="action-row-thumb">
        <CButton color="light" onClick={onBack}>
          Back
        </CButton>
        <CButton color="primary" disabled={!selectedType} onClick={() => onContinue(selectedType)}>
          Continue
        </CButton>
      </div>
      <div className="action-row-thumb-spacer d-lg-none" />
    </div>
  )
}

export default LeaveTypeSelection
