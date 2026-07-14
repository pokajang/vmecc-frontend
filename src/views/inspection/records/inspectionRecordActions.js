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
  const canReview = Boolean(canReviewRecord?.(row))
  const canApprove = Boolean(canApproveRecord?.(row))
  const canReject = Boolean(canRejectRecord?.(row))
  const canDelete = Boolean(canDeleteRecord?.(row))

  return [
    row.recordKind === 'draft'
      ? {
          key: 'edit',
          label: 'Open Draft',
          onClick: () => onEditRecord(row),
          disabled: !canEdit,
          disabledReason: disabledReason(canEdit, 'This draft cannot be opened.'),
        }
      : {
          key: 'review',
          label: 'Review',
          onClick: () => onReviewTransition?.(row),
          disabled: !canReview,
          disabledReason: disabledReason(canReview, 'Review is not available for this status.'),
        },
    ...(row.recordKind === 'draft'
      ? []
      : [
          {
            key: 'approve',
            label: 'Approve',
            disabled: !canApprove,
            disabledReason: disabledReason(canApprove, 'Approve is not available for this status.'),
            onClick: () => onApproveTransition?.(row),
          },
          {
            key: 'reject',
            label: 'Reject',
            className: 'text-danger',
            disabled: !canReject,
            disabledReason: disabledReason(canReject, 'Reject is not available for this status.'),
            onClick: () => onRejectTransition?.(row),
          },
          {
            key: 'edit',
            label: 'Edit',
            disabled: !canEdit,
            disabledReason: disabledReason(canEdit, 'Edit is not available for this status.'),
            onClick: () => onEditRecord(row),
          },
          {
            key: 'download',
            label: downloadingId === row.id ? 'Generating...' : 'Download',
            disabled: Boolean(downloadingId) || row.canDownloadPdf !== true,
            disabledReason: downloadingId
              ? 'Another report PDF is being generated.'
              : disabledReason(
                  row.canDownloadPdf === true,
                  'PDF download is not available for this report.',
                ),
            onClick: () => onDownloadRecord?.(row.id),
          },
        ]),
    {
      key: 'delete',
      label: 'Delete',
      className: 'text-danger',
      disabled: !canDelete,
      disabledReason: disabledReason(canDelete, 'Delete is not available for this status.'),
      onClick: () => onDeleteRecord(row),
    },
  ]
}
