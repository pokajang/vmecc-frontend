import { formatCurrency, parseAmount } from './utils/claimFormUtils'
import {
  requiresBillingPeriod,
  requiresMedicalFields,
  requiresMileageFields,
  requiresTravelFields,
} from './utils/claimSubmissionUtils'

export const buildSalaryClaimSummary = ({
  isLoading = false,
  hasAssignedSalaryBaseline = false,
  assignedSalarySnapshot = {},
  totalAmount = 0,
  overtimeTotals = {},
  projectedNetPayout = 0,
  payrollBaselineConfirmed = false,
} = {}) => {
  const baselineNet = parseAmount(assignedSalarySnapshot?.net)
  const adjustmentsTotal = parseAmount(totalAmount)
  const approvedOvertimePayout = parseAmount(overtimeTotals?.totalPayoutApproved)
  const finalPayable = parseAmount(projectedNetPayout)

  const statusLabel = isLoading
    ? 'Loading payroll baseline'
    : !hasAssignedSalaryBaseline
      ? 'Payroll baseline unavailable'
      : payrollBaselineConfirmed
        ? 'Ready to submit'
        : 'Baseline confirmation needed'

  return {
    statusLabel,
    hasAssignedSalaryBaseline: Boolean(hasAssignedSalaryBaseline),
    payrollBaselineConfirmed: Boolean(payrollBaselineConfirmed),
    metrics: [
      {
        key: 'finalPayable',
        label: 'Final Payable',
        value: formatCurrency(finalPayable),
        emphasis: true,
      },
      {
        key: 'baselineNet',
        label: 'Baseline Net',
        value: formatCurrency(baselineNet),
      },
      {
        key: 'adjustmentsTotal',
        label: 'Adjustments',
        value: formatCurrency(adjustmentsTotal),
      },
      {
        key: 'approvedOvertimePayout',
        label: 'Approved OT',
        value: formatCurrency(approvedOvertimePayout),
      },
    ],
  }
}

export const buildExpenseClaimEditorSchema = ({
  isExceptionalClaim = false,
  draftItem = {},
  categoryGuidance = {},
} = {}) => {
  const category = String(draftItem?.category || '').trim()
  const fieldSections = []

  if (!category) {
    return {
      category,
      categoryLabel: isExceptionalClaim ? 'Reason Category' : 'Category',
      dateLabel: isExceptionalClaim ? 'Claim Date' : 'Expense Date',
      amountDisabled: false,
      helperText: categoryGuidance?.helperText || '',
      attachmentHint: categoryGuidance?.attachmentHint || '',
      notesPlaceholder: categoryGuidance?.notesPlaceholder || '',
      fieldSections,
      hasCategorySpecificFields: false,
    }
  }

  if (!isExceptionalClaim && requiresMileageFields(category)) {
    fieldSections.push({
      key: 'mileage',
      title: 'Mileage Details',
      fields: ['fromLocation', 'toLocation', 'distanceKm', 'ratePerKm'],
    })
  }

  if (!isExceptionalClaim && requiresTravelFields(category)) {
    fieldSections.push({
      key: 'travel',
      title: 'Travel Dates',
      fields: ['destination', 'tripDateFrom', 'tripDateTo'],
    })
  }

  if (!isExceptionalClaim && requiresBillingPeriod(category)) {
    fieldSections.push({
      key: 'billing',
      title: 'Billing Period',
      fields: ['billedPeriod'],
    })
  }

  if (!isExceptionalClaim && requiresMedicalFields(category)) {
    fieldSections.push({
      key: 'medical',
      title: 'Medical Claimant',
      fields: ['claimant'],
    })
  }

  if (isExceptionalClaim) {
    fieldSections.push({
      key: 'exceptional',
      title: 'Approval Context',
      fields: ['approvalNote'],
    })
  }

  return {
    category,
    categoryLabel: isExceptionalClaim ? 'Reason Category' : 'Category',
    dateLabel: isExceptionalClaim ? 'Claim Date' : 'Expense Date',
    amountDisabled: !isExceptionalClaim && requiresMileageFields(category),
    helperText: categoryGuidance?.helperText || '',
    attachmentHint: categoryGuidance?.attachmentHint || '',
    notesPlaceholder: categoryGuidance?.notesPlaceholder || '',
    fieldSections,
    hasCategorySpecificFields: fieldSections.length > 0,
  }
}

export const groupClaimAttachments = (items = []) => {
  const sourceItems = Array.isArray(items) ? items : []
  return sourceItems
    .map((item, index) => ({
      index,
      category: item?.category || item?.claimType || 'Item',
      attachmentId: item?.attachmentId || null,
      attachmentName: String(item?.attachmentName || '').trim(),
      needsReattach: Boolean(item?.needsReattach),
      uploadState: item?.attachmentUploadState || 'idle',
    }))
    .filter((item) => item.attachmentId || item.attachmentName)
}

export const buildClaimDefaultPathValidity = ({
  periodConfirmed = false,
  savedItems = [],
  hasAssignedSalaryBaseline = true,
  payrollBaselineConfirmed = true,
  claimType = 'expense',
} = {}) => {
  const hasSavedItems = Array.isArray(savedItems) && savedItems.length > 0
  if (claimType === 'salary') {
    return Boolean(periodConfirmed && hasAssignedSalaryBaseline && payrollBaselineConfirmed)
  }
  return Boolean(periodConfirmed && hasSavedItems)
}
