import { resolveRecordActions } from 'src/components/report-workflow/recordActionResolver'

export const REPORT_GATES = [
  { action: 'Submitted', label: 'Submitted' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const disabledReason = (isEnabled, reason) => (isEnabled ? undefined : reason)

export const getInspectionApprovalHistory = (row) => {
  const history = Array.isArray(row?.timeline) ? row.timeline : []
  const hasAction = (action) =>
    history.some((entry) => String(entry?.action || '').toLowerCase() === action.toLowerCase())
  const status = String(row?.status || '')
    .trim()
    .toLowerCase()
  const fallback = []
  if (!hasAction('Submitted')) fallback.push({ action: 'Submitted' })
  if (status === 'reviewed' || status === 'approved' || hasAction('Reviewed')) {
    if (!hasAction('Reviewed')) fallback.push({ action: 'Reviewed' })
  }
  if (status === 'approved' || hasAction('Approved')) {
    if (!hasAction('Approved')) fallback.push({ action: 'Approved' })
  }
  return [...history, ...fallback]
}

export const buildInspectionRowActionItems = (
  row,
  {
    onViewRecord,
    onEditRecord,
    onReviewTransition,
    onApproveTransition,
    onRejectTransition,
    onDownloadRecord,
    onDeleteRecord,
    onOpenQueueConflict,
    onSaveQueuedAsDraft,
    canEditRecord,
    canReviewRecord,
    canApproveRecord,
    canRejectRecord,
    canDeleteRecord,
    downloadingId,
  },
) => {
  if (row.recordKind === 'queued') {
    const isConflict = row.queueStatus === 'conflict'
    return [
      {
        key: 'retry',
        label: 'Retry now',
        disabled: isConflict,
        disabledReason: isConflict ? 'Resolve this conflict before retrying.' : undefined,
        onClick: () => onReviewTransition?.(row),
      },
      ...(isConflict
        ? [
            {
              key: 'conflict',
              label: 'Open conflict',
              disabled: false,
              onClick: () => onOpenQueueConflict?.(row),
            },
          ]
        : []),
      {
        key: 'draft',
        label: 'Save as draft',
        disabled: false,
        onClick: () => onSaveQueuedAsDraft?.(row),
      },
      {
        key: 'delete',
        label: 'Delete queued',
        className: 'text-danger',
        disabled: false,
        onClick: () => onDeleteRecord(row),
      },
    ]
  }

  const canEdit = Boolean(canEditRecord?.(row))
  const canDelete = Boolean(canDeleteRecord?.(row))

  if (row.recordKind === 'draft') {
    return [
      {
        key: 'edit',
        label: 'Open Draft',
        onClick: () => onEditRecord(row),
        disabled: !canEdit,
        disabledReason: disabledReason(canEdit, 'This draft cannot be opened.'),
      },
      {
        key: 'delete',
        label: 'Delete',
        className: 'text-danger',
        disabled: !canDelete,
        disabledReason: disabledReason(canDelete, 'This draft cannot be deleted.'),
        onClick: () => onDeleteRecord(row),
      },
    ]
  }

  return resolveRecordActions({
    record: row,
    downloadingId,
    handlers: {
      view: typeof onViewRecord === 'function' ? () => onViewRecord(row.id) : null,
      download: typeof onDownloadRecord === 'function' ? () => onDownloadRecord(row.id) : null,
      edit: typeof onEditRecord === 'function' ? () => onEditRecord(row) : null,
      review: typeof onReviewTransition === 'function' ? () => onReviewTransition(row) : null,
      approve: typeof onApproveTransition === 'function' ? () => onApproveTransition(row) : null,
      reject: typeof onRejectTransition === 'function' ? () => onRejectTransition(row) : null,
      delete: typeof onDeleteRecord === 'function' ? () => onDeleteRecord(row) : null,
    },
    fallbackCapabilities: {
      edit: canEditRecord,
      review: canReviewRecord,
      approve: canApproveRecord,
      reject: canRejectRecord,
      delete: canDeleteRecord,
    },
  })
}
