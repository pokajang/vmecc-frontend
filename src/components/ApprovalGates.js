import React from 'react'
import { Check } from 'lucide-react'

const GATE_COLOR_DONE = '#2eb85c'
const GATE_COLOR_PENDING = '#d8dbe0'

const ApprovalGates = ({
  gates = [],
  approvalHistory = [],
  isCancelled = false,
  direction = 'vertical',
}) => {
  const actions = new Set(
    (Array.isArray(approvalHistory) ? approvalHistory : []).map((e) => e?.action),
  )
  const isRejected = actions.has('Rejected')
  const isInactive = isRejected || isCancelled
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      className={`d-flex ${isHorizontal ? 'flex-row flex-wrap' : 'flex-column'}`}
      style={{ gap: isHorizontal ? '12px' : '3px' }}
    >
      {gates.map((gate) => {
        const done = actions.has(gate.action)
        const color = done && !isInactive ? GATE_COLOR_DONE : GATE_COLOR_PENDING
        return (
          <div key={gate.action} className="d-flex align-items-center" style={{ gap: '4px' }}>
            <Check size={11} color={color} strokeWidth={3} />
            <span style={{ fontSize: '0.7rem', color, lineHeight: 1 }}>{gate.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ApprovalGates
