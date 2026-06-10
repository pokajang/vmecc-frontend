import { buildClaimPeriodOptions } from '../claimPeriodOptions'
import { formatDate, parseAmount } from './claimFormUtils'

export const CLAIM_PERIOD_OPTIONS = buildClaimPeriodOptions(2)

export const CLAIM_CATEGORY_OPTIONS = [
  'Fuel',
  'Mileage',
  'Toll',
  'Parking',
  'Travel',
  'Hotel',
  'Meals',
  'Stationery',
  'Pantry Supplies',
  'Cutlery & Kitchenware',
  'Office Supplies',
  'Mobile',
  'Internet',
  'Medical',
  'Other',
]

export const EXCEPTIONAL_REASON_OPTIONS = [
  'Policy Exception',
  'Special Disbursement',
  'Emergency Support',
  'Legacy / Manual Correction',
  'Other Exceptional Case',
]

export const SALARY_ROUTE_KEYWORDS = [
  'incentive',
  'bonus',
  'allowance',
  'salary',
  'arrears',
  'commission',
  'overtime',
]

export const EXPENSE_ROUTE_KEYWORDS = [
  'fuel',
  'mileage',
  'toll',
  'parking',
  'travel',
  'hotel',
  'meal',
  'mobile',
  'internet',
  'stationery',
  'pantry',
  'cutlery',
  'office supplies',
]

export const CATEGORY_GUIDANCE = {
  default: {
    helperText:
      'Provide a clear business purpose and ensure the amount matches the supporting document.',
    attachmentHint: 'Attach receipt or validated e-Invoice.',
    notesPlaceholder: 'Optional notes for this line item',
  },
  Fuel: {
    helperText:
      'Fuel claims should include business travel context such as destination or purpose.',
    attachmentHint: 'Attach fuel receipt or validated e-Invoice.',
    notesPlaceholder: 'Example: Refuel for client visit travel',
  },
  Mileage: {
    helperText:
      'Mileage claims require From, To, Distance (KM), and Rate/KM. Amount is auto-calculated.',
    attachmentHint: 'Attach mileage log, map route, or approved travel record.',
    notesPlaceholder: 'Example: Site visit from HQ to branch office',
  },
  Toll: {
    helperText: 'Toll claims should reflect actual route usage for business travel.',
    attachmentHint: 'Attach toll statement or transaction receipt.',
    notesPlaceholder: 'Example: Highway toll for customer meeting trip',
  },
  Parking: {
    helperText: 'Parking claims should be tied to business location and visit purpose.',
    attachmentHint: 'Attach parking receipt or payment proof.',
    notesPlaceholder: 'Example: Parking at client office',
  },
  Travel: {
    helperText: 'Travel claims require destination and full trip dates.',
    attachmentHint: 'Attach itinerary, booking receipt, and related travel proof.',
    notesPlaceholder: 'Example: Sales trip to Penang for account review',
  },
  Hotel: {
    helperText: 'Hotel claims require destination and stay dates.',
    attachmentHint: 'Attach hotel invoice and booking confirmation.',
    notesPlaceholder: 'Example: Overnight stay for training event',
  },
  Meals: {
    helperText: 'Meals claims should include business purpose and attendees when relevant.',
    attachmentHint: 'Attach meal receipt or validated e-Invoice.',
    notesPlaceholder: 'Example: Team lunch during client workshop',
  },
  Stationery: {
    helperText: 'Stationery claims should reference team or office usage.',
    attachmentHint: 'Attach purchase receipt with item details.',
    notesPlaceholder: 'Example: Notebooks and pens for operations team',
  },
  'Pantry Supplies': {
    helperText: 'Pantry supply claims should describe office or event usage.',
    attachmentHint: 'Attach grocery or supply receipt.',
    notesPlaceholder: 'Example: Pantry restock for office common area',
  },
  'Cutlery & Kitchenware': {
    helperText: 'Cutlery and kitchenware claims should mention where items are used.',
    attachmentHint: 'Attach purchase receipt with item list.',
    notesPlaceholder: 'Example: Pantry cutlery replacement for HQ office',
  },
  'Office Supplies': {
    helperText: 'Office supply claims should indicate department or function served.',
    attachmentHint: 'Attach receipt or invoice with supplied items.',
    notesPlaceholder: 'Example: Printer paper and toner for admin team',
  },
  Mobile: {
    helperText: 'Mobile claims require billing period details.',
    attachmentHint: 'Attach telco bill or validated e-Invoice.',
    notesPlaceholder: 'Example: Corporate mobile line for Apr 2026',
  },
  Internet: {
    helperText: 'Internet claims require billing period details.',
    attachmentHint: 'Attach ISP bill or validated e-Invoice.',
    notesPlaceholder: 'Example: Branch internet subscription for Apr 2026',
  },
  Medical: {
    helperText: 'Medical claims should specify claimant and treatment purpose.',
    attachmentHint: 'Attach medical receipt and supporting documentation.',
    notesPlaceholder: 'Example: Outpatient treatment reimbursement',
  },
  Other: {
    helperText: 'Use Other only when no existing category fits. Explain business purpose clearly.',
    attachmentHint: 'Attach complete supporting documents for approval.',
    notesPlaceholder: 'Describe what was purchased and why it is claimable',
  },
}

export const EXCEPTIONAL_CATEGORY_GUIDANCE = {
  default: {
    helperText:
      'Exceptional claims are for policy exceptions only. Do not use this for salary payments or normal operating expenses.',
    attachmentHint: 'Attach full supporting documents and explicit approval evidence.',
    notesPlaceholder: 'Explain why this cannot be submitted under Salary or Expense claim.',
  },
  'Policy Exception': {
    helperText: 'Use when a valid policy exception was approved for this payout/reimbursement.',
    attachmentHint: 'Attach approved policy exception memo and supporting references.',
    notesPlaceholder: 'State policy clause and approving authority for this exception.',
  },
  'Special Disbursement': {
    helperText: 'Use for one-off special disbursements approved outside standard claim categories.',
    attachmentHint: 'Attach approval memo, payment instruction, and supporting documents.',
    notesPlaceholder: 'Explain why this special disbursement is required and who approved it.',
  },
  'Emergency Support': {
    helperText: 'Use for urgent exceptional support approved due to emergency circumstances.',
    attachmentHint: 'Attach emergency approval and all related supporting records.',
    notesPlaceholder: 'Describe the emergency context and business justification.',
  },
  'Legacy / Manual Correction': {
    helperText: 'Use for legacy carry-forward or manual correction cases approved by finance/HR.',
    attachmentHint: 'Attach correction worksheet and approval trail.',
    notesPlaceholder: 'Describe the source issue and correction rationale.',
  },
  'Other Exceptional Case': {
    helperText: 'Use only when no other exceptional reason applies and approval is available.',
    attachmentHint: 'Attach full evidence pack and approval notes.',
    notesPlaceholder: 'Provide complete justification for this exceptional case.',
  },
}

export const DEFAULT_HEADER = {
  period: '',
}

export const getDefaultCategory = (type) =>
  type === 'other' ? EXCEPTIONAL_REASON_OPTIONS[0] : CLAIM_CATEGORY_OPTIONS[0]

export const createClaimItem = (type = 'expense') => ({
  expenseDate: '',
  category: getDefaultCategory(type),
  amount: '',
  attachmentId: null,
  attachmentName: '',
  attachmentError: '',
  attachmentUploadState: 'idle',
  needsReattach: false,
  attachmentMigrationAttempted: false,
  legacyAttachmentDataUrl: '',
  lineNotes: '',
  approvalNote: '',
  fromLocation: '',
  toLocation: '',
  distanceKm: '',
  ratePerKm: '0.85',
  destination: '',
  tripDateFrom: '',
  tripDateTo: '',
  billedPeriod: '',
  claimant: 'Self',
  attachmentMimeType: '',
  attachmentSizeBytes: 0,
})

export const requiresMileageFields = (category) => category === 'Mileage'
export const requiresTravelFields = (category) => category === 'Travel' || category === 'Hotel'
export const requiresBillingPeriod = (category) => category === 'Mobile' || category === 'Internet'
export const requiresMedicalFields = (category) => category === 'Medical'

export const containsKeyword = (text, keywords) => {
  const source = (text || '').toLowerCase()
  return keywords.some((keyword) => source.includes(keyword))
}

export const normalizeItem = (item) => {
  const source = item && typeof item === 'object' ? item : {}
  const sourceAttachmentId =
    Number(source.attachmentId || source.attachment_id || source?.attachment?.id || 0) || null
  const legacyAttachmentDataUrl = String(
    source.attachmentDataUrl || source.legacyAttachmentDataUrl || '',
  ).trim()
  const sourceAttachmentName = String(
    source.attachmentName || source?.attachment?.original_name || '',
  ).trim()
  const hasAttachmentId = Number(sourceAttachmentId || 0) > 0
  const hasLegacyBinary = legacyAttachmentDataUrl.length > 0
  const hasNameOnlyAttachment =
    !hasAttachmentId && sourceAttachmentName.length > 0 && !hasLegacyBinary
  const attachmentUploadState = String(source.attachmentUploadState || '').trim()
  const normalizedUploadState = attachmentUploadState
    ? attachmentUploadState
    : hasAttachmentId
      ? 'uploaded'
      : hasLegacyBinary
        ? 'pending_migration'
        : hasNameOnlyAttachment
          ? 'failed'
          : 'idle'
  const needsReattach =
    source.needsReattach === true ||
    hasNameOnlyAttachment ||
    (normalizedUploadState === 'failed' && !hasAttachmentId)
  const migrationAttempted = source.attachmentMigrationAttempted === true
  const base = {
    ...createClaimItem(source.claimType || 'expense'),
    ...source,
    expenseDate: String(source.expenseDate || source.claim_date || '').trim(),
    category: String(source.category || source.itemType || source.item_type || '').trim(),
    amount: String(source.amount ?? '').trim(),
    attachmentId: sourceAttachmentId,
    attachmentName: sourceAttachmentName,
    attachmentError: String(source.attachmentError || '').trim(),
    attachmentUploadState: normalizedUploadState,
    needsReattach,
    attachmentMigrationAttempted: migrationAttempted,
    legacyAttachmentDataUrl,
    attachmentMimeType: String(
      source.attachmentMimeType || source?.attachment?.mime_type || '',
    ).trim(),
    attachmentSizeBytes: Number(source.attachmentSizeBytes || source?.attachment?.size || 0) || 0,
    lineNotes: String(source.lineNotes || source.notes || '').trim(),
    approvalNote: String(source.approvalNote || source.approval_note || '').trim(),
    fromLocation: String(source.fromLocation || source.from_location || '').trim(),
    toLocation: String(source.toLocation || source.to_location || '').trim(),
    distanceKm: String(source.distanceKm ?? source.distance_km ?? '').trim(),
    ratePerKm: String(source.ratePerKm ?? source.rate_per_km ?? '0.85').trim(),
    destination: String(source.destination || '').trim(),
    tripDateFrom: String(source.tripDateFrom || source.trip_date_from || '').trim(),
    tripDateTo: String(source.tripDateTo || source.trip_date_to || '').trim(),
    billedPeriod: String(source.billedPeriod || source.billed_period || '').trim(),
    claimant: String(source.claimant || 'Self').trim() || 'Self',
  }

  if (!requiresMileageFields(base.category)) {
    return base
  }
  const distance = parseAmount(base.distanceKm)
  const rate = parseAmount(base.ratePerKm)
  const amount = distance > 0 && rate > 0 ? (distance * rate).toFixed(2) : ''
  return {
    ...base,
    amount,
  }
}

export const getItemSummaryText = (item) => {
  if (item.lineNotes?.trim()) return item.lineNotes.trim()
  if (requiresMileageFields(item.category) && item.fromLocation && item.toLocation) {
    return `${item.fromLocation} to ${item.toLocation}`
  }
  if (requiresTravelFields(item.category) && item.destination) {
    return item.destination
  }
  if (requiresBillingPeriod(item.category) && item.billedPeriod) {
    return `Billing period: ${item.billedPeriod}`
  }
  if (requiresMedicalFields(item.category) && item.claimant) {
    return `Claimant: ${item.claimant}`
  }
  return item.expenseDate ? formatDate(item.expenseDate) : 'No notes'
}

export const hasDraftContent = (value = {}) => {
  if (!value || typeof value !== 'object') return false
  if (String(value?.period || '').trim()) return true
  if (Boolean(value?.periodConfirmed)) return true
  if (Array.isArray(value?.savedItems) && value.savedItems.length > 0) return true
  const draftItem = value?.draftItem && typeof value.draftItem === 'object' ? value.draftItem : null
  if (!draftItem) return false
  return Boolean(
    String(draftItem.expenseDate || '').trim() ||
      String(draftItem.category || '').trim() ||
      String(draftItem.amount || '').trim() ||
      String(draftItem.lineNotes || '').trim() ||
      String(draftItem.attachmentName || '').trim(),
  )
}

export const validateClaimSubmissionDraft = (draftItem, isExceptionalClaim) => {
  if (!draftItem.expenseDate) return 'Expense date is required.'
  if (!draftItem.category) return 'Category is required.'
  if (draftItem.attachmentUploadState === 'uploading') {
    return 'Attachment upload is in progress. Please wait before saving.'
  }
  if (draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach) {
    return 'Attachment upload failed. Reattach or remove the file before saving.'
  }
  if (isExceptionalClaim) {
    const exceptionalContext = `${draftItem.category} ${draftItem.lineNotes} ${draftItem.approvalNote}`
    if (containsKeyword(exceptionalContext, SALARY_ROUTE_KEYWORDS)) {
      return 'This appears to be salary-related. Use Salary Claim for incentives, allowances, or payroll adjustments.'
    }
    if (containsKeyword(exceptionalContext, EXPENSE_ROUTE_KEYWORDS)) {
      return 'This appears to be an operating expense. Use Expense Claim for normal business expenses.'
    }
    if (!draftItem.lineNotes?.trim() || draftItem.lineNotes.trim().length < 15) {
      return 'Detailed justification is required (minimum 15 characters) for exceptional claims.'
    }
    if (!draftItem.approvalNote?.trim()) {
      return 'Approval note is required for exceptional claims.'
    }
    if (!draftItem.attachmentId) return 'Attachment is required for exceptional claims.'
    if (parseAmount(draftItem.amount) <= 0) return 'Amount must be greater than zero.'
    return null
  }
  if (requiresMileageFields(draftItem.category)) {
    if (!draftItem.fromLocation?.trim()) return 'From location is required for mileage claims.'
    if (!draftItem.toLocation?.trim()) return 'To location is required for mileage claims.'
    if (parseAmount(draftItem.distanceKm) <= 0) return 'Distance (KM) must be greater than zero.'
    if (parseAmount(draftItem.ratePerKm) <= 0) return 'Rate per KM must be greater than zero.'
  }
  if (requiresTravelFields(draftItem.category)) {
    if (!draftItem.destination?.trim())
      return 'Destination is required for travel and hotel claims.'
    if (!draftItem.tripDateFrom) return 'Trip start date is required for travel and hotel claims.'
    if (!draftItem.tripDateTo) return 'Trip end date is required for travel and hotel claims.'
    if (draftItem.tripDateTo < draftItem.tripDateFrom) {
      return 'Trip end date cannot be earlier than trip start date.'
    }
  }
  if (requiresBillingPeriod(draftItem.category) && !draftItem.billedPeriod?.trim()) {
    return 'Billing period is required for mobile and internet claims.'
  }
  if (requiresMedicalFields(draftItem.category) && !draftItem.claimant) {
    return 'Claimant is required for medical claims.'
  }
  if (parseAmount(draftItem.amount) <= 0) return 'Amount must be greater than zero.'
  if (!draftItem.attachmentId) return 'Attachment is required.'
  return null
}
