import { asInputNumber, createAllowanceDraftItem, parseAmount, roundMoney } from '../../utils'
import { normalizeAllowanceDraftRows, normalizeNotesHistory } from './assignmentStateDomain'

export const ASSIGNMENT_FORM_STEPS = [
  { key: 'staff', label: 'Staff and Month' },
  { key: 'pay', label: 'Pay Package' },
  { key: 'review', label: 'Review' },
]

const getDeductionInputs = (draft = {}) =>
  draft?.employeeContributions && typeof draft.employeeContributions === 'object'
    ? draft.employeeContributions
    : {}

export const buildAssignmentPayComponentRows = ({
  draft = {},
  salaryDetailTotals = {},
  calculatedDeductions = {},
} = {}) => {
  const allowanceRows = normalizeAllowanceDraftRows(draft.allowances)
  const deductionInputs = getDeductionInputs(draft)
  const resolveDeductionAmount = (key, fallback) => {
    const raw = deductionInputs?.[key]
    if (raw === '' || raw === null || typeof raw === 'undefined') return fallback
    const numeric = Number.parseFloat(raw)
    return Number.isFinite(numeric) ? numeric : fallback
  }
  const employeeDeductionRows = (
    Array.isArray(calculatedDeductions?.rows) ? calculatedDeductions.rows : []
  ).map((row) => ({
    ...row,
    amount: resolveDeductionAmount(row.key, row.employeeAmount),
  }))
  const totalDeductions = employeeDeductionRows.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0,
  )
  const gross = Number(salaryDetailTotals?.gross || 0) || 0

  return {
    totalEmployeeDeductions: totalDeductions,
    rows: [
      {
        id: 'component-basic',
        rowType: 'basic',
        label: 'Basic Salary',
        amount: draft?.basicSalary,
        editable: true,
        deletable: false,
      },
      ...allowanceRows.map((row, index) => ({
        id: row?.id || `allowance-${index}`,
        rowType: 'allowance',
        label: row?.name || `Allowance ${index + 1}`,
        name: row?.name || '',
        amount: row?.amount,
        editable: true,
        deletable: true,
      })),
      ...employeeDeductionRows.map((row) => ({
        id: `deduction-${row.key}`,
        componentKey: row.key,
        rowType: 'deduction',
        label: `${row.label} (Employee Deduction)`,
        amount: row.amount,
        editable: true,
        deletable: false,
      })),
      {
        id: 'summary-gross',
        rowType: 'summary',
        label: 'Gross Salary',
        amount: gross,
        editable: false,
        deletable: false,
      },
      {
        id: 'summary-total-deductions',
        rowType: 'summary',
        label: 'Total Employee Deductions',
        amount: totalDeductions,
        editable: false,
        deletable: false,
      },
      {
        id: 'summary-net-payable',
        rowType: 'summary-net',
        label: 'Net Payable',
        amount: gross - totalDeductions,
        editable: false,
        deletable: false,
      },
    ],
  }
}

export const updateAssignmentPayDraft = (
  draft = {},
  { rowType = '', rowId = '', field = '', value = '' } = {},
) => {
  if (!rowType || !field) return draft
  if (rowType === 'basic' && field === 'amount') {
    return { ...draft, basicSalary: value }
  }
  if (rowType === 'allowance') {
    const allowances = normalizeAllowanceDraftRows(draft.allowances).map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row,
    )
    return { ...draft, allowances }
  }
  if (rowType === 'deduction' && field === 'amount') {
    return {
      ...draft,
      employeeContributions: {
        ...getDeductionInputs(draft),
        [rowId]: value,
      },
    }
  }
  return draft
}

export const addAssignmentAllowanceRow = (draft = {}) => ({
  ...draft,
  allowances: [
    ...normalizeAllowanceDraftRows(draft.allowances),
    createAllowanceDraftItem({ name: '', amount: '0' }),
  ],
})

export const deleteAssignmentAllowanceRow = (draft = {}, rowId = '') => ({
  ...draft,
  allowances: normalizeAllowanceDraftRows(draft.allowances).filter((row) => row.id !== rowId),
})

export const validateAssignmentPayDraft = (draft = {}) => {
  const basicSalary = parseAmount(draft.basicSalary)
  if (basicSalary < 0) {
    return { ok: false, message: 'Basic salary cannot be negative.', title: 'Invalid salary' }
  }

  const allowances = normalizeAllowanceDraftRows(draft.allowances).map((row) => ({
    ...row,
    name: String(row.name || '').trim(),
    amount: roundMoney(row.amount),
  }))
  if (allowances.some((row) => parseAmount(row.amount) < 0)) {
    return {
      ok: false,
      message: 'Allowance amount cannot be negative.',
      title: 'Invalid allowance',
    }
  }
  if (allowances.some((row) => parseAmount(row.amount) > 0 && !String(row.name || '').trim())) {
    return {
      ok: false,
      message: 'Allowance name is required when amount is provided.',
      title: 'Invalid allowance',
    }
  }
  if (Object.values(getDeductionInputs(draft)).some((value) => parseAmount(value) < 0)) {
    return {
      ok: false,
      message: 'Employee deductions cannot be negative.',
      title: 'Invalid deduction',
    }
  }
  return { ok: true }
}

export const buildAssignmentStepState = ({ draft = {}, isReadOnly = false } = {}) => {
  const staffReady = Boolean(String(draft.employee || '').trim())
  const monthReady = Boolean(String(draft.effectiveFrom || '').trim())
  const payReady = parseAmount(draft.basicSalary) > 0

  return {
    staff: { complete: staffReady && monthReady, available: true },
    pay: { complete: payReady, available: isReadOnly || (staffReady && monthReady) },
    review: {
      complete: staffReady && monthReady && payReady,
      available: isReadOnly || (staffReady && monthReady && payReady),
    },
  }
}

export const normalizeAssignmentRemarks = ({
  currentHistory = [],
  value = '',
  actorName = 'System user',
  nowIso = new Date().toISOString(),
} = {}) => {
  const nextText = String(value || '').trim()
  if (!nextText) {
    return {
      notesHistory: [],
      notes: '',
      notesUpdatedAt: '',
      notesUpdatedBy: '',
    }
  }

  const existing = normalizeNotesHistory(currentHistory)
  const latest = existing[0] || null
  const nextEntry = latest
    ? { ...latest, text: nextText, updatedAt: nowIso, updatedBy: actorName }
    : {
        id: `remark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: nextText,
        createdAt: nowIso,
        createdBy: actorName,
        updatedAt: '',
        updatedBy: '',
      }
  const rest = latest ? existing.slice(1) : existing
  const notesHistory = [nextEntry, ...rest]

  return {
    notesHistory,
    notes: nextText,
    notesUpdatedAt: nextEntry.updatedAt || nextEntry.createdAt || '',
    notesUpdatedBy: nextEntry.updatedBy || nextEntry.createdBy || '',
  }
}

export const buildAssignmentReviewSummary = ({
  draft = {},
  salaryDetailTotals = {},
  calculatedDeductions = {},
} = {}) => {
  const { totalEmployeeDeductions } = buildAssignmentPayComponentRows({
    draft,
    salaryDetailTotals,
    calculatedDeductions,
  })
  const gross = Number(salaryDetailTotals?.gross || 0) || 0

  return {
    staffName: draft.employee || '-',
    team: draft.team || '-',
    effectiveFrom: draft.effectiveFrom || '-',
    basicSalary: parseAmount(draft.basicSalary),
    grossSalary: gross,
    totalEmployeeDeductions,
    netPayable: gross - totalEmployeeDeductions,
    remarks: normalizeNotesHistory(draft.notesHistory, draft),
  }
}

const normalizeComparableText = (value) => String(value || '').trim()

const normalizeComparableAmount = (value) => roundMoney(parseAmount(value))

const buildAmountDisplayRow = ({ key, type, label, amount, rawAmount = amount }) => ({
  key,
  type,
  label: normalizeComparableText(label) || '-',
  amount: normalizeComparableAmount(amount),
  rawAmount,
})

export const buildAssignmentDraftRowMap = ({ draft = {}, calculatedDeductions = {} } = {}) => {
  const rows = new Map()
  rows.set(
    'basic',
    buildAmountDisplayRow({
      key: 'basic',
      type: 'basic',
      label: 'Basic Salary',
      amount: draft.basicSalary,
    }),
  )

  normalizeAllowanceDraftRows(draft.allowances).forEach((allowance, index) => {
    const id = allowance.id || `allowance-${index}`
    rows.set(
      `allowance:${id}`,
      buildAmountDisplayRow({
        key: `allowance:${id}`,
        type: 'allowance',
        label: allowance.name || `Allowance ${index + 1}`,
        amount: allowance.amount,
      }),
    )
  })

  const deductionInputs = getDeductionInputs(draft)
  const deductionKeys = new Set([
    ...Object.keys(deductionInputs || {}),
    ...(Array.isArray(calculatedDeductions?.rows)
      ? calculatedDeductions.rows.map((row) => row.key).filter(Boolean)
      : []),
  ])
  deductionKeys.forEach((key) => {
    const sourceRow = Array.isArray(calculatedDeductions?.rows)
      ? calculatedDeductions.rows.find((row) => row.key === key)
      : null
    const rawValue = deductionInputs?.[key]
    const hasOverride = rawValue !== '' && rawValue !== null && typeof rawValue !== 'undefined'
    rows.set(
      `deduction:${key}`,
      buildAmountDisplayRow({
        key: `deduction:${key}`,
        type: 'deduction',
        label: `${sourceRow?.label || key.toUpperCase()} (Employee Deduction)`,
        amount: hasOverride ? rawValue : sourceRow?.employeeAmount || 0,
        rawAmount: hasOverride ? rawValue : '',
      }),
    )
  })

  const remarks = normalizeNotesHistory(draft.notesHistory, draft)
  rows.set('remarks', {
    key: 'remarks',
    type: 'remarks',
    label: 'Remarks',
    text: remarks.map((remark) => normalizeComparableText(remark.text)).join('\n\n'),
  })

  return rows
}

export const deriveAssignmentChangedRows = ({
  baselineDraft = {},
  draft = {},
  calculatedDeductions = {},
} = {}) => {
  const baselineRows = buildAssignmentDraftRowMap({ draft: baselineDraft, calculatedDeductions })
  const currentRows = buildAssignmentDraftRowMap({ draft, calculatedDeductions })
  const keys = Array.from(new Set([...baselineRows.keys(), ...currentRows.keys()]))

  return keys
    .map((key) => {
      const before = baselineRows.get(key) || null
      const after = currentRows.get(key) || null
      if (!before && !after) return null
      const type = after?.type || before?.type || ''
      const label = after?.label || before?.label || key

      if (type === 'remarks') {
        const beforeText = normalizeComparableText(before?.text)
        const afterText = normalizeComparableText(after?.text)
        if (beforeText === afterText) return null
        return {
          key,
          type,
          label,
          changeType: beforeText ? (afterText ? 'updated' : 'removed') : 'added',
          beforeText,
          afterText,
        }
      }

      const beforeAmount = normalizeComparableAmount(before?.amount)
      const afterAmount = normalizeComparableAmount(after?.amount)
      const beforeLabel = normalizeComparableText(before?.label)
      const afterLabel = normalizeComparableText(after?.label)
      const beforeRaw = normalizeComparableText(before?.rawAmount)
      const afterRaw = normalizeComparableText(after?.rawAmount)
      if (
        beforeAmount === afterAmount &&
        beforeLabel === afterLabel &&
        beforeRaw === afterRaw &&
        Boolean(before) === Boolean(after)
      ) {
        return null
      }

      return {
        key,
        type,
        label,
        changeType: !before ? 'added' : !after ? 'removed' : 'updated',
        beforeAmount,
        afterAmount,
        beforeLabel,
        afterLabel,
      }
    })
    .filter(Boolean)
}

export const deriveAssignmentUnchangedRows = ({
  baselineDraft = {},
  draft = {},
  calculatedDeductions = {},
} = {}) => {
  const changedKeys = new Set(
    deriveAssignmentChangedRows({ baselineDraft, draft, calculatedDeductions }).map(
      (row) => row.key,
    ),
  )
  return Array.from(buildAssignmentDraftRowMap({ draft, calculatedDeductions }).values()).filter(
    (row) => !changedKeys.has(row.key) && row.type !== 'remarks',
  )
}

export const buildAssignmentPatchReviewSummary = ({
  baselineDraft = {},
  draft = {},
  salaryDetailTotals = {},
  calculatedDeductions = {},
} = {}) => ({
  ...buildAssignmentReviewSummary({ draft, salaryDetailTotals, calculatedDeductions }),
  changedRows: deriveAssignmentChangedRows({ baselineDraft, draft, calculatedDeductions }),
  unchangedRows: deriveAssignmentUnchangedRows({ baselineDraft, draft, calculatedDeductions }),
})
