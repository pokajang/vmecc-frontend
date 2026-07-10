import React from 'react'
import { CheckCircle2, Clock3, FilePenLine } from 'lucide-react'

const STATE_META = {
  draft: { label: 'Draft', icon: FilePenLine, tone: 'draft' },
  published: { label: 'Published', icon: CheckCircle2, tone: 'success' },
  queued: { label: 'Queued', icon: Clock3, tone: 'muted' },
}

const RecordStateBadge = ({ state = 'draft', label, className = '' }) => {
  const meta = STATE_META[String(state || '').toLowerCase()] || STATE_META.queued
  const Icon = meta.icon

  return (
    <span className={`record-state-badge record-state-badge--${meta.tone} ${className}`.trim()}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      <span>{label || meta.label}</span>
    </span>
  )
}

export default RecordStateBadge
