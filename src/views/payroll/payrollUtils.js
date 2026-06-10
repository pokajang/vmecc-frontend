import { CLAIM_STATUS_COLOR, TERMINAL_CLAIM_STATUSES } from './payrollConstants'

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value || 0)

export const parseAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const getClaimStatusColor = (status) => CLAIM_STATUS_COLOR[status] || 'secondary'
export const isTerminalClaimStatus = (status) =>
  TERMINAL_CLAIM_STATUSES.includes(String(status || '').trim())
export const canEditClaimRecord = (claim) =>
  Boolean(claim?.id) && !isTerminalClaimStatus(claim?.status)
export const canCancelClaimRecord = (claim) =>
  Boolean(claim?.id) && !claim?.isDraft && !isTerminalClaimStatus(claim?.status)
export const canDeleteClaimRecord = (claim) =>
  Boolean(claim?.id) &&
  (Boolean(claim?.isDraft) || String(claim?.status || '').trim() === 'Cancelled')

const MONTH_INDEX_BY_NAME = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

export const toIsoDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export const resolvePeriodValue = (claim) => {
  const existingValue = String(claim?.periodValue || '').trim()
  if (/^\d{4}-\d{2}$/.test(existingValue)) return existingValue

  const periodLabel = String(claim?.period || '').trim()
  if (!periodLabel) return ''
  const matched = /^([A-Za-z]+)\s+(\d{4})$/.exec(periodLabel)
  if (!matched) return ''
  const month = MONTH_INDEX_BY_NAME[matched[1].toLowerCase()]
  const year = Number.parseInt(matched[2], 10)
  if (!month || !Number.isFinite(year)) return ''
  return `${year}-${String(month).padStart(2, '0')}`
}

export const buildFallbackExpenseItem = (claim) => ({
  expenseDate: toIsoDateInput(claim?.submittedAt),
  category: claim?.category || (claim?.type === 'other' ? 'Policy Exception' : 'Other'),
  amount: String(parseAmount(claim?.amount || 0)),
  attachmentName: claim?.attachmentName || '',
  lineNotes: claim?.notes || '',
})

export const buildFallbackSalaryItem = (claim) => {
  const amount = parseAmount(claim?.amount)
  return {
    claimDate: toIsoDateInput(claim?.submittedAt),
    claimType: amount < 0 ? 'Deduction' : 'Addition',
    amount: String(Math.abs(amount)),
    attachmentName: claim?.attachmentName || '',
    lineNotes: claim?.notes || '',
  }
}

export const DRAFT_TYPE_ORDER = ['expense', 'salary', 'other']

const formatDraftPeriodLabel = (value) => {
  const period = String(value || '').trim()
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return period
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  if (Number.isNaN(date.getTime())) return period
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

const hasExpenseDraftContent = (draftItem = {}) =>
  Boolean(
    draftItem.expenseDate ||
      draftItem.amount ||
      draftItem.attachmentName ||
      draftItem.lineNotes ||
      draftItem.fromLocation ||
      draftItem.toLocation ||
      draftItem.distanceKm ||
      draftItem.destination ||
      draftItem.tripDateFrom ||
      draftItem.tripDateTo ||
      draftItem.billedPeriod ||
      draftItem.approvalNote,
  )

const hasSalaryDraftContent = (draft = {}, draftItem = {}) =>
  Boolean(
    draftItem.claimDate ||
      draftItem.amount ||
      draftItem.attachmentName ||
      draftItem.lineNotes ||
      draftItem.totalHours ||
      draftItem.ratePerHour ||
      draftItem.effectiveMonth ||
      draft.period ||
      draft.periodConfirmed ||
      draft.payrollBaselineConfirmed ||
      draft.payrollSnapshot?.hasConfiguredBaseline ||
      parseAmount(draft.payrollSnapshot?.net) > 0 ||
      parseAmount(draft.approvedOvertimePayout) > 0 ||
      parseAmount(draft.projectedNetPayout) > 0,
  )

const resolveSalaryDraftDisplayAmount = (draft = {}) => {
  if (draft?.projectedNetPayout !== null && typeof draft?.projectedNetPayout !== 'undefined') {
    return parseAmount(draft?.projectedNetPayout)
  }
  return 0
}

const toClaimTypeLabel = (type = '') => {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
  if (normalized === 'salary') return 'Salary'
  if (normalized === 'other') return 'Exceptional'
  return 'Expense'
}

export const resolveClaimListDisplayAmount = (claim = {}) => {
  if (String(claim?.type || '').trim() !== 'salary') return parseAmount(claim?.amount)
  if (claim?.projectedNetPayout !== null && typeof claim?.projectedNetPayout !== 'undefined') {
    return parseAmount(claim?.projectedNetPayout)
  }
  return 0
}

export const toDraftRecord = (draft = {}, fallbackType = 'expense') => {
  const draftType = String(draft?.claimType || fallbackType || 'expense').trim() || 'expense'
  const savedItems = Array.isArray(draft?.savedItems) ? draft.savedItems : []
  const draftItem = draft?.draftItem && typeof draft.draftItem === 'object' ? draft.draftItem : {}
  const hasContent =
    savedItems.length > 0 ||
    (draftType === 'salary'
      ? hasSalaryDraftContent(draft, draftItem)
      : hasExpenseDraftContent(draftItem))
  if (!hasContent) return null

  const amount =
    savedItems.length > 0
      ? savedItems.reduce((sum, item) => sum + parseAmount(item?.amount), 0)
      : parseAmount(draftItem?.amount)
  const displayAmount =
    draftType === 'salary' ? resolveSalaryDraftDisplayAmount(draft, savedItems, draftItem) : amount
  const categoryDetail =
    savedItems.length > 1
      ? 'Multiple'
      : savedItems.length === 1
        ? draftType === 'salary'
          ? String(savedItems[0]?.claimType || 'Salary').trim()
          : String(
              savedItems[0]?.category || (draftType === 'other' ? 'Exceptional' : 'Expense'),
            ).trim()
        : draftType === 'salary'
          ? String(draftItem?.claimType || 'Salary').trim()
          : String(
              draftItem?.category || (draftType === 'other' ? 'Exceptional' : 'Expense'),
            ).trim()
  const category = toClaimTypeLabel(draftType)

  const updatedAt = String(draft?.updatedAt || '').trim() || new Date().toISOString()
  const isSyncing = Boolean(draft?.localOnly)
  return {
    id: String(draft?.id || '').trim(),
    backendId: Number(draft?.backendId || 0) || null,
    backendDraftId: String(draft?.backendDraftId || '').trim(),
    period: formatDraftPeriodLabel(draft?.period),
    category,
    categoryDetail:
      categoryDetail && categoryDetail.toLowerCase() !== category.toLowerCase()
        ? categoryDetail
        : '',
    amount,
    displayAmount,
    status: isSyncing ? 'Draft (Syncing)' : 'Draft',
    submittedAt: updatedAt,
    updatedAt,
    attachmentAvailable:
      savedItems.some((item) => Boolean(item?.attachmentName)) ||
      Boolean(draftItem?.attachmentName),
    attachmentName: String(
      savedItems.find((item) => item?.attachmentName)?.attachmentName ||
        draftItem?.attachmentName ||
        '',
    ).trim(),
    notes: String(savedItems[0]?.lineNotes || draftItem?.lineNotes || '').trim(),
    type: draftType,
    isDraft: true,
    localOnly: isSyncing,
  }
}

export const buildSubmittedClaimEditPayload = (claim) => {
  if (!claim?.id || claim?.isDraft) return null
  const type = claim.type || 'expense'
  const periodValue = resolvePeriodValue(claim)
  const sourcePayload = {
    sourceClaimId: claim.id,
    sourceServerId: claim.serverId || null,
  }

  if (type === 'salary') {
    const isOtFallbackItem = (item) =>
      String(item?.claimType || item?.itemType || '').trim() === 'Addition' &&
      String(item?.lineNotes || item?.notes || '')
        .toLowerCase()
        .includes('approved overtime payout')

    const manualItems = Array.isArray(claim.items)
      ? claim.items.filter((item) => !isOtFallbackItem(item))
      : []

    return {
      ...sourcePayload,
      type: 'salary',
      claimType: 'salary',
      period: periodValue,
      periodConfirmed: true,
      payrollBaselineConfirmed: Boolean(claim.payrollBaselineConfirmed),
      payrollSnapshot: claim.payrollSnapshot || null,
      savedItems: manualItems,
      draftItem: {},
    }
  }

  const expenseItems =
    Array.isArray(claim.items) && claim.items.length > 0
      ? claim.items
      : [buildFallbackExpenseItem(claim)]
  return {
    ...sourcePayload,
    type,
    claimType: type,
    period: periodValue,
    periodConfirmed: true,
    savedItems: expenseItems,
    draftItem: {},
  }
}
