import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import rawReference from './reference.json'

export const HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE = 'High Angle Rescue Equipment Inspection'

export const HIGH_ANGLE_STATUS_OPTIONS = [
  { value: 'Good', label: 'Good' },
  { value: 'Not Good', label: 'Not Good' },
]

export const HIGH_ANGLE_CONDITION_FIELD = {
  key: 'condition',
  label: 'Condition',
  remarksKey: 'conditionRemarks',
  photosKey: 'conditionPhotos',
}

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const isMeaningfulValue = (value) => {
  const text = String(value || '').trim()
  return text !== '' && text.toUpperCase() !== 'N/A'
}

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

const HIGH_ANGLE_REFERENCE_SECTIONS = [
  {
    key: 'storageLocation',
    label: 'Storage Location',
    sourceLabel: 'Location',
  },
  {
    key: 'subLocation',
    label: 'Compartment',
    sourceLabel: 'Sub-Location',
  },
  {
    key: 'equipment',
    label: 'Equipment',
    sourceLabel: 'Equipment',
  },
  {
    key: 'quantity',
    label: 'Quantity',
    sourceLabel: 'Quantity',
  },
  {
    key: 'condition',
    label: 'Condition',
    sourceLabel: 'Condition',
  },
  {
    key: 'remarks',
    label: 'Remarks',
    sourceLabel: 'REMARKS',
  },
]

const normalizeKitName = (value) => {
  const text = String(value || '').trim()
  return normalizeKey(text) === 'rescue rope' ? 'Rescue Rope' : text
}

const buildSeedRow = (kit, row = {}) => {
  const normalizedKit = normalizeKitName(kit || row.kit)
  const rowNumber = String(row.rowNumber || '').trim()
  const equipment = String(row.equipment || '').trim()
  const location = String(row.location || '').trim()
  const subLocation = String(row.subLocation || '').trim()
  const quantity = String(row.quantity || '').trim()

  return {
    id: `${slugSegment(normalizedKit)}:${rowNumber || slugSegment(equipment)}`,
    rowNumber,
    mainLocation: normalizedKit,
    location,
    subLocation,
    equipment,
    quantity,
  }
}

const buildKitDefinitions = () =>
  Object.entries(rawReference || {}).map(([kit, rows]) => {
    const normalizedKit = normalizeKitName(kit)
    const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) =>
      buildSeedRow(normalizedKit, row),
    )
    return {
      key: slugSegment(normalizedKit),
      title: normalizedKit,
      sourceLabel: normalizedKit,
      rows: normalizedRows,
      rowCount: normalizedRows.length,
    }
  })

export const HIGH_ANGLE_KIT_DEFINITIONS = buildKitDefinitions()

const kitDefinitionByTitle = new Map(
  HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => [normalizeKey(definition.title), definition]),
)

const rowIdsByKitKey = new Map(
  HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => [
    normalizeKey(definition.title),
    new Set(definition.rows.map((row) => row.id)),
  ]),
)

export const HIGH_ANGLE_REFERENCE = {
  sourceWorkbook: 'report-reference/VMM High Angle Rescue Equipment Inspection Checklist.xlsx',
  sourceSheet: 'Rescue Equipment - Kit',
  supportedMainLocations: HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => definition.title),
  sections: HIGH_ANGLE_REFERENCE_SECTIONS,
  kits: HIGH_ANGLE_KIT_DEFINITIONS,
}

export const isHighAngleInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE)

const normalizeHighAngleCondition = (value) => {
  const normalized = normalizeKey(value)
  const matched = HIGH_ANGLE_STATUS_OPTIONS.find(
    (option) => normalizeKey(option.value) === normalized,
  )
  return matched?.value || ''
}

const normalizeHighAngleCheck = (check = {}) => {
  if (!check || typeof check !== 'object') return null

  const mainLocation = normalizeKitName(
    check.mainLocation ||
      check.main_location ||
      check.kit ||
      check.selectedLocation ||
      check.location,
  )
  const equipment = String(check.equipment || check.title || check.name || '').trim()
  const rowNumber = String(check.rowNumber || check.row_number || '').trim()
  const location = String(check.location || '').trim()
  const subLocation = String(check.subLocation || check.sub_location || '').trim()
  const quantity = String(check.quantity || '').trim()

  if (!mainLocation && !equipment && !rowNumber) return null

  return {
    ...check,
    id:
      String(check.id || '').trim() ||
      `${slugSegment(mainLocation)}:${rowNumber || slugSegment(`${location} ${subLocation} ${equipment}`)}`,
    rowNumber,
    mainLocation,
    location,
    subLocation,
    equipment,
    quantity,
    condition: normalizeHighAngleCondition(check.condition),
    remarks: String(check.remarks || check.remark || '').trim(),
    conditionRemarks: String(
      check.conditionRemarks ||
        check.condition_remarks ||
        (normalizeHighAngleCondition(check.condition) === 'Not Good'
          ? check.remarks || check.remark || ''
          : ''),
    ).trim(),
    conditionPhotos: normalizePhotos(
      check.conditionPhotos || check.condition_photos || check.photos,
    ),
  }
}

export const normalizeHighAngleChecks = (checks) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((check) => {
    const normalized = normalizeHighAngleCheck(check)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

const resolveSelectedKit = (form = {}) =>
  normalizeKitName(
    form.mainLocation || form.main_location || form.selectedLocation || form.location || '',
  )

export const getHighAngleKitDefinition = (kit) =>
  kitDefinitionByTitle.get(normalizeKey(normalizeKitName(kit))) || null

const getHighAngleMergedRowsForKit = (form = {}, kit = '') => {
  const definition = getHighAngleKitDefinition(kit)
  if (!definition) return []

  const normalizedChecks = normalizeHighAngleChecks(form.highAngleChecks || form.high_angle_checks)
  const seededIds = rowIdsByKitKey.get(normalizeKey(definition.title)) || new Set()
  const checkById = new Map(normalizedChecks.map((row) => [row.id, row]))

  const seededRows = definition.rows.map((row) => ({
    ...row,
    ...(checkById.get(row.id) || {}),
    mainLocation: definition.title,
    location: String((checkById.get(row.id) || {}).location || row.location || '').trim(),
    subLocation: String((checkById.get(row.id) || {}).subLocation || row.subLocation || '').trim(),
    equipment: String((checkById.get(row.id) || {}).equipment || row.equipment || '').trim(),
    quantity: String((checkById.get(row.id) || {}).quantity || row.quantity || '').trim(),
    condition: normalizeHighAngleCondition((checkById.get(row.id) || {}).condition),
    remarks: String((checkById.get(row.id) || {}).remarks || '').trim(),
    conditionRemarks: String(
      (checkById.get(row.id) || {}).conditionRemarks ||
        ((checkById.get(row.id) || {}).condition === 'Not Good'
          ? (checkById.get(row.id) || {}).remarks
          : '') ||
        '',
    ).trim(),
    conditionPhotos: normalizePhotos((checkById.get(row.id) || {}).conditionPhotos),
    isWorkbookSeedRow: true,
    isExtensionRow: false,
  }))

  const extraRows = normalizedChecks
    .filter(
      (row) =>
        normalizeKey(row.mainLocation) === normalizeKey(definition.title) && !seededIds.has(row.id),
    )
    .map((row) => ({
      ...row,
      isWorkbookSeedRow: false,
      isExtensionRow: true,
    }))

  return [...seededRows, ...extraRows]
}

export const getHighAngleVisibleChecks = (form = {}) => {
  const kit = resolveSelectedKit(form)
  if (!kit) return []
  return getHighAngleMergedRowsForKit(form, kit)
}

const makeGroupKey = (row = {}) =>
  [String(row.location || '').trim(), String(row.subLocation || '').trim()].join('::')

export const formatHighAngleGroupLabel = (row = {}) => {
  const location = String(row.location || '').trim()
  const subLocation = String(row.subLocation || '').trim()
  const parts = []
  if (isMeaningfulValue(location)) parts.push(location)
  if (isMeaningfulValue(subLocation)) parts.push(subLocation)
  return parts.join(' - ') || 'General Kit Items'
}

const buildVisibleGroups = (rows = []) => {
  const groups = []
  const byKey = new Map()

  rows.forEach((row) => {
    const key = makeGroupKey(row)
    if (!byKey.has(key)) {
      const nextGroup = {
        key: key || `group-${groups.length + 1}`,
        title: formatHighAngleGroupLabel(row),
        location: String(row.location || '').trim(),
        subLocation: String(row.subLocation || '').trim(),
        rows: [],
      }
      byKey.set(key, nextGroup)
      groups.push(nextGroup)
    }
    byKey.get(key).rows.push(row)
  })

  return groups.map((group) => {
    const issueCount = group.rows.filter((row) => row.condition === 'Not Good').length
    const checkedCount = group.rows.filter((row) => row.condition).length
    return {
      ...group,
      issueCount,
      checkedCount,
    }
  })
}

export const getHighAngleCheckSummary = (form = {}) => {
  const selectedKit = resolveSelectedKit(form)
  const visibleChecks = getHighAngleVisibleChecks(form)
  const checkedCount = visibleChecks.filter((row) => row.condition).length
  const issueRows = visibleChecks.filter((row) => row.condition === 'Not Good')
  const incompleteRemarksCount = issueRows.filter(
    (row) => !String(row.conditionRemarks || row.remarks || '').trim(),
  ).length
  const incompletePhotoCount = issueRows.filter(
    (row) => normalizePhotos(row.conditionPhotos || row.photos).length === 0,
  ).length
  const retainedEvidenceCount = visibleChecks.filter((row) => {
    if (row.condition === 'Not Good') return false
    return (
      String(row.conditionRemarks || row.remarks || '').trim() ||
      normalizePhotos(row.conditionPhotos || row.photos).length > 0
    )
  }).length
  const visibleGroups = buildVisibleGroups(visibleChecks)
  const kitDefinition = getHighAngleKitDefinition(selectedKit)

  return {
    selectedKit,
    totalCount: visibleChecks.length,
    checkedCount,
    issueCount: issueRows.length,
    incompleteRemarksCount,
    incompletePhotoCount,
    retainedEvidenceCount,
    visibleChecks,
    visibleGroups,
    supportedKits: HIGH_ANGLE_REFERENCE.supportedMainLocations,
    sourceWorkbook: HIGH_ANGLE_REFERENCE.sourceWorkbook,
    rowCountByKit: Object.fromEntries(
      HIGH_ANGLE_KIT_DEFINITIONS.map((definition) => [definition.title, definition.rowCount]),
    ),
    selectedKitRowCount: kitDefinition?.rowCount || visibleChecks.length,
  }
}

export const getHighAngleRetainedEvidenceRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).filter((row) => {
    if (row.condition === 'Not Good') return false
    return (
      String(row.conditionRemarks || row.remarks || '').trim() ||
      normalizePhotos(row.conditionPhotos || row.photos).length > 0
    )
  })

export const getHighAngleMissingFields = (form = {}) => {
  const visibleChecks = getHighAngleVisibleChecks(form)
  const hasVisibleRows = visibleChecks.length > 0
  const hasIncompleteChecks = visibleChecks.some((row) => !String(row.condition || '').trim())
  const hasMissingRemarks = visibleChecks.some(
    (row) =>
      row.condition === 'Not Good' &&
      (!String(row.conditionRemarks || row.remarks || '').trim() ||
        normalizePhotos(row.conditionPhotos || row.photos).length === 0),
  )

  return {
    highAngleSession: false,
    highAngleChecks: !hasVisibleRows || hasIncompleteChecks,
    highAngleRemarks: hasMissingRemarks,
  }
}

const makeChecklistId = (label) =>
  `${slugSegment(HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE)}:${slugSegment(label)}`

export const buildHighAngleChecklist = (form = {}) => {
  const summary = getHighAngleCheckSummary(form)
  const inspectedBy = String(form.highAngleInspectedBy || form.high_angle_inspected_by || '').trim()
  const inspectionDate = String(
    form.highAngleInspectionDate || form.high_angle_inspection_date || '',
  ).trim()

  if (!summary.selectedKit) return []

  const items = []
  if (summary.totalCount > 0 && summary.checkedCount === summary.totalCount) {
    const label = `${summary.selectedKit} - ${summary.totalCount} item${summary.totalCount === 1 ? '' : 's'} checked`
    items.push({
      id: makeChecklistId(label),
      label,
      inspectionType: HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
      selected: true,
      selectedAt: inspectionDate || '',
      inspectedBy,
    })
  }

  summary.visibleChecks
    .filter((row) => row.condition === 'Not Good')
    .forEach((row) => {
      const label = `${summary.selectedKit} - ${row.equipment}: Not Good`
      items.push({
        id: makeChecklistId(`${summary.selectedKit} ${row.rowNumber} ${row.equipment} not good`),
        label,
        inspectionType: HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
        selected: true,
        selectedAt: inspectionDate || '',
      })
    })

  return items
}

export const buildHighAngleDescription = (form = {}) => {
  const summary = getHighAngleCheckSummary(form)
  const inspectedBy = String(form.highAngleInspectedBy || form.high_angle_inspected_by || '').trim()
  const inspectionDate = String(
    form.highAngleInspectionDate || form.high_angle_inspection_date || '',
  ).trim()

  if (!summary.selectedKit) return ''

  const lines = [
    `High Angle rescue equipment checked for ${summary.selectedKit}${inspectedBy ? ` by ${inspectedBy}` : ''}${inspectionDate ? ` on ${inspectionDate}` : ''}.`,
    `Total item rows: ${summary.totalCount}.`,
    summary.issueCount > 0 ? `Issue row(s): ${summary.issueCount}.` : 'No issue rows recorded.',
  ]

  summary.visibleChecks
    .filter((row) => row.condition === 'Not Good')
    .forEach((row) => {
      const parts = [`Row ${row.rowNumber || '--'} ${row.equipment || 'Equipment'}`]
      if (String(row.quantity || '').trim()) parts.push(`qty ${row.quantity}`)
      const groupLabel = formatHighAngleGroupLabel(row)
      if (groupLabel && groupLabel !== 'General Kit Items') parts.push(groupLabel)
      const remarks = String(row.conditionRemarks || row.remarks || '').trim()
      const detail = remarks ? `${parts.join(' - ')}: ${remarks}` : `${parts.join(' - ')}.`
      lines.push(detail)
    })

  return lines.join(' ')
}
