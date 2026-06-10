import React from 'react'

const statusConfig = (label) => {
  const n = (label || '').toLowerCase()
  if (n.includes('on duty'))   return { dot: '#22c55e', text: '#15803d' }
  if (n.includes('next'))      return { dot: '#38bdf8', text: '#0369a1' }
  if (n.includes('unscheduled')) return { dot: '#94a3b8', text: '#64748b' }
  return                               { dot: '#94a3b8', text: '#64748b' }
}

const StatusPill = ({ label }) => {
  const { dot, text } = statusConfig(label)
  return (
    <span
      className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill"
      style={{ background: `${dot}18`, fontSize: '0.7rem', fontWeight: 500, color: text }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }}
      />
      {label}
    </span>
  )
}

export default StatusPill
