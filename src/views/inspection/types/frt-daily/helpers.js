import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import { getScopedProgressLabel } from 'src/views/inspection/form/inspectionCountLabels'
import { neutralizeCompletionPresentation } from '../continuationHelpers'
import { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'
import {
  defaultFrtTruckOption,
  normalizeFrtTruckOption,
  normalizeFrtTruckReference,
  resolveSelectedFrtTruckPlate,
} from './truckReferenceHelpers'

export { FRT_REFERENCE, FRT_TRUCK_REFERENCE } from './reference'
export {
  defaultFrtTruckOption,
  normalizeFrtTruckOption,
  normalizeFrtTruckReference,
  resolveSelectedFrtTruckPlate,
} from './truckReferenceHelpers'

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

const text = (value) => String(value || '').trim()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeCompartmentTitle = (value) => {
  const normalized = text(value).replace(/\s+/g, ' ').toUpperCase()
  const lockerMatch = normalized.match(/^LOCKER\s+(?:NO\s+)?0?(\d+)$/)
  if (lockerMatch) return `LOCKER ${lockerMatch[1].padStart(2, '0')}`
  if (normalized === 'TRUCK CHECKLIST') return 'FIRE TRUCK'
  return normalized
}

const getFrtCompartment = (row = {}) => normalizeCompartmentTitle(row.compartment || row.location)

const getSelectedFrtCompartment = (form = {}) =>
  normalizeCompartmentTitle(form.frtCompartment || form.frt_compartment || form.subLocation)

export const normalizeFrtCustomCompartments = (compartments) => {
  const byValue = new Map()
  ;(Array.isArray(compartments) ? compartments : []).forEach((value) => {
    const normalized = normalizeCompartmentTitle(value)
    if (!normalized) return
    byValue.set(normalized, normalized)
  })
  return Array.from(byValue.values())
}

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

const buildDailyRow = (section, row) => {
  const [rowNumber, equipment, quantity, rowKind] = row
  const compartment = normalizeCompartmentTitle(section.title)
  return {
    id: `daily:fire-truck:${rowNumber}`,
    checklistKind: 'daily',
    rowNumber: String(rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: section.title,
    compartment,
    equipment: String(equipment || '').trim(),
    quantity: String(quantity || '').trim(),
    rowKind: String(rowKind || 'status').trim(),
  }
}

const buildOneOffRow = (section, row) => {
  const [rowNumber, equipment] = row
  const compartment = normalizeCompartmentTitle(section.title)
  return {
    id: `one-off:fire-truck:${rowNumber}`,
    checklistKind: 'oneOff',
    rowNumber: String(rowNumber || '').trim(),
    mainLocation: 'FIRE TRUCK',
    location: section.title,
    compartment,
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
    compartment: normalizeCompartmentTitle(check.compartment || check.compartment_name || location),
    equipment,
    quantity: String(check.quantity || '').trim(),
    rowKind,
    status: normalizeFrtDailyStatus(check.status),
    readingValue: String(check.readingValue || check.reading_value || '').trim(),
    remarks: String(check.remarks || check.remark || '').trim(),
    photos: normalizePhotos(check.photos),
    additionalNotes: String(check.additionalNotes || check.additional_notes || '').trim(),
    additionalPhotos: normalizePhotos(check.additionalPhotos || check.additional_photos),
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
    compartment: normalizeCompartmentTitle(check.compartment || check.compartment_name || location),
    equipment,
    condition: normalizeFrtOneOffStatus(check.condition),
    remarks: String(check.remarks || check.remark || '').trim(),
    photos: normalizePhotos(check.photos),
    additionalNotes: String(check.additionalNotes || check.additional_notes || '').trim(),
    additionalPhotos: normalizePhotos(check.additionalPhotos || check.additional_photos),
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
    compartment: row.compartment,
    equipment: row.equipment,
    quantity: row.quantity,
    rowKind: row.rowKind || emptyPatch.rowKind || '',
  }))

  return merged
}

const getCustomRows = (currentRows, seedRows) => {
  const seededIds = new Set(seedRows.map((row) => String(row.id || '')))
  return currentRows.filter((row) => {
    const rowId = String(row.id || '').trim()
    return rowId && !seededIds.has(rowId)
  })
}

const hasPhotos = (value) => normalizePhotos(value).length > 0

const isFrtDailyRowComplete = (row = {}) => {
  if (row.rowKind === 'reading') return text(row.readingValue) !== ''
  if (!text(row.status)) return false
  if (row.status !== 'Issue') return true
  return text(row.remarks) !== ''
}

const isFrtOneOffRowComplete = (row = {}) => {
  if (!text(row.condition)) return false
  if (row.condition !== 'Not Good') return true
  return text(row.remarks) !== ''
}

const isFrtDailyInspectionCandidateRow = (row = {}) =>
  isFrtDailyRowComplete(row) ||
  text(row.readingValue) !== '' ||
  text(row.status) !== '' ||
  text(row.remarks) !== '' ||
  hasPhotos(row.photos)

const isFrtOneOffInspectionCandidateRow = (row = {}) =>
  isFrtOneOffRowComplete(row) ||
  text(row.condition) !== '' ||
  text(row.remarks) !== '' ||
  hasPhotos(row.photos)

const filterRowsByCompartment = (rows = [], compartment = '') => {
  const selectedCompartment = normalizeCompartmentTitle(compartment)
  if (!selectedCompartment) return rows
  return rows.filter((row) => getFrtCompartment(row) === selectedCompartment)
}

const getFrtDailyRows = (form = {}, { filterCompartment = true } = {}) => {
  if (!resolveSelectedFrtTruckPlate(form)) return []
  const currentRows = normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks)
  const seedRows = FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) => section.rows)
  const rows = FRT_DAILY_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      status: '',
      readingValue: '',
      remarks: '',
      photos: [],
      additionalNotes: '',
      additionalPhotos: [],
    }),
  ).concat(getCustomRows(currentRows, seedRows))
  return filterCompartment ? filterRowsByCompartment(rows, getSelectedFrtCompartment(form)) : rows
}

const getFrtOneOffRows = (form = {}, { filterCompartment = true } = {}) => {
  if (!resolveSelectedFrtTruckPlate(form)) return []
  const currentRows = normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks)
  const seedRows = FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) => section.rows)
  const rows = FRT_ONE_OFF_SECTION_DEFINITIONS.flatMap((section) =>
    mergeSeededRows(section.rows, currentRows, {
      condition: '',
      remarks: '',
      photos: [],
      additionalNotes: '',
      additionalPhotos: [],
    }),
  ).concat(getCustomRows(currentRows, seedRows))
  return filterCompartment ? filterRowsByCompartment(rows, getSelectedFrtCompartment(form)) : rows
}

export const getFrtVisibleDailyChecks = (form = {}) => getFrtDailyRows(form)

export const getFrtVisibleOneOffChecks = (form = {}) => getFrtOneOffRows(form)

export const getFrtSubmissionDailyChecks = (form = {}) => {
  if (!resolveSelectedFrtTruckPlate(form)) return []
  return normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks).filter(
    isFrtDailyInspectionCandidateRow,
  )
}

export const getFrtSubmissionOneOffChecks = (form = {}) => {
  if (!resolveSelectedFrtTruckPlate(form)) return []
  return normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks).filter(
    isFrtOneOffInspectionCandidateRow,
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
  const incompletePhotoCount = 0

  return {
    ...section,
    title: normalizeCompartmentTitle(section.title) || section.title,
    visibleRows,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
    incompletePhotoCount,
  }
}

const buildCompartmentOptionRows = () => {
  const byCompartment = new Map()
  const addSection = (section, rows, kind) => {
    const compartment = normalizeCompartmentTitle(section.title)
    if (!compartment) return
    const current = byCompartment.get(compartment) || {
      value: compartment,
      title: compartment,
      description: '',
      dailyRowCount: 0,
      oneOffRowCount: 0,
    }
    if (kind === 'daily') current.dailyRowCount += rows.length
    else current.oneOffRowCount += rows.length
    byCompartment.set(compartment, current)
  }
  FRT_DAILY_SECTION_DEFINITIONS.forEach((section) => addSection(section, section.rows, 'daily'))
  FRT_ONE_OFF_SECTION_DEFINITIONS.forEach((section) => addSection(section, section.rows, 'oneOff'))
  return Array.from(byCompartment.values()).map((row) => ({
    ...row,
    description: `${row.dailyRowCount + row.oneOffRowCount} item${
      row.dailyRowCount + row.oneOffRowCount === 1 ? '' : 's'
    }`,
  }))
}

const FRT_COMPARTMENT_OPTION_ROWS = buildCompartmentOptionRows()

const buildDynamicSectionDefinitions = (baseSections, rows, form) => {
  const byTitle = new Map(
    baseSections.map((section) => [normalizeCompartmentTitle(section.title), section]),
  )
  ;[
    ...normalizeFrtCustomCompartments(form.frtCustomCompartments || form.frt_custom_compartments),
    ...rows.map((row) => getFrtCompartment(row)),
  ].forEach((compartment) => {
    const normalized = normalizeCompartmentTitle(compartment)
    if (!normalized || byTitle.has(normalized)) return
    byTitle.set(normalized, {
      key: `custom:${slugSegment(normalized)}`,
      title: normalized,
      rows: [],
      custom: true,
    })
  })
  return Array.from(byTitle.values())
}

export const getFrtCompartmentOptions = (form = {}) => {
  const dailyRows = getFrtDailyRows(form, { filterCompartment: false })
  const oneOffRows = getFrtOneOffRows(form, { filterCompartment: false })
  const allRows = [...dailyRows, ...oneOffRows]
  const optionRowsByValue = new Map(
    FRT_COMPARTMENT_OPTION_ROWS.map((option) => [option.value, option]),
  )
  ;[
    ...normalizeFrtCustomCompartments(form.frtCustomCompartments || form.frt_custom_compartments),
    ...allRows.map((row) => getFrtCompartment(row)),
  ].forEach((compartment) => {
    const normalized = normalizeCompartmentTitle(compartment)
    if (!normalized || optionRowsByValue.has(normalized)) return
    optionRowsByValue.set(normalized, {
      value: normalized,
      title: normalized,
      description: 'Custom compartment',
      dailyRowCount: 0,
      oneOffRowCount: 0,
    })
  })
  return Array.from(optionRowsByValue.values()).map((option) => {
    const rows = allRows.filter((row) => getFrtCompartment(row) === option.value)
    const inspectedCount = rows.filter((row) =>
      row.checklistKind === 'oneOff' ? isFrtOneOffRowComplete(row) : isFrtDailyRowComplete(row),
    ).length
    const totalCount = rows.length || option.dailyRowCount + option.oneOffRowCount
    const isDone = totalCount > 0 && inspectedCount === totalCount
    return neutralizeCompletionPresentation({
      ...option,
      metaLabel: getScopedProgressLabel({
        completedCount: inspectedCount,
        totalCount,
        singular: 'check',
        plural: 'checks',
      }),
      metaTone: isDone ? 'success' : 'muted',
      metaIconKey: isDone ? 'check' : '',
      progress: {
        inspectedCount,
        totalCount,
        isDone,
      },
    })
  })
}

export const getFrtCheckSummary = (form = {}, options = {}) => {
  const selectedTruck = resolveSelectedFrtTruckPlate(form)
  const selectedCompartment = getSelectedFrtCompartment(form)
  const dailyRows = Array.isArray(options.dailyRows)
    ? options.dailyRows
    : getFrtVisibleDailyChecks(form)
  const oneOffRows = Array.isArray(options.oneOffRows)
    ? options.oneOffRows
    : getFrtVisibleOneOffChecks(form)
  const dailySections = buildDynamicSectionDefinitions(
    FRT_DAILY_SECTION_DEFINITIONS,
    dailyRows,
    form,
  )
  const oneOffSections = buildDynamicSectionDefinitions(
    FRT_ONE_OFF_SECTION_DEFINITIONS,
    oneOffRows,
    form,
  )
  const visibleDailySections = dailySections.map((section) =>
    buildSectionSummary(section, dailyRows, 'daily'),
  )
  const visibleOneOffSections = oneOffSections.map((section) =>
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
    selectedCompartment,
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

export const getFrtReadOnlySummary = (form = {}) =>
  getFrtCheckSummary(form, {
    dailyRows: normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks),
    oneOffRows: normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks),
  })

export const getFrtMissingFields = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const selectedTruck = resolveSelectedFrtTruckPlate(form)
  const selectedCompartment = getSelectedFrtCompartment(form)
  const hasChecklistRows = summary.dailyRows.length + summary.oneOffRows.length > 0
  const hasIncompleteDaily = summary.dailyRows.some((row) =>
    row.rowKind === 'reading'
      ? !String(row.readingValue || '').trim()
      : !String(row.status || '').trim(),
  )
  const hasIncompleteOneOff = summary.oneOffRows.some((row) => !String(row.condition || '').trim())

  return {
    frtSession: !selectedTruck,
    frtCompartment: !selectedCompartment,
    frtDailyChecks: !hasChecklistRows || hasIncompleteDaily,
    frtDailyRemarks: summary.dailyRows.some(
      (row) => row.status === 'Issue' && !String(row.remarks || '').trim(),
    ),
    frtOneOffChecks: !hasChecklistRows || hasIncompleteOneOff,
    frtOneOffRemarks: summary.oneOffRows.some(
      (row) => row.condition === 'Not Good' && !String(row.remarks || '').trim(),
    ),
  }
}

export const getFrtValidationDetails = (form = {}) => {
  const summary = getFrtCheckSummary(form)
  const rowDetails = []
  const missingStatusesByRow = {}
  const missingRemarksByRow = {}
  const missingPhotosByRow = {}
  let firstTarget = null

  const addRowDetail = (row, field, detailKey) => {
    const rowId = String(row.id || '').trim()
    const detail = {
      field,
      rowId,
      checkKey: '',
      detailKey,
      sectionKey: String(row.location || '').trim(),
      checklistKind: String(row.checklistKind || '').trim(),
    }
    rowDetails.push(detail)
    if (['status', 'condition', 'readingValue'].includes(detailKey)) {
      missingStatusesByRow[rowId] = [...(missingStatusesByRow[rowId] || []), detailKey]
    }
    if (detailKey === 'remarks') {
      missingRemarksByRow[rowId] = [...(missingRemarksByRow[rowId] || []), detailKey]
    }
    if (detailKey === 'photos') {
      missingPhotosByRow[rowId] = [...(missingPhotosByRow[rowId] || []), detailKey]
    }
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
    }
  })

  summary.oneOffRows.forEach((row) => {
    if (!String(row.condition || '').trim()) addRowDetail(row, 'frtOneOffChecks', 'condition')
    if (row.condition === 'Not Good') {
      if (!String(row.remarks || '').trim()) addRowDetail(row, 'frtOneOffRemarks', 'remarks')
    }
  })

  return {
    rowDetails,
    missingStatusesByRow,
    missingRemarksByRow,
    missingPhotosByRow,
    firstTarget,
    errorCount: rowDetails.length,
  }
}

const makeChecklistId = (label) =>
  `${slugSegment(FRT_DAILY_INSPECTION_TYPE) || 'frt-daily-inspection'}:${slugSegment(label)}`

export const buildFrtChecklist = (form = {}, options = {}) => {
  const summary = getFrtCheckSummary(form, options)
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

export const buildFrtDescription = (form = {}, options = {}) => {
  const inspectedBy = String(form.frtInspectedBy || form.frt_inspected_by || '').trim()
  const inspectionDate = String(form.frtInspectionDate || form.frt_inspection_date || '').trim()
  const dailyRemarks = String(form.frtDailyRemarks || form.frt_daily_remarks || '').trim()
  const oneOffRemarks = String(form.frtOneOffRemarks || form.frt_one_off_remarks || '').trim()
  const generalRemarks =
    dailyRemarks && oneOffRemarks && dailyRemarks !== oneOffRemarks
      ? [dailyRemarks, oneOffRemarks].join('\n')
      : dailyRemarks || oneOffRemarks
  const summary = getFrtCheckSummary(form, options)
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

  if (generalRemarks) lines.push(`Remarks: ${generalRemarks}`)

  return lines.join('\n')
}

export const isFrtDailyInspectionType = (inspectionType) =>
  [FRT_DAILY_INSPECTION_TYPE, FRT_DAILY_LEGACY_INSPECTION_TYPE].some(
    (type) => normalizeKey(inspectionType) === normalizeKey(type),
  )
