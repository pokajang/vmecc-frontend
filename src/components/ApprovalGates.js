import React from 'react'
import { Check, Circle } from 'lucide-react'

const GATE_COLOR_DONE = 'var(--vmecc-status-success-text, #2eb85c)'
const GATE_COLOR_PENDING = 'var(--vmecc-status-muted-text, #d8dbe0)'

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
      role="list"
      aria-label="Approval progress"
    >
      {gates.map((gate) => {
        const done = actions.has(gate.action)
        const color = done && !isInactive ? GATE_COLOR_DONE : GATE_COLOR_PENDING
        const StatusIcon = done ? Check : Circle
        return (
          <div
            key={gate.action}
            className="d-flex align-items-center"
            style={{ gap: '4px' }}
            role="listitem"
            aria-label={`${gate.label}: ${done ? 'complete' : 'pending'}`}
          >
            <StatusIcon size={11} color={color} strokeWidth={done ? 3 : 2} aria-hidden="true" />
            <span className="vmecc-caption" style={{ color }} aria-hidden="true">
              {gate.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default ApprovalGates
