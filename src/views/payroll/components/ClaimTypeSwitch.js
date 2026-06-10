import React from 'react'
import { BadgeDollarSign, ReceiptText } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'

const CLAIM_TYPE_OPTIONS = [
  {
    value: 'salary',
    title: 'Salary Claim',
    description:
      'Confirm assigned salary payout and add arrears, adjustments, or additional allowances.',
    icon: BadgeDollarSign,
  },
  {
    value: 'expense',
    title: 'Expense Claim',
    description: 'Claim business expenses like travel, fuel, meals, parking, and mobile bills.',
    icon: ReceiptText,
  },
]

const ClaimTypeSwitch = ({ activeType, onSelect }) => {
  return (
    <IconOptionGrid
      options={CLAIM_TYPE_OPTIONS}
      value={activeType}
      onChange={(nextType) => onSelect(nextType)}
      variant="standard"
      columns={{ xs: 12, md: 6, lg: 4 }}
      rowClassName="g-3"
      ariaLabel="Claim type"
      testIdPrefix="claim-switch"
    />
  )
}

export default ClaimTypeSwitch
