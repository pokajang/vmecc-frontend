import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'

export const HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE = 'Hydraulic Rescue Tools Inspection'

export const HYDRAULIC_CHECK_STATUS_OPTIONS = [
  { value: 'OK', label: 'OK' },
  { value: 'Defect', label: 'Defect' },
  { value: 'N/A', label: 'N/A' },
]

export const HYDRAULIC_CHECK_FIELDS = [
  {
    key: 'physicalCondition',
    label: 'Physical Condition',
    remarksKey: 'physicalConditionRemarks',
    photosKey: 'physicalConditionPhotos',
  },
  {
    key: 'mechanicalCondition',
    label: 'Mechanical Condition',
    remarksKey: 'mechanicalConditionRemarks',
    photosKey: 'mechanicalConditionPhotos',
  },
  {
    key: 'noLeakage',
    label: 'No Leakage',
    remarksKey: 'noLeakageRemarks',
    photosKey: 'noLeakagePhotos',
  },
  {
    key: 'functionTest',
    label: 'Function Test',
    remarksKey: 'functionTestRemarks',
    photosKey: 'functionTestPhotos',
  },
]

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugSegment = (value) =>
  normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const HYDRAULIC_EQUIPMENT_ROWS = [
  {
    location: 'FRT',
    equipment: [
      'Hydraulic Pump Motor 1',
      'Hydraulic Hose 1',
      'Hydraulic Spreader 1',
      'Hydraulic Cutter 1',
      'Hydraulic Combi 1',
      'Hydraulic Cylinder Ramp 1',
    ],
  },
  {
    location: 'Store',
    equipment: [
      'Hydraulic Pump Motor 2',
      'Hydraulic Hose 2',
      'Hydraulic Spreader 2',
      'Hydraulic Cutter 2',
      'Hydraulic Combi 2',
      'Hydraulic Cylinder Ramp 2',
    ],
  },
].flatMap((group) =>
  group.equipment.map((equipment) => ({
    id: `${slugSegment(group.location)}:${slugSegment(equipment)}`,
    location: group.location,
    mainLocation: group.location,
    equipment,
    equipmentKey: slugSegment(equipment),
    equipmentSource: 'seed',
    isCustomEquipment: false,
    canEdit: false,
    canDelete: false,
  })),
)

const toSnakeKey = (value) =>
  String(value || '')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase()

const normalizePhotos = (photos) =>
  dedupePhotos(
    (Array.isArray(photos) ? photos : []).filter(
      (photo) => photo && typeof photo === 'object' && String(photo.url || '').trim(),
    ),
  )

const splitLegacyInspectionLocation = (value) => {
  const text = String(value || '').trim()
  if (!text) return { mainLocation: '', subLocation: '' }
  const parts = text
    .split(/\s*>\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    mainLocation: parts[0] || text,
    subLocation: parts.slice(1).join(' > '),
  }
}

const formatInspectionLocation = ({ mainLocation = '', subLocation = '' } = {}) => {
  const main = String(mainLocation || '').trim()
  const sub = String(subLocation || '').trim()
  return [main, sub].filter(Boolean).join(' > ')
}

const normalizeInspectionLocation = (source = {}) => {
  const directMain = String(source?.mainLocation || source?.main_location || '').trim()
  const directSub = String(source?.subLocation || source?.sub_location || '').trim()
  if (directMain || directSub) {
    return {
      mainLocation: directMain,
      subLocation: directSub,
      location: formatInspectionLocation({ mainLocation: directMain, subLocation: directSub }),
    }
  }

  const path = Array.isArray(source?.locationPath)
    ? source.locationPath
    : Array.isArray(source?.location_path)
      ? source.location_path
      : []
  const pathMain = String(path[0] || '').trim()
  const pathSub = String(path[1] || '').trim()
  if (pathMain || pathSub) {
    return {
      mainLocation: pathMain,
      subLocation: pathSub,
      location: formatInspectionLocation({ mainLocation: pathMain, subLocation: pathSub }),
    }
  }

  const legacy = String(
    source?.selectedLocation || source?.location || source?.location_name || '',
  ).trim()
  const split = splitLegacyInspectionLocation(legacy)
  return {
    ...split,
    location: formatInspectionLocation(split),
  }
}

const makeInspectionChecklistId = (inspectionType, label) =>
  `${slugSegment(inspectionType) || 'generic'}:${slugSegment(label)}`

export const isHydraulicInspectionType = (inspectionType) =>
  normalizeKey(inspectionType) === normalizeKey(HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE)

const normalizeHydraulicStatus = (value) => {
  const text = String(value || '').trim()
  const option = HYDRAULIC_CHECK_STATUS_OPTIONS.find(
    (row) => row.value.toLowerCase() === text.toLowerCase(),
  )
  return option?.value || ''
}

const normalizeHydraulicCheck = (item = {}) => {
  if (!item || typeof item !== 'object') return null
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
  const equipmentDescription = String(
    item.equipmentDescription || item.equipment_description || item.description || '',
  ).trim()
  const stableSeedId = `${slugSegment(location)}:${equipmentKey}`
  const id = String(
    equipmentSource === 'seed' ? stableSeedId : item.id || equipmentId || stableSeedId,
  ).trim()
  const fieldEvidence = HYDRAULIC_CHECK_FIELDS.reduce((next, field) => {
    const snakeRemarksKey = toSnakeKey(field.remarksKey)
    const snakePhotosKey = toSnakeKey(field.photosKey)
    next[field.remarksKey] = String(item[field.remarksKey] || item[snakeRemarksKey] || '').trim()
    next[field.photosKey] = normalizePhotos(item[field.photosKey] || item[snakePhotosKey])
    return next
  }, {})

  return {
    id,
    location,
    mainLocation: String(item.mainLocation || item.main_location || location).trim(),
    equipment,
    equipmentId,
    equipmentKey,
    equipmentSource,
    equipmentDescription,
    isCustomEquipment:
      item.isCustomEquipment === true ||
      item.is_custom_equipment === true ||
      equipmentSource === 'custom',
    canEdit: item.canEdit === true || (item.canEdit !== false && equipmentSource !== 'seed'),
    canDelete: item.canDelete === true || (item.canDelete !== false && equipmentSource !== 'seed'),
    physicalCondition: normalizeHydraulicStatus(item.physicalCondition || item.physical_condition),
    mechanicalCondition: normalizeHydraulicStatus(
      item.mechanicalCondition || item.mechanical_condition,
    ),
    noLeakage: normalizeHydraulicStatus(item.noLeakage || item.no_leakage),
    functionTest: normalizeHydraulicStatus(item.functionTest || item.function_test),
    remarks: String(item.remarks || item.remark || item.defects || '').trim(),
    photos: normalizePhotos(item.photos),
    ...fieldEvidence,
  }
}

export const normalizeHydraulicChecks = (checks) => {
  const byId = new Map()
  ;(Array.isArray(checks) ? checks : []).forEach((item) => {
    const normalized = normalizeHydraulicCheck(item)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const normalizeHydraulicEquipmentRows = (rows) => {
  const byId = new Map()
  ;(Array.isArray(rows) ? rows : []).forEach((item) => {
    const normalized = normalizeHydraulicCheck(item)
    if (!normalized) return
    byId.set(normalized.id, {
      id: normalized.id,
      location: normalized.location || normalized.mainLocation,
      mainLocation: normalized.mainLocation || normalized.location,
      equipment: normalized.equipment,
      equipmentId: normalized.equipmentId,
      equipmentKey: normalized.equipmentKey,
      equipmentSource: normalized.equipmentSource,
      equipmentDescription: normalized.equipmentDescription,
      isCustomEquipment: normalized.isCustomEquipment,
      canEdit: normalized.canEdit,
      canDelete: normalized.canDelete,
      description: String(item.description || ''),
    })
  })
  return Array.from(byId.values())
}

export const getHydraulicEquipmentRowsForLocation = (mainLocation = '') => {
  const locationKey = normalizeKey(mainLocation)
  if (!locationKey) return []
  return HYDRAULIC_EQUIPMENT_ROWS.filter((row) => normalizeKey(row.location) === locationKey)
}

const getHydraulicChecksById = (checks) => {
  const byId = new Map()
  normalizeHydraulicChecks(checks).forEach((item) => byId.set(item.id, item))
  return byId
}

export const getHydraulicVisibleChecks = (form = {}) => {
  const location = normalizeInspectionLocation(form)
  const catalogRows = normalizeHydraulicEquipmentRows(
    form?.hydraulicEquipmentRows || form?.hydraulic_equipment_rows,
  ).filter(
    (row) => normalizeKey(row.location || row.mainLocation) === normalizeKey(location.mainLocation),
  )
  const rows =
    catalogRows.length > 0
      ? catalogRows
      : getHydraulicEquipmentRowsForLocation(location.mainLocation)
  const byId = getHydraulicChecksById(form?.hydraulicChecks || form?.hydraulic_checks)
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
      equipmentDescription:
        check.equipmentDescription || row.equipmentDescription || row.description || '',
      isCustomEquipment: check.isCustomEquipment || row.isCustomEquipment,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
    }
  })
  byId.forEach((check) => {
    if (
      normalizeKey(check.location || check.mainLocation) === normalizeKey(location.mainLocation) &&
      !visible.some((row) => row.id === check.id)
    ) {
      visible.push(check)
    }
  })
  return visible
}

const isHydraulicCheckComplete = (check = {}) =>
  HYDRAULIC_CHECK_FIELDS.every((field) => String(check?.[field.key] || '').trim())

const getHydraulicDefectFields = (check = {}) =>
  HYDRAULIC_CHECK_FIELDS.filter(
    (field) => normalizeHydraulicStatus(check?.[field.key]) === 'Defect',
  )

const getHydraulicNaFields = (check = {}) =>
  HYDRAULIC_CHECK_FIELDS.filter((field) => normalizeHydraulicStatus(check?.[field.key]) === 'N/A')

const getHydraulicIncompleteDefectEvidenceCount = (check = {}) =>
  getHydraulicDefectFields(check).filter(
    (field) =>
      !String(check?.[field.remarksKey] || '').trim() ||
      normalizePhotos(check?.[field.photosKey]).length === 0,
  ).length

const getHydraulicIncompleteNaReasonCount = (check = {}) =>
  getHydraulicNaFields(check).filter((field) => !String(check?.[field.remarksKey] || '').trim())
    .length

export const getHydraulicCheckSummary = (form = {}) => {
  const visibleChecks = getHydraulicVisibleChecks(form)
  const checkedCount = visibleChecks.filter(isHydraulicCheckComplete).length
  const defectCount = visibleChecks.reduce(
    (count, check) => count + getHydraulicDefectFields(check).length,
    0,
  )
  const naCount = visibleChecks.reduce(
    (count, check) => count + getHydraulicNaFields(check).length,
    0,
  )
  const incompleteDefectEvidenceCount = visibleChecks.reduce(
    (count, check) => count + getHydraulicIncompleteDefectEvidenceCount(check),
    0,
  )
  const incompleteNaReasonCount = visibleChecks.reduce(
    (count, check) => count + getHydraulicIncompleteNaReasonCount(check),
    0,
  )
  return {
    totalCount: visibleChecks.length,
    checkedCount,
    defectCount,
    naCount,
    incompleteDefectEvidenceCount,
    incompleteNaReasonCount,
    visibleChecks,
  }
}

export const getHydraulicMissingFields = (form = {}) => {
  const { visibleChecks } = getHydraulicCheckSummary(form)
  const hasVisibleEquipment = visibleChecks.length > 0
  const hasIncompleteChecks = visibleChecks.some((check) => !isHydraulicCheckComplete(check))
  const hasIncompleteDefectEvidence = visibleChecks.some(
    (check) => getHydraulicIncompleteDefectEvidenceCount(check) > 0,
  )
  const hasIncompleteNaReason = visibleChecks.some(
    (check) => getHydraulicIncompleteNaReasonCount(check) > 0,
  )
  return {
    hydraulicChecks: !hasVisibleEquipment || hasIncompleteChecks,
    hydraulicRemarks: hasIncompleteDefectEvidence || hasIncompleteNaReason,
  }
}

export const buildHydraulicChecklist = (form = {}) => {
  const inspectionType = String(
    form.inspectionType || HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE,
  ).trim()
  return getHydraulicVisibleChecks(form)
    .flatMap((check) =>
      HYDRAULIC_CHECK_FIELDS.map((field) => {
        const status = normalizeHydraulicStatus(check[field.key])
        if (!status) return null
        const label = `${check.equipment} - ${field.label}: ${status}`
        return {
          id: `${makeInspectionChecklistId(inspectionType, check.equipment)}:${slugSegment(field.label)}:${slugSegment(status)}`,
          label,
          inspectionType,
          selected: true,
          selectedAt: '',
        }
      }),
    )
    .filter(Boolean)
}

export const buildHydraulicDescription = (form = {}) => {
  const location = normalizeInspectionLocation(form).location
  const { totalCount, defectCount, visibleChecks } = getHydraulicCheckSummary(form)
  const remarkRows = visibleChecks.flatMap((check) => {
    const defectRows = getHydraulicDefectFields(check).map((field) => {
      const remarks = String(check[field.remarksKey] || '').trim()
      return `- ${check.equipment} - ${field.label}${remarks ? `: ${remarks}` : ''}`
    })
    const naRows = getHydraulicNaFields(check).map((field) => {
      const remarks = String(check[field.remarksKey] || '').trim()
      return `- ${check.equipment} - ${field.label} N/A${remarks ? `: ${remarks}` : ''}`
    })
    const generalRemarks = String(check.remarks || '').trim()
    if (generalRemarks) {
      defectRows.push(`- ${check.equipment} - General equipment remarks: ${generalRemarks}`)
    }
    return [...defectRows, ...naRows]
  })

  if (remarkRows.length > 0) {
    return [
      `Hydraulic rescue tools checked${location ? ` at ${location}` : ''}.`,
      `Defect/remark item(s): ${defectCount}.`,
      ...remarkRows,
    ].join('\n')
  }

  return `Hydraulic rescue tools checked${location ? ` at ${location}` : ''}: ${totalCount} equipment item(s), no defects recorded.`
}
