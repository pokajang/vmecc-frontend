import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'

export const ER_AUX_EQUIPMENT_INSPECTION_TYPE = 'ER Aux Equipment Inspection'

export const ER_AUX_CONDITION_OPTIONS = [
  { value: 'OK', label: 'OK' },
  { value: 'Defect', label: 'Defect' },
  { value: 'Missing', label: 'Missing' },
  { value: 'N/A', label: 'N/A' },
]

const ER_AUX_EQUIPMENT_ROWS = [
  ['Store', 'Fire Jacket', '15'],
  ['Store', 'Fire Pant', '15'],
  ['Store', 'Fire Boot', '15'],
  ['Store', 'Fire glove', '15'],
  ['Store', 'Fire hood', '15'],
  ['Store', 'Fire helmet', '2'],
  ['Store', 'Foldable Stretcher', '6'],
  ['Store', 'Basket Stretcher', '2'],
  ['Store', 'Rollable Stretcher', '1'],
  ['Store', 'Life Jacket', '10'],
  ['Store', 'Gotcha Rope Set', '1'],
  ['Store', '8inch steel Valve keys', '6'],
  ['Store', '17.5inch steel Valve keys', '3'],
  ['Store', 'Bag a snake', '2'],
  ['Store', '120CM Foldable Snake Catcher', '2'],
  ['Store', 'Telescopic Snake Hook', '2'],
  ['Store', 'Chainsaw', '1'],
  ['Store', 'Firemans axe', '1'],
  ['Store', 'Fire hydrant key', '3'],
  ['Store', 'Hydrant key & Bar', '2'],
  ['Store', 'High Elevation Fire Monitor', '1'],
  ['Store', 'CS Rescue Tripod', '2'],
  ['Store', 'Controlled Dividing Breeching', '4'],
  ['Store', 'Collecting Breeching', '2'],
  ['Store', 'Jet Nozzle Complete with Branch pipe', '3'],
  ['Store', 'Animal catcher net', '3'],
  ['Office', 'Radio Tetra', '7'],
  ['Office', 'Radio VHF', '5'],
  ['Office', 'Mobile Radio', '1'],
  ['Office', 'Hydrant flow test kit', '1'],
  ['Office', 'Hydrant static pressure tester', '1'],
]

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

export const isErAuxInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(ER_AUX_EQUIPMENT_INSPECTION_TYPE)

const normalizeCondition = (value) => {
  const text = String(value || '').trim()
  const option = ER_AUX_CONDITION_OPTIONS.find(
    (row) => row.value.toLowerCase() === text.toLowerCase(),
  )
  return option?.value || ''
}

const toBaseErAuxRow = (item = {}) => {
  const location = String(item.location || item.mainLocation || item.main_location || '').trim()
  const equipment = String(item.equipment || item.title || item.name || '').trim()
  if (!equipment) return null
  const equipmentId =
    item.equipmentId ??
    item.equipment_id ??
    item.equipmentCatalogId ??
    item.equipment_catalog_id ??
    ''
  const equipmentKey =
    String(item.equipmentKey || item.equipment_key || '').trim() || slugSegment(equipment)
  const equipmentSource =
    String(item.equipmentSource || item.equipment_source || '').trim() || 'seed'
  const stableSeedId = `${slugSegment(location)}:${equipmentKey}`

  return {
    id: String(
      equipmentSource === 'seed' ? stableSeedId : item.id || equipmentId || stableSeedId,
    ).trim(),
    location,
    mainLocation: String(item.mainLocation || item.main_location || location).trim(),
    equipment,
    equipmentId,
    equipmentKey,
    equipmentSource,
    equipmentDescription: String(
      item.equipmentDescription || item.equipment_description || item.description || '',
    ).trim(),
    defaultQuantity: String(
      item.defaultQuantity || item.default_quantity || item.quantity || '',
    ).trim(),
    isCustomEquipment:
      item.isCustomEquipment === true ||
      item.is_custom_equipment === true ||
      equipmentSource === 'custom',
    canEdit: item.canEdit === true || (item.canEdit !== false && equipmentSource !== 'seed'),
    canDelete: item.canDelete === true || (item.canDelete !== false && equipmentSource !== 'seed'),
  }
}

const normalizeErAuxCheck = (item = {}) => {
  const base = toBaseErAuxRow(item)
  if (!base) return null

  return {
    ...base,
    quantity: String(item.quantity || item.qty || base.defaultQuantity || '').trim(),
    condition: normalizeCondition(item.condition),
    remarks: String(item.remarks || item.remark || '').trim(),
    photos: normalizePhotos(item.photos),
  }
}

export const normalizeErAuxChecks = (checks) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((item) => {
    const normalized = normalizeErAuxCheck(item)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const normalizeErAuxEquipmentRows = (rows) => {
  const byId = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach((item) => {
    const normalized = toBaseErAuxRow(item)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const getErAuxEquipmentRowsForLocation = (mainLocation = '') =>
  ER_AUX_EQUIPMENT_ROWS.filter(
    ([location]) => normalizeKey(location) === normalizeKey(mainLocation),
  ).map(([location, equipment, quantity]) => ({
    id: `${slugSegment(location)}:${slugSegment(equipment)}`,
    location,
    mainLocation: location,
    equipment,
    equipmentId: '',
    equipmentKey: slugSegment(equipment),
    equipmentSource: 'seed',
    equipmentDescription: '',
    defaultQuantity: quantity,
    isCustomEquipment: false,
    canEdit: false,
    canDelete: false,
  }))

const getChecksById = (checks) => {
  const byId = new Map()
  normalizeErAuxChecks(checks).forEach((item) => byId.set(item.id, item))
  return byId
}

const getMainLocation = (form = {}) =>
  String(form.mainLocation || form.main_location || form.selectedLocation || form.location || '')
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)[0] || ''

export const getErAuxVisibleChecks = (form = {}) => {
  const mainLocation = getMainLocation(form)
  const catalogRows = normalizeErAuxEquipmentRows(
    form?.erAuxEquipmentRows || form?.er_aux_equipment_rows,
  ).filter((row) => normalizeKey(row.location || row.mainLocation) === normalizeKey(mainLocation))
  const rows = catalogRows.length > 0 ? catalogRows : getErAuxEquipmentRowsForLocation(mainLocation)
  const byId = getChecksById(form?.erAuxChecks || form?.er_aux_checks)

  const visible = rows.map((row) => {
    const check = byId.get(row.id) || {}
    return {
      ...row,
      ...check,
      id: row.id,
      location: row.location,
      mainLocation: row.mainLocation || row.location,
      equipment: row.equipment,
      equipmentId: check.equipmentId || row.equipmentId,
      equipmentKey: check.equipmentKey || row.equipmentKey,
      equipmentSource: check.equipmentSource || row.equipmentSource,
      equipmentDescription: check.equipmentDescription || row.equipmentDescription || '',
      defaultQuantity: check.defaultQuantity || row.defaultQuantity || '',
      quantity: String(check.quantity || row.defaultQuantity || '').trim(),
      isCustomEquipment: check.isCustomEquipment || row.isCustomEquipment,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
      condition: normalizeCondition(check.condition),
      remarks: String(check.remarks || '').trim(),
      photos: normalizePhotos(check.photos),
    }
  })

  byId.forEach((check) => {
    if (
      normalizeKey(check.location || check.mainLocation) === normalizeKey(mainLocation) &&
      !visible.some((row) => row.id === check.id)
    ) {
      visible.push(check)
    }
  })

  return visible
}

const isIssueCondition = (value) => ['Defect', 'Missing', 'N/A'].includes(normalizeCondition(value))

const isErAuxRowComplete = (check = {}) =>
  String(check.quantity || '').trim() && String(check.condition || '').trim()

export const getErAuxCheckSummary = (form = {}) => {
  const visibleChecks = getErAuxVisibleChecks(form)
  const checkedCount = visibleChecks.filter(isErAuxRowComplete).length
  const issueCount = visibleChecks.filter((check) => isIssueCondition(check.condition)).length
  const incompleteRemarksCount = visibleChecks.filter(
    (check) => isIssueCondition(check.condition) && !String(check.remarks || '').trim(),
  ).length

  return {
    totalCount: visibleChecks.length,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
    visibleChecks,
  }
}

export const getErAuxMissingFields = (form = {}) => {
  const { visibleChecks } = getErAuxCheckSummary(form)
  const inspectedBy = String(form.erAuxInspectedBy || form.er_aux_inspected_by || '').trim()
  const inspectionDate = String(
    form.erAuxInspectionDate || form.er_aux_inspection_date || '',
  ).trim()

  return {
    erAuxSession: !inspectedBy || !inspectionDate,
    erAuxChecks:
      visibleChecks.length === 0 || visibleChecks.some((check) => !isErAuxRowComplete(check)),
    erAuxRemarks: visibleChecks.some(
      (check) => isIssueCondition(check.condition) && !String(check.remarks || '').trim(),
    ),
  }
}

export const buildErAuxChecklist = (form = {}) => {
  const inspectionType = String(form.inspectionType || ER_AUX_EQUIPMENT_INSPECTION_TYPE).trim()

  return getErAuxVisibleChecks(form)
    .map((check) => {
      const condition = normalizeCondition(check.condition)
      const quantity = String(check.quantity || '').trim()
      if (!condition || !quantity) return null
      return {
        id: `${slugSegment(inspectionType)}:${slugSegment(check.equipment)}:${slugSegment(condition)}`,
        label: `${check.equipment} - Qty ${quantity}: ${condition}`,
        inspectionType,
        selected: true,
        selectedAt: '',
      }
    })
    .filter(Boolean)
}

export const buildErAuxDescription = (form = {}) => {
  const location = String(form.location || form.selectedLocation || getMainLocation(form)).trim()
  const inspectedBy = String(form.erAuxInspectedBy || form.er_aux_inspected_by || '').trim()
  const inspectionDate = String(
    form.erAuxInspectionDate || form.er_aux_inspection_date || '',
  ).trim()
  const { totalCount, issueCount, visibleChecks } = getErAuxCheckSummary(form)
  const issueRows = visibleChecks
    .filter((check) => isIssueCondition(check.condition))
    .map((check) => {
      const quantity = String(check.quantity || '').trim()
      const remarks = String(check.remarks || '').trim()
      return `- ${check.equipment} (qty ${quantity}) - ${check.condition}${remarks ? `: ${remarks}` : ''}`
    })

  const headerParts = [`ER Aux equipment checked${location ? ` at ${location}` : ''}`]
  if (inspectedBy) headerParts.push(`by ${inspectedBy}`)
  if (inspectionDate) headerParts.push(`on ${inspectionDate}`)
  const header = `${headerParts.join(' ')}.`

  if (issueRows.length > 0) {
    return [header, `Issue item(s): ${issueCount}.`, ...issueRows].join('\n')
  }

  return `${header} ${totalCount} equipment item(s) recorded with no issue condition.`
}
