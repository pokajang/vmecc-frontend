const normalizeType = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (raw === 'other') return 'other'
  if (raw === 'exceptional') return 'other'
  if (raw === 'salary') return 'salary'
  return 'expense'
}

const toClaimTypeLabel = (type) => {
  const normalized = normalizeType(type)
  if (normalized === 'salary') return 'Salary'
  if (normalized === 'other') return 'Exceptional'
  return 'Expense'
}

const resolveOwnerLabel = (row = {}) =>
  String(
    row.owner_label ||
      row.ownerLabel ||
      row.employee_name ||
      row.employeeName ||
      row.owner_name ||
      row.ownerName ||
      row.submitted_by_name ||
      row.submittedByName ||
      '',
  ).trim()

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key)
const hasAnyOwn = (obj, keys = []) => keys.some((key) => hasOwn(obj, key))
const readRowValue = (row = {}, keys = []) => {
  for (const key of keys) {
    if (hasOwn(row, key)) return row[key]
  }
  return undefined
}

const toNumberOrNull = (value) => {
  if (value === null || typeof value === 'undefined') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toBlockedReason = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return ''
}

const toActionCapability = (value, fallbackEnabled = true, fallbackBlockedReason = '') => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const enabled =
      value.enabled === undefined || value.enabled === null
        ? fallbackEnabled
        : value.enabled === true
    const blockedReason = enabled ? '' : toBlockedReason(value.blockedReason, value.reason)
    return { enabled, blockedReason: blockedReason || fallbackBlockedReason }
  }
  if (typeof value === 'boolean') {
    return {
      enabled: value,
      blockedReason: value ? '' : fallbackBlockedReason,
    }
  }
  return {
    enabled: fallbackEnabled,
    blockedReason: fallbackEnabled ? '' : fallbackBlockedReason,
  }
}

const resolveRowActionPermissions = (row = {}) => {
  const source =
    row.action_permissions && typeof row.action_permissions === 'object'
      ? row.action_permissions
      : row.actionPermissions && typeof row.actionPermissions === 'object'
        ? row.actionPermissions
        : row.actions && typeof row.actions === 'object'
          ? row.actions
          : {}

  const editFallbackReason = toBlockedReason(row.edit_blocked_reason, row.editBlockedReason)
  const cancelFallbackReason = toBlockedReason(row.cancel_blocked_reason, row.cancelBlockedReason)
  const deleteFallbackReason = toBlockedReason(row.delete_blocked_reason, row.deleteBlockedReason)
  const downloadFallbackReason = toBlockedReason(
    row.attachment_blocked_reason,
    row.attachmentBlockedReason,
    row.download_blocked_reason,
    row.downloadBlockedReason,
  )
  const markPaidFallbackReason = toBlockedReason(
    row.mark_paid_blocked_reason,
    row.markPaidBlockedReason,
    row.pay_blocked_reason,
    row.payBlockedReason,
  )
  const unmarkPaidFallbackReason = toBlockedReason(
    row.unmark_paid_blocked_reason,
    row.unmarkPaidBlockedReason,
    row.unpay_blocked_reason,
    row.unpayBlockedReason,
  )

  return {
    edit: toActionCapability(source.edit, true, editFallbackReason),
    cancel: toActionCapability(source.cancel, true, cancelFallbackReason),
    delete: toActionCapability(source.delete, true, deleteFallbackReason),
    downloadAttachment: toActionCapability(
      source.downloadAttachment || source.download_attachment || source.download,
      true,
      downloadFallbackReason,
    ),
    markPaid: toActionCapability(source.markPaid || source.mark_paid, true, markPaidFallbackReason),
    unmarkPaid: toActionCapability(
      source.unmarkPaid || source.unmark_paid,
      true,
      unmarkPaidFallbackReason,
    ),
  }
}

export const buildIdempotencyKey = (prefix, parts = []) => {
  const normalizedParts = (Array.isArray(parts) ? parts : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  const suffix =
    normalizedParts.join(':') ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  return `${prefix}:${suffix}`
}

const toSalaryContractStatus = (row = {}) => {
  const required = [
    {
      key: 'payrollSnapshot',
      keys: ['payroll_snapshot', 'payrollSnapshot'],
      validate: (value) => value && typeof value === 'object' && !Array.isArray(value),
    },
    {
      key: 'payrollBaselineConfirmed',
      keys: ['payroll_baseline_confirmed', 'payrollBaselineConfirmed'],
      validate: (value) => typeof value === 'boolean',
    },
    {
      key: 'adjustmentsTotal',
      keys: ['adjustments_total', 'adjustmentsTotal'],
      validate: (value) => toNumberOrNull(value) !== null,
    },
    {
      key: 'approvedOvertimePayout',
      keys: ['approved_overtime_payout', 'approvedOvertimePayout'],
      validate: (value) => toNumberOrNull(value) !== null,
    },
    {
      key: 'projectedNetPayout',
      keys: ['projected_net_payout', 'projectedNetPayout'],
      validate: (value) => toNumberOrNull(value) !== null,
    },
    {
      key: 'overtimeRows',
      keys: ['overtime_rows', 'overtimeRows'],
      validate: (value) => Array.isArray(value),
    },
    {
      key: 'overtimeRateSnapshot',
      keys: ['overtime_rate_snapshot', 'overtimeRateSnapshot'],
      validate: (value) => value && typeof value === 'object' && !Array.isArray(value),
    },
  ]
  const missingFields = required
    .filter((entry) => {
      if (!hasAnyOwn(row, entry.keys)) return true
      return !entry.validate(readRowValue(row, entry.keys))
    })
    .map((entry) => entry.key)
  return {
    salaryContractIncomplete: missingFields.length > 0,
    salaryContractMissingFields: missingFields,
  }
}

export const toUiClaimRow = (row = {}) => {
  const type = normalizeType(row.claim_type || row.type)
  const actionPermissions = resolveRowActionPermissions(row)
  const salaryContractStatus =
    type === 'salary'
      ? toSalaryContractStatus(row)
      : { salaryContractIncomplete: false, salaryContractMissingFields: [] }
  const rawAdjustmentsTotal =
    row.adjustments_total !== undefined ? row.adjustments_total : row.adjustmentsTotal
  const rawProjectedNetPayout =
    row.projected_net_payout !== undefined ? row.projected_net_payout : row.projectedNetPayout
  const rawCategory = String(row.category || '').trim()
  const typeLabel = toClaimTypeLabel(type)
  const categoryDetail =
    rawCategory && rawCategory.toLowerCase() !== typeLabel.toLowerCase() ? rawCategory : ''
  return {
    id: String(row.display_id || row.id || '').trim(),
    serverId: row?.id ?? null,
    ownerId: String(row.owner_id || row.user_id || row.ownerUserId || '').trim(),
    ownerLabel: resolveOwnerLabel(row),
    type,
    category: typeLabel,
    categoryDetail,
    period: String(row.period || '').trim(),
    periodValue: String(row.period_value || row.periodValue || '').trim(),
    amount: Number(row.amount || 0) || 0,
    status: String(row.status || 'Pending').trim() || 'Pending',
    submittedAt: String(row.submitted_at || row.submittedAt || '').trim(),
    submittedBy: String(row.submitted_by || row.submittedBy || '').trim(),
    submittedByName: String(row.submitted_by_name || row.submittedByName || '').trim(),
    updatedAt: String(row.updated_at || row.updatedAt || '').trim(),
    updatedBy: String(row.updated_by || row.updatedBy || '').trim(),
    updatedByName: String(row.updated_by_name || row.updatedByName || '').trim(),
    workflowStage: String(row.workflow_stage || row.workflowStage || '').trim(),
    workflowSnapshot: row.workflow_snapshot || row.workflowSnapshot || null,
    nextActionRole: row.next_action_role || row.nextActionRole || null,
    paymentDate: String(row.payment_date || row.paymentDate || '').trim(),
    paymentReference: String(row.payment_reference || row.paymentReference || '').trim(),
    paymentNote: String(row.payment_note || row.paymentNote || '').trim(),
    paidAt: String(row.paid_at || row.paidAt || '').trim(),
    paidBy: String(row.paid_by || row.paidBy || row.paid_by_name || row.paidByName || '').trim(),
    paidByUserId: String(row.paid_by_user_id || row.paidByUserId || '').trim(),
    approvalHistory: Array.isArray(row.approval_history)
      ? row.approval_history
      : Array.isArray(row.approvalHistory)
        ? row.approvalHistory
        : [],
    payrollSnapshot: row.payroll_snapshot || row.payrollSnapshot || null,
    adjustmentsTotal:
      type === 'salary'
        ? toNumberOrNull(rawAdjustmentsTotal)
        : rawAdjustmentsTotal != null
          ? Number(rawAdjustmentsTotal) || 0
          : null,
    payrollBaselineConfirmed:
      type === 'salary'
        ? Boolean(row.payroll_baseline_confirmed ?? row.payrollBaselineConfirmed)
        : null,
    approvedOvertimePayout:
      type === 'salary'
        ? toNumberOrNull(
            row.approved_overtime_payout !== undefined
              ? row.approved_overtime_payout
              : row.approvedOvertimePayout,
          )
        : Number(row.approved_overtime_payout || row.approvedOvertimePayout || 0) || 0,
    projectedNetPayout:
      type === 'salary'
        ? toNumberOrNull(rawProjectedNetPayout)
        : rawProjectedNetPayout != null
          ? Number(rawProjectedNetPayout) || 0
          : null,
    overtimeRows: Array.isArray(row.overtime_rows)
      ? row.overtime_rows
      : Array.isArray(row.overtimeRows)
        ? row.overtimeRows
        : [],
    overtimeRateSnapshot: row.overtime_rate_snapshot || row.overtimeRateSnapshot || null,
    notes: String(row.notes || '').trim(),
    attachmentId: Number(row.attachment_id || row.attachmentId || row.attachment?.id || 0) || null,
    attachmentName: String(
      row.attachment_name || row.attachmentName || row.attachment?.original_name || '',
    ).trim(),
    attachmentMimeType: String(
      row.attachment_mime_type || row.attachmentMimeType || row.attachment?.mime_type || '',
    ).trim(),
    attachmentSizeBytes:
      Number(row.attachment_size_bytes || row.attachmentSizeBytes || row.attachment?.size || 0) ||
      0,
    attachmentOwnedByViewer:
      row.attachment_owned_by_viewer === undefined || row.attachment_owned_by_viewer === null
        ? true
        : Boolean(row.attachment_owned_by_viewer),
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          ...item,
          claimDate: item?.claimDate || item?.claim_date || '',
          claimType:
            item?.claimType || item?.itemType || item?.item_type || item?.itemMeta?.claimType || '',
          category: item?.category || item?.itemType || item?.item_type || '',
          lineNotes: item?.lineNotes || item?.notes || '',
          approvalNote: item?.approvalNote || item?.approval_note || '',
          fromLocation: item?.fromLocation || item?.from_location || '',
          toLocation: item?.toLocation || item?.to_location || '',
          distanceKm:
            item?.distanceKm === null || typeof item?.distanceKm === 'undefined'
              ? (item?.distance_km ?? '')
              : item?.distanceKm,
          ratePerKm:
            item?.ratePerKm === null || typeof item?.ratePerKm === 'undefined'
              ? (item?.rate_per_km ?? '')
              : item?.ratePerKm,
          destination: item?.destination || '',
          tripDateFrom: item?.tripDateFrom || item?.trip_date_from || '',
          tripDateTo: item?.tripDateTo || item?.trip_date_to || '',
          billedPeriod: item?.billedPeriod || item?.billed_period || '',
          claimant: item?.claimant || '',
          attachmentId:
            Number(item?.attachmentId || item?.attachment_id || item?.attachment?.id || 0) || null,
          attachmentName: String(
            item?.attachmentName ||
              item?.itemMeta?.attachmentName ||
              item?.attachment?.original_name ||
              '',
          ).trim(),
          attachmentMimeType: String(
            item?.attachmentMimeType ||
              item?.attachment_mime_type ||
              item?.attachment?.mime_type ||
              '',
          ).trim(),
          attachmentSizeBytes:
            Number(
              item?.attachmentSizeBytes ||
                item?.attachment_size_bytes ||
                item?.attachment?.size ||
                0,
            ) || 0,
          amount: Number(item?.amount || 0) || 0,
        }))
      : [],
    consumedDraftId: String(row.consumed_draft_id || row.consumedDraftId || '').trim(),
    consumedDraftType: String(row.consumed_draft_type || row.consumedDraftType || '').trim(),
    submissionKey: String(row.submission_key || row.submissionKey || '').trim(),
    idempotentReplay: row.idempotent_replay === true || row.idempotentReplay === true || false,
    actionPermissions,
    editBlockedReason: actionPermissions.edit.blockedReason,
    cancelBlockedReason: actionPermissions.cancel.blockedReason,
    deleteBlockedReason: actionPermissions.delete.blockedReason,
    downloadAttachmentBlockedReason: actionPermissions.downloadAttachment.blockedReason,
    markPaidBlockedReason: actionPermissions.markPaid.blockedReason,
    unmarkPaidBlockedReason: actionPermissions.unmarkPaid.blockedReason,
    salaryContractIncomplete: salaryContractStatus.salaryContractIncomplete,
    salaryContractMissingFields: salaryContractStatus.salaryContractMissingFields,
  }
}

const MAX_NOTES_LENGTH = 4000
const MAX_LABEL_LENGTH = 255
const MAX_MIME_LENGTH = 127
const MAX_DATE_LENGTH = 32
const MAX_NUMERIC_FIELD_LENGTH = 32
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024

const sanitizeText = (value, maxLength = MAX_NOTES_LENGTH) =>
  String(value || '')
    .trim()
    .slice(0, maxLength)

const sanitizeNumeric = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const sanitizeAttachmentId = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed <= 0) return null
  return Math.trunc(parsed)
}

const sanitizeAttachmentSize = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(Math.trunc(parsed), MAX_ATTACHMENT_SIZE_BYTES)
}

export const toApiPayload = (row = {}) => {
  const claimType = row.type === 'other' ? 'exceptional' : row.type || 'expense'
  const payload = {
    claim_type: claimType,
    category: sanitizeText(row.category, MAX_LABEL_LENGTH),
    period: sanitizeText(row.period, MAX_LABEL_LENGTH),
    period_value: sanitizeText(row.periodValue, MAX_DATE_LENGTH),
    amount: sanitizeNumeric(row.amount, 0),
    source_draft_id:
      sanitizeText(row.sourceDraftId || row.source_draft_id, MAX_LABEL_LENGTH) || null,
    source_draft_type:
      sanitizeText(row.sourceDraftType || row.source_draft_type, MAX_LABEL_LENGTH).toLowerCase() ||
      null,
    submission_key: sanitizeText(row.submissionKey || row.submission_key, MAX_LABEL_LENGTH) || null,
    notes: sanitizeText(row.notes, MAX_NOTES_LENGTH),
    attachment_available: Boolean(row.attachmentAvailable),
    attachment_name: sanitizeText(row.attachmentName, MAX_LABEL_LENGTH),
    attachment_mime_type: sanitizeText(row.attachmentMimeType, MAX_MIME_LENGTH),
    attachment_size_bytes: sanitizeAttachmentSize(row.attachmentSizeBytes),
    attachment_id: sanitizeAttachmentId(row.attachmentId),
    payroll_snapshot: row.payrollSnapshot || null,
    items: Array.isArray(row.items)
      ? row.items.map((item) => ({
          item_type: sanitizeText(
            item?.claimType || item?.itemType || item?.category,
            MAX_LABEL_LENGTH,
          ),
          title: sanitizeText(item?.title || item?.category, MAX_LABEL_LENGTH),
          claim_date: sanitizeText(
            item?.claimDate || item?.claim_date || item?.expenseDate,
            MAX_DATE_LENGTH,
          ),
          amount: sanitizeNumeric(item?.amount, 0),
          notes: sanitizeText(item?.lineNotes || item?.notes, MAX_NOTES_LENGTH),
          approval_note: sanitizeText(item?.approvalNote || item?.approval_note, MAX_LABEL_LENGTH),
          from_location: sanitizeText(item?.fromLocation || item?.from_location, MAX_LABEL_LENGTH),
          to_location: sanitizeText(item?.toLocation || item?.to_location, MAX_LABEL_LENGTH),
          distance_km:
            item?.distanceKm === null || typeof item?.distanceKm === 'undefined'
              ? ''
              : sanitizeText(String(item.distanceKm), MAX_NUMERIC_FIELD_LENGTH),
          rate_per_km:
            item?.ratePerKm === null || typeof item?.ratePerKm === 'undefined'
              ? ''
              : sanitizeText(String(item.ratePerKm), MAX_NUMERIC_FIELD_LENGTH),
          destination: sanitizeText(item?.destination, MAX_LABEL_LENGTH),
          trip_date_from: sanitizeText(item?.tripDateFrom || item?.trip_date_from, MAX_DATE_LENGTH),
          trip_date_to: sanitizeText(item?.tripDateTo || item?.trip_date_to, MAX_DATE_LENGTH),
          billed_period: sanitizeText(item?.billedPeriod || item?.billed_period, MAX_LABEL_LENGTH),
          claimant: sanitizeText(item?.claimant, MAX_LABEL_LENGTH),
          attachment_id: sanitizeAttachmentId(item?.attachmentId || item?.attachment_id),
          attachment_name: sanitizeText(item?.attachmentName, MAX_LABEL_LENGTH),
          attachment_mime_type: sanitizeText(item?.attachmentMimeType, MAX_MIME_LENGTH),
          attachment_size_bytes: sanitizeAttachmentSize(item?.attachmentSizeBytes),
        }))
      : [],
  }

  if (claimType === 'salary') {
    payload.payroll_baseline_confirmed = Boolean(row.payrollBaselineConfirmed)
    payload.adjustments_total = sanitizeNumeric(row.adjustmentsTotal, 0)
    payload.approved_overtime_payout = sanitizeNumeric(row.approvedOvertimePayout, 0)
    payload.projected_net_payout = sanitizeNumeric(row.projectedNetPayout, 0)
    payload.overtime_rows = Array.isArray(row.overtimeRows) ? row.overtimeRows : []
    payload.overtime_rate_snapshot =
      row.overtimeRateSnapshot && typeof row.overtimeRateSnapshot === 'object'
        ? row.overtimeRateSnapshot
        : null
  }

  return payload
}
