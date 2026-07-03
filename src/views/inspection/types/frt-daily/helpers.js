import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'

export { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'

export const FRT_DAILY_INSPECTION_TYPE = 'Fire Truck Daily Readiness'
export const FRT_DAILY_LEGACY_INSPECTION_TYPE = 'FRT Daily Inspection'
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

const hasOwn = (item, key) => Object.prototype.hasOwnProperty.call(item || {}, key)

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

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

export const normalizeFrtTruckReference = (value = {}) => {
  const hasExplicitReference = [
    'truckId',
    'truck_id',
    'id',
    'name',
    'truckName',
    'truck_name',
    'plateNo',
    'plate_no',
    'value',
    'title',
    'roadTaxExpiry',
    'road_tax_expiry',
    'insuranceExpiry',
    'insurance_expiry',
    'puspakomExpiry',
    'puspakom_expiry',
  ].some((key) => hasOwn(value, key))
  const fallback = hasExplicitReference ? {} : FRT_TRUCK_REFERENCE

  return {
    truckId: String(value.truckId ?? value.truck_id ?? value.id ?? '').trim(),
    name: String(value.name ?? value.truckName ?? value.truck_name ?? '').trim(),
    plateNo: String(
      value.plateNo ?? value.plate_no ?? value.value ?? value.title ?? fallback.plateNo ?? '',
    ).trim(),
    roadTaxExpiry: String(
      value.roadTaxExpiry ?? value.road_tax_expiry ?? fallback.roadTaxExpiry ?? '',
    ).trim(),
    insuranceExpiry: String(
      value.insuranceExpiry ?? value.insurance_expiry ?? fallback.insuranceExpiry ?? '',
    ).trim(),
    puspakomExpiry: String(
      value.puspakomExpiry ?? value.puspakom_expiry ?? fallback.puspakomExpiry ?? '',
    ).trim(),
  }
}

export const normalizeFrtTruckOption = (value = {}) => {
  const reference = normalizeFrtTruckReference(value)
  const plateNo = String(reference.plateNo || value.value || value.title || '')
    .trim()
    .toUpperCase()
  if (!plateNo) return null
  return {
    ...value,
    id: String(value.truckId || value.truck_id || value.id || plateNo).trim(),
    truckId: String(value.truckId || value.truck_id || value.id || '').trim(),
    plateNo,
    value: plateNo,
    title: plateNo,
    name: String(reference.name || value.description || '').trim(),
    description: String(reference.name || value.description || '').trim(),
    roadTaxExpiry: reference.roadTaxExpiry,
    insuranceExpiry: reference.insuranceExpiry,
    puspakomExpiry: reference.puspakomExpiry,
  }
}

export const defaultFrtTruckOption = () =>
  normalizeFrtTruckOption({
    ...FRT_TRUCK_REFERENCE,
    name: 'Fire Truck',
    value: FRT_TRUCK_REFERENCE.plateNo,
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
    photos: normalizePhotos(check.photos),
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
    photos: normalizePhotos(check.photos),
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

export const resolveSelectedFrtTruckPlate = (form = {}) => {
  const reference = normalizeFrtTruckReference(form.frtTruckReference || form.frt_truck_reference)
  const direct =
    String(
      form.frtTruckPlateNo ||
        form.frt_truck_plate_no ||
        form.mainLocation ||
        form.main_location ||
        form.selectedLocation ||
        form.location ||
        '',
    )
      .split('>')
      .map((part) => part.trim())
      .filter(Boolean)[0] || ''
  if (direct) {
    if (normalizeKey(direct) === normalizeKey('FIRE TRUCK')) return reference.plateNo
    if (form.frtTruckPlateNo || form.frt_truck_plate_no || form.frtTruckId || form.frt_truck_id) {
      return direct
    }
    return /\d/.test(direct) ? direct : ''
  }
  return form.frtTruckId || form.frt_truck_id ? reference.plateNo : ''
}

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
  if (!resolveSelectedFrtTruckPlate(form)) return []
  const currentRows = normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks)
  return FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      status: '',
      readingValue: '',
      remarks: '',
      photos: [],
    }),
  )
}

export const getFrtVisibleOneOffChecks = (form = {}) => {
  if (!resolveSelectedFrtTruckPlate(form)) return []
  const currentRows = normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks)
  return FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      condition: '',
      remarks: '',
      photos: [],
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
  const incompletePhotoCount = visibleRows.filter((row) =>
    kind === 'daily'
      ? row.status === 'Issue' && normalizePhotos(row.photos).length === 0
      : row.condition === 'Not Good' && normalizePhotos(row.photos).length === 0,
  ).length

  return {
    ...section,
    visibleRows,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
    incompletePhotoCount,
  }
}

export const getFrtCheckSummary = (form = {}) => {
  const selectedTruck = resolveSelectedFrtTruckPlate(form)
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
    dailyIncompletePhotoCount: visibleDailySections.reduce(
      (sum, section) => sum + section.incompletePhotoCount,
      0,
    ),
    oneOffIncompletePhotoCount: visibleOneOffSections.reduce(
      (sum, section) => sum + section.incompletePhotoCount,
      0,
    ),
    truckReference: normalizeFrtTruckReference(form.frtTruckReference || form.frt_truck_reference),
  }
}

export const getFrtMissingFields = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const selectedTruck = resolveSelectedFrtTruckPlate(form)
  const hasIncompleteDaily = summary.dailyRows.some((row) =>
    row.rowKind === 'reading'
      ? !String(row.readingValue || '').trim()
      : !String(row.status || '').trim(),
  )
  const hasIncompleteOneOff = summary.oneOffRows.some((row) => !String(row.condition || '').trim())

  return {
    frtSession: !selectedTruck,
    frtDailyChecks: summary.dailyRows.length === 0 || hasIncompleteDaily,
    frtDailyRemarks: summary.dailyRows.some(
      (row) =>
        row.status === 'Issue' &&
        (!String(row.remarks || '').trim() || normalizePhotos(row.photos).length === 0),
    ),
    frtOneOffChecks: summary.oneOffRows.length === 0 || hasIncompleteOneOff,
    frtOneOffRemarks: summary.oneOffRows.some(
      (row) =>
        row.condition === 'Not Good' &&
        (!String(row.remarks || '').trim() || normalizePhotos(row.photos).length === 0),
    ),
  }
}

export const getFrtValidationDetails = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const rowDetails = []
  let firstTarget = null

  const addRowDetail = (row, field, detailKey) => {
    const detail = {
      field,
      rowId: String(row.id || '').trim(),
      checkKey: '',
      detailKey,
      sectionKey: String(row.location || '').trim(),
      checklistKind: String(row.checklistKind || '').trim(),
    }
    rowDetails.push(detail)
    if (!firstTarget) firstTarget = detail
  }

  summary.dailyRows.forEach((row) => {
    if (row.rowKind === 'reading') {
      if (!String(row.readingValue || '').trim())
        addRowDetail(row, 'frtDailyChecks', 'readingValue')
      return
    }
    if (!String(row.status || '').trim()) addRowDetail(row, 'frtDailyChecks', 'status')
    if (row.status === 'Issue') {
      if (!String(row.remarks || '').trim()) addRowDetail(row, 'frtDailyRemarks', 'remarks')
      if (normalizePhotos(row.photos).length === 0) addRowDetail(row, 'frtDailyRemarks', 'photos')
    }
  })

  summary.oneOffRows.forEach((row) => {
    if (!String(row.condition || '').trim()) addRowDetail(row, 'frtOneOffChecks', 'condition')
    if (row.condition === 'Not Good') {
      if (!String(row.remarks || '').trim()) addRowDetail(row, 'frtOneOffRemarks', 'remarks')
      if (normalizePhotos(row.photos).length === 0) addRowDetail(row, 'frtOneOffRemarks', 'photos')
    }
  })

  return {
    rowDetails,
    firstTarget,
    errorCount: rowDetails.length,
  }
}

const makeChecklistId = (label) =>
  `${slugSegment(FRT_DAILY_INSPECTION_TYPE) || 'frt-daily-inspection'}:${slugSegment(label)}`

export const buildFrtChecklist = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const rows = []
  const truckPlate = summary.selectedTruck || 'selected truck'

  if (summary.dailyRows.length > 0 && summary.dailyCheckedCount === summary.dailyRows.length) {
    const label = `${truckPlate} daily readiness roster completed`
    rows.push({
      id: makeChecklistId(label),
      label,
      inspectionType: FRT_DAILY_INSPECTION_TYPE,
      selected: true,
      selectedAt: '',
    })
  }

  if (summary.oneOffRows.length > 0 && summary.oneOffCheckedCount === summary.oneOffRows.length) {
    const label = `${truckPlate} one-off readiness checklist completed`
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
  const dailyRemarks = String(form.frtDailyRemarks || form.frt_daily_remarks || '').trim()
  const oneOffRemarks = String(form.frtOneOffRemarks || form.frt_one_off_remarks || '').trim()
  const summary = getFrtCheckSummary(form)
  const truckPlate = summary.selectedTruck || 'selected truck'

  const lines = [
    `Fire Truck Daily Readiness completed for ${truckPlate}${inspectionDate ? ` on ${inspectionDate}` : ''}${inspectedBy ? ` by ${inspectedBy}` : ''}.`,
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
  [FRT_DAILY_INSPECTION_TYPE, FRT_DAILY_LEGACY_INSPECTION_TYPE].some(
    (type) => normalizeKey(inspectionType) === normalizeKey(type),
  )
