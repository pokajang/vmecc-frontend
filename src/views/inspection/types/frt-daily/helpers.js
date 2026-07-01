import { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'

export { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'

export const FRT_DAILY_INSPECTION_TYPE = 'FRT Daily Inspection'
export const FRT_DAILY_STATUS_OPTIONS = [
  { value: 'Checked', label: 'Checked' },
  { value: 'Issue', label: 'Issue' },
]
export const FRT_ONE_OFF_STATUS_OPTIONS = [
  { value: 'Good', label: 'Good' },
  { value: 'Not Good', label: 'Not Good' },
]

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const buildDailyRow = (section, row) => {
  const [rowNumber, equipment, quantity, rowKind] = row
  return {
    id: `daily:fire-truck:${rowNumber}`,
    checklistKind: 'daily',
    rowNumber: String(rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: section.title,
    equipment: String(equipment || '').trim(),
    quantity: String(quantity || '').trim(),
    rowKind: String(rowKind || 'status').trim(),
  }
}

const buildOneOffRow = (section, row) => {
  const [rowNumber, equipment] = row
  return {
    id: `one-off:fire-truck:${rowNumber}`,
    checklistKind: 'oneOff',
    rowNumber: String(rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: section.title,
    equipment: String(equipment || '').trim(),
  }
}

export const FRT_DAILY_SECTION_DEFINITIONS = FRT_REFERENCE.dailySections.map((section) => ({
  ...section,
  rows: section.rows.map((row) => buildDailyRow(section, row)),
}))

export const FRT_ONE_OFF_SECTION_DEFINITIONS = FRT_REFERENCE.oneOffSections.map((section) => ({
  ...section,
  rows: section.rows.map((row) => buildOneOffRow(section, row)),
}))

const normalizeFrtDailyStatus = (value) => {
  const matched = FRT_DAILY_STATUS_OPTIONS.find(
    (option) => normalizeKey(option.value) === normalizeKey(value),
  )
  return matched?.value || ''
}

const normalizeFrtOneOffStatus = (value) => {
  const matched = FRT_ONE_OFF_STATUS_OPTIONS.find(
    (option) => normalizeKey(option.value) === normalizeKey(value),
  )
  return matched?.value || ''
}

export const normalizeFrtTruckReference = (value = {}) => ({
  plateNo: String(value.plateNo || value.plate_no || FRT_TRUCK_REFERENCE.plateNo || '').trim(),
  roadTaxExpiry: String(
    value.roadTaxExpiry || value.road_tax_expiry || FRT_TRUCK_REFERENCE.roadTaxExpiry || '',
  ).trim(),
  insuranceExpiry: String(
    value.insuranceExpiry || value.insurance_expiry || FRT_TRUCK_REFERENCE.insuranceExpiry || '',
  ).trim(),
  puspakomExpiry: String(
    value.puspakomExpiry || value.puspakom_expiry || FRT_TRUCK_REFERENCE.puspakomExpiry || '',
  ).trim(),
})

const normalizeFrtDailyCheck = (check = {}) => {
  if (!check || typeof check !== 'object') return null

  const rowNumber = String(check.rowNumber || check.row_number || '').trim()
  const equipment = String(check.equipment || check.title || check.name || '').trim()
  if (!rowNumber && !equipment) return null

  const location = String(check.location || '').trim()
  const rowKind =
    String(check.rowKind || check.row_kind || 'status')
      .trim()
      .toLowerCase() || 'status'
  const fallbackId = `daily:fire-truck:${rowNumber || slugSegment(`${location}-${equipment}`)}`

  return {
    ...check,
    id: String(check.id || fallbackId).trim(),
    checklistKind: 'daily',
    rowNumber,
    mainLocation: String(
      check.mainLocation || check.main_location || check.selectedLocation || 'FIRE TRUCK',
    ).trim(),
    location,
    equipment,
    quantity: String(check.quantity || '').trim(),
    rowKind,
    status: normalizeFrtDailyStatus(check.status),
    readingValue: String(check.readingValue || check.reading_value || '').trim(),
    remarks: String(check.remarks || check.remark || '').trim(),
  }
}

const normalizeFrtOneOffCheck = (check = {}) => {
  if (!check || typeof check !== 'object') return null

  const rowNumber = String(check.rowNumber || check.row_number || '').trim()
  const equipment = String(check.equipment || check.title || check.name || '').trim()
  if (!rowNumber && !equipment) return null

  const location = String(check.location || '').trim()
  const fallbackId = `one-off:fire-truck:${rowNumber || slugSegment(`${location}-${equipment}`)}`

  return {
    ...check,
    id: String(check.id || fallbackId).trim(),
    checklistKind: 'oneOff',
    rowNumber,
    mainLocation: String(
      check.mainLocation || check.main_location || check.selectedLocation || 'FIRE TRUCK',
    ).trim(),
    location,
    equipment,
    condition: normalizeFrtOneOffStatus(check.condition),
    remarks: String(check.remarks || check.remark || '').trim(),
  }
}

export const normalizeFrtDailyChecks = (checks) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((check) => {
    const normalized = normalizeFrtDailyCheck(check)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const normalizeFrtOneOffChecks = (checks) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((check) => {
    const normalized = normalizeFrtOneOffCheck(check)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

const resolveSelectedTruck = (form = {}) =>
  String(form.mainLocation || form.main_location || form.selectedLocation || form.location || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)[0] || ''

const mergeSeededRows = (seedRows, currentRows, emptyPatch = {}) => {
  const currentById = new Map(currentRows.map((row) => [String(row.id || ''), row]))
  const merged = seedRows.map((row) => ({
    ...row,
    ...emptyPatch,
    ...(currentById.get(String(row.id || '')) || {}),
    id: row.id,
    checklistKind: row.checklistKind,
    rowNumber: row.rowNumber,
    mainLocation: row.mainLocation,
    location: row.location,
    equipment: row.equipment,
    quantity: row.quantity,
    rowKind: row.rowKind || emptyPatch.rowKind || '',
  }))

  return merged
}

export const getFrtVisibleDailyChecks = (form = {}) => {
  if (normalizeKey(resolveSelectedTruck(form)) !== normalizeKey('FIRE TRUCK')) return []
  const currentRows = normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks)
  return FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      status: '',
      readingValue: '',
      remarks: '',
    }),
  )
}

export const getFrtVisibleOneOffChecks = (form = {}) => {
  if (normalizeKey(resolveSelectedTruck(form)) !== normalizeKey('FIRE TRUCK')) return []
  const currentRows = normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks)
  return FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      condition: '',
      remarks: '',
    }),
  )
}

const buildSectionSummary = (section, rows, kind) => {
  const visibleRows = rows.filter(
    (row) => normalizeKey(row.location) === normalizeKey(section.title),
  )
  const checkedCount = visibleRows.filter((row) =>
    kind === 'daily'
      ? row.rowKind === 'reading'
        ? String(row.readingValue || '').trim() !== ''
        : String(row.status || '').trim() !== ''
      : String(row.condition || '').trim() !== '',
  ).length
  const issueCount = visibleRows.filter((row) =>
    kind === 'daily' ? row.status === 'Issue' : row.condition === 'Not Good',
  ).length
  const incompleteRemarksCount = visibleRows.filter((row) =>
    kind === 'daily'
      ? row.status === 'Issue' && !String(row.remarks || '').trim()
      : row.condition === 'Not Good' && !String(row.remarks || '').trim(),
  ).length

  return {
    ...section,
    visibleRows,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
  }
}

export const getFrtCheckSummary = (form = {}) => {
  const selectedTruck = resolveSelectedTruck(form)
  const dailyRows = getFrtVisibleDailyChecks(form)
  const oneOffRows = getFrtVisibleOneOffChecks(form)
  const visibleDailySections = FRT_DAILY_SECTION_DEFINITIONS.map((section) =>
    buildSectionSummary(section, dailyRows, 'daily'),
  )
  const visibleOneOffSections = FRT_ONE_OFF_SECTION_DEFINITIONS.map((section) =>
    buildSectionSummary(section, oneOffRows, 'oneOff'),
  )

  const dailyCheckedCount = visibleDailySections.reduce(
    (sum, section) => sum + section.checkedCount,
    0,
  )
  const oneOffCheckedCount = visibleOneOffSections.reduce(
    (sum, section) => sum + section.checkedCount,
    0,
  )
  const dailyIssueCount = visibleDailySections.reduce((sum, section) => sum + section.issueCount, 0)
  const oneOffIssueCount = visibleOneOffSections.reduce(
    (sum, section) => sum + section.issueCount,
    0,
  )

  return {
    selectedTruck,
    totalCount: dailyRows.length + oneOffRows.length,
    checkedCount: dailyCheckedCount + oneOffCheckedCount,
    issueCount: dailyIssueCount + oneOffIssueCount,
    dailyCheckedCount,
    oneOffCheckedCount,
    dailyIssueCount,
    oneOffIssueCount,
    visibleChecks: [...dailyRows, ...oneOffRows],
    dailyRows,
    oneOffRows,
    visibleDailySections,
    visibleOneOffSections,
    dailyIncompleteRemarksCount: visibleDailySections.reduce(
      (sum, section) => sum + section.incompleteRemarksCount,
      0,
    ),
    oneOffIncompleteRemarksCount: visibleOneOffSections.reduce(
      (sum, section) => sum + section.incompleteRemarksCount,
      0,
    ),
    truckReference: normalizeFrtTruckReference(form.frtTruckReference || form.frt_truck_reference),
  }
}

export const getFrtMissingFields = (form = {}) => {
  const inspectedBy = String(form.frtInspectedBy || form.frt_inspected_by || '').trim()
  const inspectionDate = String(form.frtInspectionDate || form.frt_inspection_date || '').trim()
  const shift = String(form.frtShift || form.frt_shift || '').trim()
  const summary = getFrtCheckSummary(form)
  const hasIncompleteDaily = summary.dailyRows.some((row) =>
    row.rowKind === 'reading'
      ? !String(row.readingValue || '').trim()
      : !String(row.status || '').trim(),
  )
  const hasIncompleteOneOff = summary.oneOffRows.some((row) => !String(row.condition || '').trim())

  return {
    frtSession: !inspectedBy || !inspectionDate || !shift,
    frtDailyChecks: summary.dailyRows.length === 0 || hasIncompleteDaily,
    frtDailyRemarks: summary.dailyRows.some(
      (row) => row.status === 'Issue' && !String(row.remarks || '').trim(),
    ),
    frtOneOffChecks: summary.oneOffRows.length === 0 || hasIncompleteOneOff,
    frtOneOffRemarks: summary.oneOffRows.some(
      (row) => row.condition === 'Not Good' && !String(row.remarks || '').trim(),
    ),
  }
}

const makeChecklistId = (label) =>
  `${slugSegment(FRT_DAILY_INSPECTION_TYPE) || 'frt-daily-inspection'}:${slugSegment(label)}`

export const buildFrtChecklist = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const rows = []

  if (summary.dailyRows.length > 0 && summary.dailyCheckedCount === summary.dailyRows.length) {
    const label = 'FIRE TRUCK daily roster completed'
    rows.push({
      id: makeChecklistId(label),
      label,
      inspectionType: FRT_DAILY_INSPECTION_TYPE,
      selected: true,
      selectedAt: '',
    })
  }

  if (summary.oneOffRows.length > 0 && summary.oneOffCheckedCount === summary.oneOffRows.length) {
    const label = 'FIRE TRUCK one-off checklist completed'
    rows.push({
      id: makeChecklistId(label),
      label,
      inspectionType: FRT_DAILY_INSPECTION_TYPE,
      selected: true,
      selectedAt: '',
    })
  }

  summary.dailyRows.forEach((row) => {
    if (row.status === 'Issue') {
      const label = `Daily - ${row.equipment}: Issue`
      rows.push({
        id: makeChecklistId(label),
        label,
        inspectionType: FRT_DAILY_INSPECTION_TYPE,
        selected: true,
        selectedAt: '',
      })
    }
  })

  summary.oneOffRows.forEach((row) => {
    if (row.condition === 'Not Good') {
      const label = `One-off - ${row.equipment}: Not Good`
      rows.push({
        id: makeChecklistId(label),
        label,
        inspectionType: FRT_DAILY_INSPECTION_TYPE,
        selected: true,
        selectedAt: '',
      })
    }
  })

  return rows
}

export const buildFrtDescription = (form = {}) => {
  const inspectedBy = String(form.frtInspectedBy || form.frt_inspected_by || '').trim()
  const inspectionDate = String(form.frtInspectionDate || form.frt_inspection_date || '').trim()
  const shift = String(form.frtShift || form.frt_shift || '').trim()
  const dailyRemarks = String(form.frtDailyRemarks || form.frt_daily_remarks || '').trim()
  const oneOffRemarks = String(form.frtOneOffRemarks || form.frt_one_off_remarks || '').trim()
  const summary = getFrtCheckSummary(form)

  const lines = [
    `FRT Daily inspection checked for FIRE TRUCK${inspectionDate ? ` on ${inspectionDate}` : ''}${shift ? ` (${shift} shift)` : ''}${inspectedBy ? ` by ${inspectedBy}` : ''}.`,
    `Daily roster completed: ${summary.dailyCheckedCount}/${summary.dailyRows.length}.`,
    `One-off checklist completed: ${summary.oneOffCheckedCount}/${summary.oneOffRows.length}.`,
    `Issue row(s): ${summary.issueCount}.`,
  ]

  summary.dailyRows
    .filter((row) => row.status === 'Issue')
    .forEach((row) => {
      lines.push(`- Daily ${row.location} / ${row.equipment}: ${row.remarks || 'Issue recorded.'}`)
    })

  summary.oneOffRows
    .filter((row) => row.condition === 'Not Good')
    .forEach((row) => {
      lines.push(
        `- One-off ${row.location} / ${row.equipment}: ${row.remarks || 'Issue recorded.'}`,
      )
    })

  if (dailyRemarks) lines.push(`Daily remarks: ${dailyRemarks}`)
  if (oneOffRemarks) lines.push(`One-off remarks: ${oneOffRemarks}`)

  return lines.join('\n')
}

export const isFrtDailyInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(FRT_DAILY_INSPECTION_TYPE)
