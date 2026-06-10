import {
  asInputNumber,
  createAllowanceDraftItem,
  createAssignmentId,
  emptyAssignmentDraft,
  formatMonth,
  getAssignmentEmployeeIdentityKey,
  parseAmount,
  roundMoney,
} from '../../utils'

export const DEFAULT_ALLOWANCE_NAMES = ['Performance Allowance', 'Mobile Allowance']

export const createEmptyPayComponentsDraft = () => ({
  basicSalary: '',
  allowances: [],
  employeeDeductions: {
    epf: '',
    perkeso: '',
    sip: '',
  },
})

export const normalizeAllowanceDraftRows = (rows = []) => {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    id: row?.id || createAllowanceDraftItem().id,
    name: String(row?.name || ''),
    amount: asInputNumber(row?.amount),
  }))
}

export const ensureDefaultAllowanceRows = (rows = []) => {
  const normalized = normalizeAllowanceDraftRows(rows)
  const existingNames = new Set(
    normalized
      .map((row) =>
        String(row?.name || '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  )
  const defaultsToInject = DEFAULT_ALLOWANCE_NAMES.filter(
    (name) => !existingNames.has(String(name).trim().toLowerCase()),
  ).map((name) => createAllowanceDraftItem({ name, amount: '0' }))
  return [...normalized, ...defaultsToInject]
}

export const normalizeNotesHistory = (notesHistory = [], fallback = {}) => {
  const normalized = Array.isArray(notesHistory)
    ? notesHistory
        .map((entry, index) => {
          const text = String(entry?.text || '').trim()
          if (!text) return null
          const createdAt = String(entry?.createdAt || '').trim()
          const createdBy = String(entry?.createdBy || '').trim()
          const updatedAt = String(entry?.updatedAt || '').trim()
          const updatedBy = String(entry?.updatedBy || '').trim()
          return {
            id: String(entry?.id || '').trim() || `remark-${index + 1}`,
            text,
            createdAt,
            createdBy,
            updatedAt,
            updatedBy,
          }
        })
        .filter(Boolean)
    : []
  if (normalized.length > 0) return normalized

  const fallbackText = String(fallback?.notes || '').trim()
  if (!fallbackText) return []
  return [
    {
      id: 'remark-legacy',
      text: fallbackText,
      createdAt: String(fallback?.notesUpdatedAt || fallback?.updatedAt || '').trim(),
      createdBy: String(fallback?.notesUpdatedBy || fallback?.updatedBy || '').trim(),
      updatedAt: '',
      updatedBy: '',
    },
  ]
}

export const mergeAndSortAssignmentHistory = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .sort((a, b) => {
      const aAt = new Date(a?.at || '').getTime()
      const bAt = new Date(b?.at || '').getTime()
      if (Number.isFinite(aAt) && Number.isFinite(bAt) && aAt !== bAt) return bAt - aAt
      return String(b?.id || '').localeCompare(String(a?.id || ''))
    })
    .slice(0, 100)

export const buildAssignmentDraftFromRow = (row = {}) => {
  const selectedStaffKey =
    row.employeeId && String(row.employeeId).trim()
      ? `id:${String(row.employeeId).trim()}`
      : row.email
        ? `email:${String(row.email).trim().toLowerCase()}`
        : ''
  const loadedAllowances = ensureDefaultAllowanceRows(
    Array.isArray(row.allowances) && row.allowances.length > 0
      ? row.allowances
      : row.fixedAllowances
        ? [createAllowanceDraftItem({ name: 'Allowance', amount: row.fixedAllowances })]
        : [],
  )

  return {
    selectedStaffKey,
    employeeId: row.employeeId ? String(row.employeeId) : '',
    employee: row.employee || '',
    avatarUrl: row.avatarUrl || '',
    email: row.email || '',
    icNumber: row.icNumber || '',
    phone: row.phone || '',
    team: row.team || 'Unassigned',
    effectiveFrom: row.effectiveFrom || '',
    basicSalary: asInputNumber(row.basicSalary),
    allowances: loadedAllowances,
    allowanceTotal: asInputNumber(row.allowanceTotal ?? row.fixedAllowances),
    employeeContributions: {
      epf: asInputNumber(row?.employeeContributions?.epf ?? row?.epf),
      perkeso: asInputNumber(row?.employeeContributions?.perkeso ?? row?.perkeso),
      sip: asInputNumber(row?.employeeContributions?.sip ?? row?.sip),
    },
    employerContributions: {
      epf: asInputNumber(row?.employerContributions?.epf),
      perkeso: asInputNumber(row?.employerContributions?.perkeso),
      sip: asInputNumber(row?.employerContributions?.sip),
    },
    fixedAllowances: asInputNumber(row.fixedAllowances),
    epf: asInputNumber(row.epf),
    perkeso: asInputNumber(row.perkeso),
    sip: asInputNumber(row.sip),
    notesHistory: normalizeNotesHistory(row.notesHistory, row),
    notes: row.notes || '',
    notesUpdatedAt: row.notesUpdatedAt || row.updatedAt || '',
    notesUpdatedBy: row.notesUpdatedBy || row.updatedBy || '',
  }
}

export const buildAssignmentDraftFromDraftRecord = (draftRecord = {}) => {
  const rawDraft =
    draftRecord?.draftData && typeof draftRecord.draftData === 'object' ? draftRecord.draftData : {}
  const merged = { ...emptyAssignmentDraft(), ...rawDraft }
  return {
    ...merged,
    allowances: ensureDefaultAllowanceRows(merged.allowances),
    notesHistory: normalizeNotesHistory(merged.notesHistory, merged),
  }
}

export const buildAssignmentDraftName = (draftData, actor) => {
  const employee = String(draftData?.employee || '').trim()
  const monthLabel = formatMonth(draftData?.effectiveFrom)
  const dateLabel = new Date().toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const actorLabel = String(actor || '').trim()
  const staffPart = employee || 'New salary assignment'
  const monthPart = monthLabel && monthLabel !== '-' ? monthLabel : 'No month'
  return `${staffPart} | ${monthPart} | ${actorLabel || 'System'} | ${dateLabel}`
}

export const findLatestAssignmentForStaff = (assignmentRows = [], selected = {}) => {
  const selectedIdentityKey = getAssignmentEmployeeIdentityKey({
    employeeId: selected?.id || '',
    email: selected?.email || '',
    employee: selected?.employee || '',
  })
  return [...(Array.isArray(assignmentRows) ? assignmentRows : [])]
    .filter((row) => getAssignmentEmployeeIdentityKey(row) === selectedIdentityKey)
    .sort((a, b) => {
      const aMonth = String(a?.effectiveFrom || '')
      const bMonth = String(b?.effectiveFrom || '')
      if (aMonth !== bMonth) return aMonth > bMonth ? -1 : 1
      const aUpdated = String(a?.updatedAt || a?.createdAt || '')
      const bUpdated = String(b?.updatedAt || b?.createdAt || '')
      if (aUpdated !== bUpdated) return aUpdated > bUpdated ? -1 : 1
      return String(a?.id || '').localeCompare(String(b?.id || ''))
    })[0]
}

export const buildStaffChangePatch = ({ key, selected, latestForStaff }) => {
  const loadedAllowances = ensureDefaultAllowanceRows(
    Array.isArray(latestForStaff?.allowances) && latestForStaff.allowances.length > 0
      ? latestForStaff.allowances
      : latestForStaff?.fixedAllowances
        ? [
            createAllowanceDraftItem({
              name: 'Allowance',
              amount: latestForStaff.fixedAllowances,
            }),
          ]
        : [],
  )
  const loadedNotesHistory = latestForStaff
    ? normalizeNotesHistory(latestForStaff.notesHistory, latestForStaff)
    : []
  const latestRemark = loadedNotesHistory[0] || null

  return {
    selectedStaffKey: key,
    employeeId: selected?.id || '',
    employee: selected?.employee || '',
    avatarUrl: selected?.avatarUrl || '',
    email: selected?.email || '',
    icNumber: selected?.icNumber || '',
    phone: selected?.phone || '',
    team: selected?.team || 'Unassigned',
    basicSalary: latestForStaff ? asInputNumber(latestForStaff.basicSalary) : '',
    allowances: latestForStaff ? loadedAllowances : ensureDefaultAllowanceRows([]),
    employeeContributions: latestForStaff
      ? {
          epf: asInputNumber(latestForStaff?.employeeContributions?.epf ?? latestForStaff?.epf),
          perkeso: asInputNumber(
            latestForStaff?.employeeContributions?.perkeso ?? latestForStaff?.perkeso,
          ),
          sip: asInputNumber(latestForStaff?.employeeContributions?.sip ?? latestForStaff?.sip),
        }
      : { epf: '', perkeso: '', sip: '' },
    notesHistory: loadedNotesHistory,
    notes: latestRemark?.text || '',
    notesUpdatedAt: latestRemark?.updatedAt || latestRemark?.createdAt || '',
    notesUpdatedBy: latestRemark?.updatedBy || latestRemark?.createdBy || '',
  }
}

export const calculateSalaryDetailTotals = (payComponentSource = {}) => {
  const allowances = normalizeAllowanceDraftRows(payComponentSource.allowances)
    .map((row) => ({
      ...row,
      amount: roundMoney(row.amount),
    }))
    .filter((row) => row.name || parseAmount(row.amount) > 0)
  const allowanceTotal = roundMoney(
    allowances.reduce((sum, row) => sum + parseAmount(row.amount), 0),
  )
  const basicSalary = roundMoney(payComponentSource.basicSalary)
  return {
    allowanceTotal,
    basicSalary,
    gross: roundMoney(basicSalary + allowanceTotal),
    allowances,
  }
}

export const toNonNegativeRate = (value) => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export const calculateStatutoryDeductions = ({
  salaryDetailTotals,
  statutoryRates,
  statutoryRatesFeatureEnabled,
}) => {
  const baseSalary = salaryDetailTotals.basicSalary
  const amountByRate = (key, side) => {
    if (!statutoryRatesFeatureEnabled) return 0
    const rate = toNonNegativeRate(statutoryRates?.[key]?.[side])
    return roundMoney(baseSalary * rate)
  }
  const makeRow = (key, label) => {
    const employeeRate = statutoryRatesFeatureEnabled
      ? toNonNegativeRate(statutoryRates?.[key]?.employeeRate)
      : 0
    const employerRate = statutoryRatesFeatureEnabled
      ? toNonNegativeRate(statutoryRates?.[key]?.employerRate)
      : 0
    const employeeAmount = amountByRate(key, 'employeeRate')
    const employerAmount = amountByRate(key, 'employerRate')
    return {
      key,
      label,
      employeeRate,
      employerRate,
      employeeAmount,
      employerAmount,
      totalAmount: roundMoney(employeeAmount + employerAmount),
      baseWage: baseSalary,
      method: statutoryRatesFeatureEnabled ? 'configured_rate' : 'feature_disabled',
    }
  }
  const rows = [makeRow('epf', 'EPF'), makeRow('perkeso', 'PERKESO'), makeRow('sip', 'SIP')]
  return {
    gross: salaryDetailTotals.gross,
    rows,
    totals: {
      employee: roundMoney(rows.reduce((sum, row) => sum + row.employeeAmount, 0)),
      employer: roundMoney(rows.reduce((sum, row) => sum + row.employerAmount, 0)),
    },
  }
}

export const resolveEmployeeContribution = (input, fallback) => {
  if (input === '' || input === null || typeof input === 'undefined') {
    return roundMoney(fallback)
  }
  return roundMoney(input)
}

export const calculateContributionByRate = ({
  rate,
  salaryDetailTotals,
  statutoryRatesFeatureEnabled,
}) =>
  statutoryRatesFeatureEnabled
    ? roundMoney(salaryDetailTotals.basicSalary * toNonNegativeRate(rate))
    : 0

export const buildSalaryAssignmentRow = ({
  actorName,
  assignmentDraft,
  assignmentRows,
  editingAssignmentId,
  salaryDetailTotals,
  selectedOption,
  statutoryRates,
  statutoryRatesFeatureEnabled,
}) => {
  const allowances = salaryDetailTotals.allowances.map((row) => ({
    id: row.id,
    name: String(row.name || '').trim(),
    amount: roundMoney(row.amount),
  }))
  const defaultEmployeeContributions = {
    epf: calculateContributionByRate({
      rate: statutoryRates?.epf?.employeeRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
    perkeso: calculateContributionByRate({
      rate: statutoryRates?.perkeso?.employeeRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
    sip: calculateContributionByRate({
      rate: statutoryRates?.sip?.employeeRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
  }
  const employeeContributions = {
    epf: resolveEmployeeContribution(
      assignmentDraft?.employeeContributions?.epf,
      defaultEmployeeContributions.epf,
    ),
    perkeso: resolveEmployeeContribution(
      assignmentDraft?.employeeContributions?.perkeso,
      defaultEmployeeContributions.perkeso,
    ),
    sip: resolveEmployeeContribution(
      assignmentDraft?.employeeContributions?.sip,
      defaultEmployeeContributions.sip,
    ),
  }
  const employerContributions = {
    epf: calculateContributionByRate({
      rate: statutoryRates?.epf?.employerRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
    perkeso: calculateContributionByRate({
      rate: statutoryRates?.perkeso?.employerRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
    sip: calculateContributionByRate({
      rate: statutoryRates?.sip?.employerRate,
      salaryDetailTotals,
      statutoryRatesFeatureEnabled,
    }),
  }

  const now = new Date().toISOString()
  const targetRow =
    assignmentRows.find((row) => String(row.id) === String(editingAssignmentId)) || null
  const notesHistory = normalizeNotesHistory(assignmentDraft.notesHistory, assignmentDraft)
  const latestRemark = notesHistory[0] || null
  const clientId =
    targetRow?.id || createAssignmentId(assignmentRows, assignmentDraft.effectiveFrom)

  return {
    row: {
      id: clientId,
      referenceId: targetRow?.referenceId || clientId,
      serverId: targetRow?.serverId || targetRow?.id || null,
      employeeId:
        assignmentDraft.employeeId || selectedOption?.id
          ? String(assignmentDraft.employeeId || selectedOption?.id || '')
          : '',
      employee: assignmentDraft.employee.trim(),
      avatarUrl: assignmentDraft.avatarUrl || selectedOption?.avatarUrl || '',
      email: String(assignmentDraft.email || '')
        .trim()
        .toLowerCase(),
      icNumber: String(assignmentDraft.icNumber || '').trim(),
      phone: String(assignmentDraft.phone || '').trim(),
      team: assignmentDraft.team || selectedOption?.team || 'Unassigned',
      effectiveFrom: assignmentDraft.effectiveFrom,
      basicSalary: roundMoney(assignmentDraft.basicSalary),
      allowances,
      allowanceTotal: salaryDetailTotals.allowanceTotal,
      employeeContributions,
      employerContributions,
      fixedAllowances: salaryDetailTotals.allowanceTotal,
      epf: employeeContributions.epf,
      perkeso: employeeContributions.perkeso,
      sip: employeeContributions.sip,
      notesHistory,
      notes: latestRemark?.text || '',
      notesUpdatedAt:
        latestRemark?.updatedAt || latestRemark?.createdAt || (latestRemark ? now : ''),
      notesUpdatedBy: latestRemark?.updatedBy || latestRemark?.createdBy || '',
      status: targetRow?.status || '',
      createdAt: targetRow?.createdAt || now,
      createdBy: targetRow?.createdBy || actorName,
      updatedAt: now,
      updatedBy: actorName,
    },
    targetRow,
  }
}
