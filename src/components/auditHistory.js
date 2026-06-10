const toString = (value) => String(value || '').trim()

const firstValue = (...values) => values.map(toString).find(Boolean) || ''

export const normalizeHistoryEntry = (entry = {}, index = 0, defaults = {}) => {
  const action = firstValue(
    entry.action,
    entry.eventType,
    entry.event_type,
    entry.type,
    entry.label,
    entry.stageLabel,
    defaults.action,
    'Updated',
  )
  const occurredAt = firstValue(
    entry.occurredAt,
    entry.occurred_at,
    entry.at,
    entry.createdAt,
    entry.created_at,
    entry.updatedAt,
    entry.updated_at,
    defaults.occurredAt,
  )
  const actorName = firstValue(
    entry.actorName,
    entry.actor_name,
    entry.by,
    entry.byName,
    entry.actor?.name,
    defaults.actorName,
  )
  const targetLabel = firstValue(
    entry.targetLabel,
    entry.target_label,
    entry.employee,
    entry.assignmentId,
    entry.claimId,
    entry.id,
    defaults.targetLabel,
  )
  const details =
    entry.details && typeof entry.details === 'object'
      ? entry.details
      : entry.changes && typeof entry.changes === 'object'
        ? entry.changes
        : {}

  return {
    id: firstValue(entry.id, defaults.id) || `history-${index}`,
    occurredAt,
    actorName,
    targetLabel,
    action,
    details,
    summary: firstValue(entry.summary, defaults.summary),
    remarks: firstValue(entry.remarks, entry.note, entry.notes, defaults.remarks),
  }
}

export const normalizeHistoryEntries = (entries = [], defaults = {}) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry, index) => normalizeHistoryEntry(entry, index, defaults))
    .sort((a, b) => {
      const av = Date.parse(a.occurredAt)
      const bv = Date.parse(b.occurredAt)
      if (!Number.isFinite(av) && !Number.isFinite(bv)) return 0
      if (!Number.isFinite(av)) return 1
      if (!Number.isFinite(bv)) return -1
      return bv - av
    })

export const buildClaimHistoryEntries = (claim = {}) => {
  if (!claim || typeof claim !== 'object') return []
  const entries = []
  const submittedAt = firstValue(claim.submittedAt, claim.submitted_at)
  if (submittedAt) {
    entries.push({
      id: `${firstValue(claim.id, 'claim')}-submitted`,
      action: 'Submitted',
      occurredAt: submittedAt,
      actorName: firstValue(claim.submittedByName, claim.submittedBy, claim.ownerLabel),
      targetLabel: firstValue(claim.id),
    })
  }
  const approvalHistory = Array.isArray(claim.approvalHistory) ? claim.approvalHistory : []
  approvalHistory.forEach((entry, index) => {
    const action = firstValue(entry.action)
    const occurredAt = firstValue(entry.at, entry.updatedAt)
    if (
      action.toLowerCase() === 'submitted' &&
      occurredAt &&
      submittedAt &&
      occurredAt === submittedAt
    ) {
      return
    }
    entries.push({
      ...entry,
      id: firstValue(entry.id) || `${firstValue(claim.id, 'claim')}-history-${index}`,
      occurredAt,
      targetLabel: firstValue(claim.id),
    })
  })
  return normalizeHistoryEntries(entries)
}

export const buildWorkflowHistoryEntries = (
  record = {},
  approvalHistory = [],
  { targetLabel = '', submittedRemarks = '' } = {},
) => {
  if (!record || typeof record !== 'object') return []
  const resolvedTargetLabel = firstValue(
    targetLabel,
    record.targetLabel,
    record.displayId,
    record.display_id,
    record.recordKey,
    record.id,
  )
  const resolvedRecordId = firstValue(resolvedTargetLabel, record.id, record.recordKey, 'record')
  const submittedAt = firstValue(
    record.submittedAt,
    record.submitted_at,
    record.appliedAt,
    record.applied_at,
    record.createdAt,
    record.created_at,
  )
  const submittedBy = firstValue(
    record.submittedByName,
    record.submittedBy,
    record.submitted_by,
    record.employee,
    record.ownerLabel,
    'System user',
  )

  const entries = []
  if (submittedAt) {
    entries.push({
      id: `${resolvedRecordId}-submitted`,
      action: 'Submitted',
      occurredAt: submittedAt,
      actorName: submittedBy,
      targetLabel: resolvedTargetLabel,
      remarks: submittedRemarks,
    })
  }

  ;(Array.isArray(approvalHistory) ? approvalHistory : []).forEach((entry, index) => {
    const action = firstValue(entry.action, entry.eventType, entry.event_type, entry.type)
    const occurredAt = firstValue(
      entry.occurredAt,
      entry.occurred_at,
      entry.at,
      entry.createdAt,
      entry.created_at,
      entry.updatedAt,
      entry.updated_at,
    )
    if (
      action.toLowerCase() === 'submitted' &&
      occurredAt &&
      submittedAt &&
      occurredAt === submittedAt
    ) {
      return
    }

    entries.push({
      ...entry,
      id: firstValue(entry.id) || `${resolvedRecordId}-history-${index}`,
      action: action || 'Updated',
      occurredAt,
      actorName: firstValue(entry.actorName, entry.actor_name, entry.by, entry.byName),
      targetLabel: firstValue(
        entry.targetLabel,
        entry.target_label,
        entry.employee,
        resolvedTargetLabel,
      ),
      remarks: firstValue(entry.remarks, entry.note, entry.notes),
    })
  })

  return normalizeHistoryEntries(entries)
}
