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

const isKnownStaticErAuxRow = (location, equipment) =>
  ER_AUX_EQUIPMENT_ROWS.some(
    ([rowLocation, rowEquipment]) =>
      normalizeKey(rowLocation) === normalizeKey(location) &&
      normalizeKey(rowEquipment) === normalizeKey(equipment),
  )

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

const hasOwn = (item, key) => Object.prototype.hasOwnProperty.call(item || {}, key)

const resolveQuantity = (item = {}, fallback = '') => {
  const value = hasOwn(item, 'quantity') ? item.quantity : hasOwn(item, 'qty') ? item.qty : fallback
  return String(value ?? '').trim()
}

export const isErAuxInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(ER_AUX_EQUIPMENT_INSPECTION_TYPE)

const normalizeCondition = (value) => {
  const text = String(value || '').trim()
  const option = ER_AUX_CONDITION_OPTIONS.find(
    (row) => row.value.toLowerCase() === text.toLowerCase(),
  )
  return option?.value || ''
}

const resolveErAuxRemarkFields = (item = {}, condition = '') => {
  const normalizedCondition = normalizeCondition(condition || item.condition)
  const legacyRemarks = String(item.remarks || item.remark || '')
  const hasDefectRemarks = hasOwn(item, 'defectRemarks') || hasOwn(item, 'defect_remarks')
  const hasAdditionalNotes = hasOwn(item, 'additionalNotes') || hasOwn(item, 'additional_notes')
  const defectRemarks = String(item.defectRemarks ?? item.defect_remarks ?? '')
  const additionalNotes = String(item.additionalNotes ?? item.additional_notes ?? '')

  return {
    defectRemarks: hasDefectRemarks
      ? defectRemarks
      : normalizedCondition === 'Defect' && !hasAdditionalNotes
        ? legacyRemarks
        : '',
    additionalNotes: hasAdditionalNotes
      ? additionalNotes
      : normalizedCondition !== 'Defect'
        ? legacyRemarks
        : '',
  }
}

const resolveErAuxPhotoFields = (item = {}, condition = '') => {
  const normalizedCondition = normalizeCondition(condition || item.condition)
  const hasDefectPhotos = hasOwn(item, 'defectPhotos') || hasOwn(item, 'defect_photos')
  const additionalPhotos = normalizePhotos(item.photos)
  const defectPhotos = hasDefectPhotos
    ? normalizePhotos(item.defectPhotos ?? item.defect_photos)
    : normalizedCondition === 'Defect'
      ? additionalPhotos
      : []

  return {
    defectPhotos,
    photos: hasDefectPhotos || normalizedCondition !== 'Defect' ? additionalPhotos : [],
  }
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
  const hasEquipmentId = String(equipmentId || '').trim() !== ''
  const isLocalSeedEquipment =
    item.isLocalSeedEquipment === true ||
    item.is_local_seed_equipment === true ||
    (!hasEquipmentId &&
      equipmentSource === 'seed' &&
      isKnownStaticErAuxRow(location || item.mainLocation || item.main_location, equipment))

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
      item.defaultQuantity ?? item.default_quantity ?? item.quantity ?? '',
    ).trim(),
    isCustomEquipment:
      item.isCustomEquipment === true ||
      item.is_custom_equipment === true ||
      equipmentSource === 'custom',
    isLocalSeedEquipment,
    canEdit:
      item.canEdit === true ||
      (item.canEdit !== false && (equipmentSource !== 'seed' || isLocalSeedEquipment)),
    canDelete:
      item.canDelete === true ||
      (item.canDelete !== false && (equipmentSource !== 'seed' || isLocalSeedEquipment)),
  }
}

const normalizeErAuxCheck = (item = {}) => {
  const base = toBaseErAuxRow(item)
  if (!base) return null
  const condition = normalizeCondition(item.condition)
  const { defectRemarks, additionalNotes } = resolveErAuxRemarkFields(item, condition)
  const { defectPhotos, photos } = resolveErAuxPhotoFields(item, condition)

  return {
    ...base,
    quantity: resolveQuantity(item, base.defaultQuantity || ''),
    condition,
    remarks: String(item.remarks || item.remark || ''),
    defectRemarks,
    additionalNotes,
    defectPhotos,
    photos,
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
    isLocalSeedEquipment: true,
    canEdit: true,
    canDelete: true,
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

const getErAuxRowMergeKey = (row = {}) =>
  `${normalizeKey(row.location || row.mainLocation)}:${normalizeKey(row.equipment)}`

const mergeErAuxSeedAndCatalogRows = (seedRows = [], catalogRows = []) => {
  const byKey = new Map()
  const keyById = new Map()
  const orderedKeys = []

  seedRows.forEach((row) => {
    const key = getErAuxRowMergeKey(row)
    if (!key || byKey.has(key)) return
    byKey.set(key, row)
    if (row.id) keyById.set(String(row.id), key)
    orderedKeys.push(key)
  })

  catalogRows.forEach((row) => {
    const rowId = String(row.id || '').trim()
    const key = rowId && keyById.has(rowId) ? keyById.get(rowId) : getErAuxRowMergeKey(row)
    if (!key) return
    const existing = byKey.get(key)
    if (!existing) orderedKeys.push(key)
    byKey.set(key, existing ? { ...existing, ...row } : row)
    if (rowId) keyById.set(rowId, key)
  })

  return orderedKeys.map((key) => byKey.get(key)).filter(Boolean)
}

export const getErAuxVisibleChecks = (form = {}) => {
  const mainLocation = getMainLocation(form)
  const catalogRows = normalizeErAuxEquipmentRows(
    form?.erAuxEquipmentRows || form?.er_aux_equipment_rows,
  ).filter((row) => normalizeKey(row.location || row.mainLocation) === normalizeKey(mainLocation))
  const rows = mergeErAuxSeedAndCatalogRows(
    getErAuxEquipmentRowsForLocation(mainLocation),
    catalogRows,
  )
  const byId = getChecksById(form?.erAuxChecks || form?.er_aux_checks)

  const visible = rows.map((row) => {
    const check = byId.get(row.id) || {}
    const condition = normalizeCondition(check.condition)
    const { defectRemarks, additionalNotes } = resolveErAuxRemarkFields(check, condition)
    const { defectPhotos, photos } = resolveErAuxPhotoFields(check, condition)
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
      quantity: resolveQuantity(check, row.defaultQuantity || ''),
      isCustomEquipment: check.isCustomEquipment || row.isCustomEquipment,
      isLocalSeedEquipment: check.isLocalSeedEquipment || row.isLocalSeedEquipment,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
      condition,
      remarks: String(check.remarks || ''),
      defectRemarks,
      additionalNotes,
      defectPhotos,
      photos,
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
const isDefectCondition = (value) => normalizeCondition(value) === 'Defect'

const isErAuxRowComplete = (check = {}) =>
  String(check.quantity ?? '').trim() && String(check.condition || '').trim()

const getErAuxMissingCheckLabels = (check = {}) => [
  ...(!String(check.quantity ?? '').trim() ? ['quantity'] : []),
  ...(!String(check.condition || '').trim() ? ['condition'] : []),
]

const getErAuxMissingEvidenceLabels = (check = {}) => {
  if (!isDefectCondition(check.condition)) return []
  return [
    ...(!String(check.defectRemarks || '').trim() ? ['defect remarks'] : []),
    ...(!Array.isArray(check.defectPhotos) || check.defectPhotos.length === 0
      ? ['defect photo']
      : []),
  ]
}

const getErAuxFirstMissingDetailKey = (labels = []) => {
  if (labels.includes('quantity')) return 'quantity'
  if (labels.includes('condition')) return 'condition'
  if (labels.includes('defect remarks')) return 'defectRemarks'
  if (labels.includes('defect photo')) return 'defectPhotos'
  return ''
}

export const getErAuxValidationDetails = (form = {}) => {
  const visibleChecks = getErAuxVisibleChecks(form)
  const incompleteCheckDetails = visibleChecks
    .map((check) => {
      const missing = getErAuxMissingCheckLabels(check)
      if (missing.length === 0) return null
      return {
        id: check.id,
        equipment: check.equipment,
        missing,
        detailKey: getErAuxFirstMissingDetailKey(missing),
      }
    })
    .filter(Boolean)
  const incompleteEvidenceDetails = visibleChecks
    .map((check) => {
      const missing = getErAuxMissingEvidenceLabels(check)
      if (missing.length === 0) return null
      return {
        id: check.id,
        equipment: check.equipment,
        missing,
        detailKey: getErAuxFirstMissingDetailKey(missing),
      }
    })
    .filter(Boolean)
  const firstDetail = incompleteCheckDetails[0] || incompleteEvidenceDetails[0] || null

  return {
    incompleteCheckDetails,
    incompleteEvidenceDetails,
    firstTarget: firstDetail
      ? {
          field: incompleteCheckDetails[0] ? 'erAuxChecks' : 'erAuxRemarks',
          rowId: firstDetail.id,
          detailKey: firstDetail.detailKey,
        }
      : null,
    errorCount: incompleteCheckDetails.length + incompleteEvidenceDetails.length,
  }
}

export const getErAuxCheckSummary = (form = {}) => {
  const visibleChecks = getErAuxVisibleChecks(form)
  const checkedCount = visibleChecks.filter(isErAuxRowComplete).length
  const issueCount = visibleChecks.filter((check) => isIssueCondition(check.condition)).length
  const incompleteRemarksCount = visibleChecks.filter(
    (check) => isDefectCondition(check.condition) && !String(check.defectRemarks || '').trim(),
  ).length
  const incompletePhotoCount = visibleChecks.filter((check) => {
    if (!isDefectCondition(check.condition)) return false
    const photos = Array.isArray(check.defectPhotos) ? check.defectPhotos : []
    return photos.length === 0
  }).length
  const validationDetails = getErAuxValidationDetails({ ...form, erAuxChecks: visibleChecks })

  return {
    totalCount: visibleChecks.length,
    checkedCount,
    issueCount,
    incompleteRemarksCount,
    incompletePhotoCount,
    incompleteCheckDetails: validationDetails.incompleteCheckDetails,
    incompleteEvidenceDetails: validationDetails.incompleteEvidenceDetails,
    visibleChecks,
  }
}

export const getErAuxMissingFields = (form = {}) => {
  const { visibleChecks } = getErAuxCheckSummary(form)

  return {
    erAuxSession: false,
    erAuxChecks:
      visibleChecks.length === 0 || visibleChecks.some((check) => !isErAuxRowComplete(check)),
    erAuxRemarks: visibleChecks.some(
      (check) =>
        isDefectCondition(check.condition) &&
        (!String(check.defectRemarks || '').trim() ||
          !Array.isArray(check.defectPhotos) ||
          check.defectPhotos.length === 0),
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
      const isDefect = isDefectCondition(check.condition)
      const remarks = String((isDefect ? check.defectRemarks : check.additionalNotes) || '').trim()
      return `- ${check.equipment} (qty ${quantity}) - ${check.condition}${remarks ? `: ${remarks}` : ''}`
    })

  const headerParts = [
    `Emergency Response Auxiliary Equipment checked${location ? ` at ${location}` : ''}`,
  ]
  if (inspectedBy) headerParts.push(`by ${inspectedBy}`)
  if (inspectionDate) headerParts.push(`on ${inspectionDate}`)
  const header = `${headerParts.join(' ')}.`

  if (issueRows.length > 0) {
    return [header, `Issue item(s): ${issueCount}.`, ...issueRows].join('\n')
  }

  return `${header} ${totalCount} equipment item(s) recorded with no issue condition.`
}
