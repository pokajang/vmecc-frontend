import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import { isFireExtinguisherInspectionType } from 'src/views/inspection/types/fire-extinguisher/helpers'
import { normalizeFrtTruckReference } from 'src/views/inspection/types/frt-daily/helpers'
import { isGeneralInspectionType as isGeneralInspectionTypeHelper } from 'src/views/inspection/types/general/helpers'
import {
  formatInspectionRole,
  getInspectionInspectorField,
  getInspectionSessionActor,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  getInspectionSessionActorSnapshot,
} from './inspectionFormSession'
import {
  deriveInspectedAt,
  getDefaultInspectionDateTime,
  getInspectionDateFromDateTime,
  normalizeInspectionDateTime,
} from './inspectionFormDateTime'
export {
  formatInspectionRole,
  getInspectionInspectorField,
  getInspectionSessionActor,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  getInspectionSessionActorSnapshot,
} from './inspectionFormSession'
export {
  deriveInspectedAt,
  getDefaultInspectionDateTime,
  getInspectionDateFromDateTime,
  normalizeInspectionDateTime,
} from './inspectionFormDateTime'

export const INSPECTION_DRAFT_META_KEY = '__inspection'
export const INSPECTION_FORM_VERSION = 'inspection'
export const INSPECTION_CHECKLIST_VERSION = 'inspection-checklist-v1'

export const defaultInspectionForm = {
  selectedLocation: '',
  zone: '',
  zoneId: '',
  mainLocation: '',
  subLocation: '',
  mainLocationId: '',
  subLocationId: '',
  inspectionType: '',
  inspectedAt: '',
  description: '',
  reportRemarks: '',
  photos: [],
  inspectionIssues: [],
  inspectionTypeDrafts: {},
  checklist: [],
  erAuxInspectedBy: '',
  erAuxInspectionDate: '',
  erAuxChecks: [],
  erAuxEquipmentRows: [],
  fireExtinguisherInspectedBy: '',
  fireExtinguisherInspectionDate: '',
  fireExtinguisherChecks: [],
  fireExtinguisherCatalogRows: [],
  hydraulicChecks: [],
  hydraulicEquipmentRows: [],
  frtInspectedBy: '',
  frtInspectionDate: '',
  frtShift: '',
  frtTruckId: '',
  frtTruckPlateNo: '',
  frtTruckReference: normalizeFrtTruckReference(),
  frtDailyChecks: [],
  frtDailyRemarks: '',
  frtOneOffChecks: [],
  frtOneOffRemarks: '',
  highAngleInspectedBy: '',
  highAngleInspectionDate: '',
  highAngleCustomMainLocations: [],
  highAngleCustomCompartments: [],
  highAngleChecks: [],
  scbaInspectedBy: '',
  scbaInspectionDate: '',
  scbaBackPlateChecks: [],
  scbaCylinderChecks: [],
  scbaFaceMaskChecks: [],
  scbaCustomSections: [],
  hsePayloadVersion: 0,
  hseInspectedBy: '',
  hseSelections: [],
  hseUnsafeActDetails: '',
  hseUnsafeConditionDetails: '',
  hseImmediateAction: '',
  inspectionActor: null,
  submittedByRole: '',
  submittedByRoleCode: '',
}

export const INSPECTION_DESCRIPTION_CHIPS = [
  'Normal condition observed',
  'Issue found',
  'Follow-up required',
  'Unable to inspect',
  'Area checked and clear',
]

export const INSPECTION_PHOTO_CAPTION_CHIPS = [
  'Before',
  'After',
  'Defect',
  'Area view',
  'Equipment tag',
  'Access blocked',
]

const GENERIC_CHECKLIST_CHIPS = [
  'Area checked',
  'Access clear',
  'Condition recorded',
  'Follow-up noted',
]

const normalizeChecklistKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const slugChecklistSegment = (value) =>
  normalizeChecklistKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const INSPECTION_CHECKLIST_TEMPLATES = {
  'er aux equipment inspection': [
    'Equipment present',
    'Quantity checked',
    'Condition recorded',
    'Remarks noted',
  ],
  'fire extinguisher inspection': [
    'Unit present',
    'Certification validity checked',
    'Physical condition checked',
    'Operational condition checked',
  ],
  'frt daily inspection': [
    'Vehicle/equipment present',
    'Quantity checked',
    'Daily status recorded',
    'Defect/remark noted',
  ],
  'high angle rescue equipment inspection': [
    'Kit contents checked',
    'Quantity checked',
    'Condition recorded',
    'Remarks noted',
  ],
  'hydraulic rescue tools inspection': [
    'Physical condition checked',
    'Mechanical condition checked',
    'No leakage checked',
    'Function test recorded',
  ],
  'scba inspection': [
    'Back plate checked',
    'Cylinder checked',
    'Face mask checked',
    'Cleanliness checked',
  ],
  'health safety environment inspection': [
    'Unsafe act checked',
    'Unsafe condition checked',
    'Control measure verified',
    'Follow-up action noted',
  ],
  'general inspection': [],
}

export const isGeneralInspectionType = isGeneralInspectionTypeHelper

export const makeInspectionChecklistId = (inspectionType, label) =>
  `${slugChecklistSegment(inspectionType) || 'generic'}:${slugChecklistSegment(label)}`

export const getInspectionChecklistChips = (inspectionType) => {
  const key = normalizeChecklistKey(inspectionType)
  return INSPECTION_CHECKLIST_TEMPLATES[key] || GENERIC_CHECKLIST_CHIPS
}

const normalizeChecklistItem = (item = {}) => {
  if (!item || typeof item !== 'object') return null
  const label = String(item.label || item.title || item.value || '').trim()
  if (!label) return null
  const inspectionType = String(item.inspectionType || item.incidentType || '').trim()
  return {
    id: String(item.id || makeInspectionChecklistId(inspectionType, label)).trim(),
    label,
    inspectionType,
    selected: item.selected !== false,
    selectedAt: String(item.selectedAt || item.selected_at || '').trim(),
  }
}

export const normalizeChecklist = (checklist) => {
  const byId = new Map()
  ;(Array.isArray(checklist) ? checklist : []).forEach((item) => {
    const normalized = normalizeChecklistItem(item)
    if (!normalized) return
    byId.set(normalized.id, normalized)
  })
  return Array.from(byId.values())
}

export const isInspectionChecklistItemSelected = (checklist = [], inspectionType, label) => {
  const id = makeInspectionChecklistId(inspectionType, label)
  return normalizeChecklist(checklist).some((item) => item.id === id && item.selected)
}

export const appendInspectionText = (currentValue, nextText) => {
  const current = String(currentValue || '').trimEnd()
  const next = String(nextText || '').trim()
  if (!next) return String(currentValue || '')
  if (!current) return next
  if (current.toLowerCase().includes(next.toLowerCase())) return current
  return `${current}\n${next}`
}

export const toggleInspectionChecklistItem = (
  form = {},
  label,
  nowIso = new Date().toISOString(),
) => {
  const normalizedForm = { ...defaultInspectionForm, ...form }
  const inspectionType = String(normalizedForm.inspectionType || '').trim()
  const checklist = normalizeChecklist(normalizedForm.checklist)
  const id = makeInspectionChecklistId(inspectionType, label)
  const existing = checklist.find((item) => item.id === id)
  const selected = !existing?.selected
  const nextItem = {
    id,
    label: String(label || '').trim(),
    inspectionType,
    selected,
    selectedAt: selected ? nowIso : String(existing?.selectedAt || '').trim(),
  }
  const nextChecklist = [nextItem, ...checklist.filter((item) => item.id !== id)]
  return {
    ...normalizedForm,
    checklist: nextChecklist,
    description: selected
      ? appendInspectionText(normalizedForm.description, nextItem.label)
      : normalizedForm.description,
  }
}

const normalizeZoneLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/^Zone\s+/i, '')

const looksLikeFireExtinguisherZoneLabel = (value) =>
  /^Zone\s+(?:\d|Others\b)/i.test(String(value || '').trim())

export const splitLegacyInspectionLocation = (value) => {
  const text = String(value || '').trim()
  if (!text) return { mainLocation: '', subLocation: '' }
  const parts = text
    .split(/\s*>\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  const firstPart = parts[0] || ''
  const hasZonePrefix = looksLikeFireExtinguisherZoneLabel(firstPart)
  if (hasZonePrefix && parts.length >= 2) {
    return {
      zone: normalizeZoneLabel(firstPart),
      mainLocation: parts[1] || '',
      subLocation: parts.slice(2).join(' > '),
    }
  }
  return {
    mainLocation: parts[0] || text,
    subLocation: parts.slice(1).join(' > '),
  }
}

export const formatInspectionLocation = ({
  zone = '',
  mainLocation = '',
  subLocation = '',
} = {}) => {
  const zoneValue = String(zone || '').trim()
  const main = String(mainLocation || '').trim()
  const sub = String(subLocation || '').trim()
  return [zoneValue ? `Zone ${zoneValue}` : '', main, sub].filter(Boolean).join(' > ')
}

export const normalizeInspectionLocation = (source = {}) => {
  const path = Array.isArray(source?.locationPath)
    ? source.locationPath
    : Array.isArray(source?.location_path)
      ? source.location_path
      : []
  const pathIds = Array.isArray(source?.locationIds)
    ? source.locationIds
    : Array.isArray(source?.location_ids)
      ? source.location_ids
      : []
  const pathFirst = String(path[0] || '').trim()
  const pathHasZone = looksLikeFireExtinguisherZoneLabel(pathFirst) && path.length >= 2
  const directZone = normalizeZoneLabel(
    source?.zone || source?.zone_name || (pathHasZone ? pathFirst : ''),
  )
  const zoneId = String(
    source?.zoneId || source?.zone_id || (pathHasZone ? pathIds[0] : '') || '',
  ).trim()
  const directMain = String(source?.mainLocation || source?.main_location || '').trim()
  const directSub = String(source?.subLocation || source?.sub_location || '').trim()
  const mainLocationId = String(
    source?.mainLocationId || source?.main_location_id || pathIds[pathHasZone ? 1 : 0] || '',
  ).trim()
  const subLocationId = String(
    source?.subLocationId || source?.sub_location_id || pathIds[pathHasZone ? 2 : 1] || '',
  ).trim()
  if (directMain || directSub) {
    const location = formatInspectionLocation({
      zone: directZone,
      mainLocation: directMain,
      subLocation: directSub,
    })
    return {
      zone: directZone,
      mainLocation: directMain,
      subLocation: directSub,
      zoneId,
      mainLocationId,
      subLocationId,
      selectedLocation: location,
      location,
      locationPath: [directZone ? `Zone ${directZone}` : '', directMain, directSub].filter(Boolean),
      locationIds: [zoneId, mainLocationId, subLocationId].filter(Boolean),
    }
  }
  if (directZone) {
    const location = formatInspectionLocation({ zone: directZone })
    return {
      zone: directZone,
      mainLocation: '',
      subLocation: '',
      zoneId,
      mainLocationId,
      subLocationId,
      selectedLocation: location,
      location,
      locationPath: [`Zone ${directZone}`],
      locationIds: [zoneId].filter(Boolean),
    }
  }

  const pathZone = pathHasZone ? normalizeZoneLabel(pathFirst) : directZone
  const pathMain = String(path[pathHasZone ? 1 : 0] || '').trim()
  const pathSub = String(path[pathHasZone ? 2 : 1] || '').trim()
  if (pathMain || pathSub) {
    const location = formatInspectionLocation({
      zone: pathZone,
      mainLocation: pathMain,
      subLocation: pathSub,
    })
    return {
      zone: pathZone,
      mainLocation: pathMain,
      subLocation: pathSub,
      zoneId,
      mainLocationId,
      subLocationId,
      selectedLocation: location,
      location,
      locationPath: [pathZone ? `Zone ${pathZone}` : '', pathMain, pathSub].filter(Boolean),
      locationIds: [zoneId, mainLocationId, subLocationId].filter(Boolean),
    }
  }

  const legacy = String(
    source?.selectedLocation || source?.location || source?.location_name || '',
  ).trim()
  const split = splitLegacyInspectionLocation(legacy)
  const location = formatInspectionLocation(split)
  const legacyZone = split.zone || ''
  return {
    ...split,
    zone: legacyZone,
    zoneId,
    mainLocationId,
    subLocationId,
    selectedLocation: location,
    location,
    locationPath: [
      legacyZone ? `Zone ${legacyZone}` : '',
      split.mainLocation,
      split.subLocation,
    ].filter(Boolean),
    locationIds: [zoneId, mainLocationId, subLocationId].filter(Boolean),
  }
}

const inferFireExtinguisherZoneFromRows = (source = {}, location = {}) => {
  const mainLocation = String(location.mainLocation || '')
    .trim()
    .toLowerCase()
  const subLocation = String(location.subLocation || '')
    .trim()
    .toLowerCase()
  if (!mainLocation) return ''

  const rows = [
    ...(Array.isArray(source.fireExtinguisherCatalogRows)
      ? source.fireExtinguisherCatalogRows
      : []),
    ...(Array.isArray(source.fire_extinguisher_catalog_rows)
      ? source.fire_extinguisher_catalog_rows
      : []),
    ...(Array.isArray(source.fireExtinguisherChecks) ? source.fireExtinguisherChecks : []),
    ...(Array.isArray(source.fire_extinguisher_checks) ? source.fire_extinguisher_checks : []),
  ]

  const match = rows.find((row) => {
    const rowZone = normalizeZoneLabel(row?.zone || row?.zone_name || '')
    if (!rowZone) return false
    const rowMain = String(row?.mainLocation || row?.main_location || '')
      .trim()
      .toLowerCase()
    const rowSub = String(row?.subLocation || row?.sub_location || '')
      .trim()
      .toLowerCase()
    if (rowMain !== mainLocation) return false
    return !subLocation || rowSub === subLocation
  })

  return normalizeZoneLabel(match?.zone || match?.zone_name || '')
}

export const withInferredFireExtinguisherZone = (
  source = {},
  location = {},
  inspectionType = '',
) => {
  if (!isFireExtinguisherInspectionType(inspectionType) || location.zone) return location
  const inferredZone = inferFireExtinguisherZoneFromRows(source, location)
  if (!inferredZone) return location
  const selectedLocation = formatInspectionLocation({
    zone: inferredZone,
    mainLocation: location.mainLocation,
    subLocation: location.subLocation,
  })
  return {
    ...location,
    zone: inferredZone,
    selectedLocation,
    location: selectedLocation,
    locationPath: [`Zone ${inferredZone}`, location.mainLocation, location.subLocation].filter(
      Boolean,
    ),
  }
}

export const getInspectionLocationMissingFields = (form = {}) => {
  const location = normalizeInspectionLocation(form)
  return {
    selectedLocation: !String(location.mainLocation || '').trim(),
  }
}

const normalizePhoto = (photo = {}) => {
  if (!photo || typeof photo !== 'object') return null
  const url = String(photo.url || '').trim()
  if (!url) return null
  return {
    ...photo,
    id: String(photo.id || '').trim(),
    mediaId: String(photo.mediaId || photo.media_id || '').trim(),
    fileName: String(photo.fileName || '').trim(),
    description: String(photo.description || ''),
    url,
    thumbnailUrl: String(photo.thumbnailUrl || photo.thumbnail_url || '').trim(),
    mimeType: String(photo.mimeType || photo.mime_type || '').trim(),
    sizeBytes: Number(photo.sizeBytes || photo.size_bytes || 0),
    width: Number(photo.width || 0),
    height: Number(photo.height || 0),
  }
}

export const normalizePhotos = (photos) =>
  dedupePhotos((Array.isArray(photos) ? photos : []).map(normalizePhoto))

export const deriveType = (source = {}) =>
  String(
    source.inspectionType ||
      source.incidentType ||
      source.findings?.[0]?.confirmedType ||
      source.findings?.[0]?.type ||
      '',
  ).trim()

export const deriveDescription = (source = {}) =>
  String(
    source.description ||
      source.findings?.[0]?.selectedDescription ||
      source.findings?.[0]?.description ||
      '',
  )

export const deriveReportRemarks = (source = {}) =>
  String(source.reportRemarks ?? source.report_remarks ?? '')

export const derivePhotos = (source = {}) => {
  const directPhotos = normalizePhotos(source.photos)
  if (directPhotos.length > 0) return directPhotos
  return normalizePhotos(
    (Array.isArray(source.findings) ? source.findings : []).map((finding) => finding?.photo),
  )
}
