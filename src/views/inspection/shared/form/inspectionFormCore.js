import { createInspectionIdentity, dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import {
  buildErAuxChecklist,
  buildErAuxDescription,
  getErAuxCheckSummary,
  getErAuxMissingFields,
  getErAuxValidationDetails,
  getErAuxVisibleChecks,
  isErAuxInspectionType,
  normalizeErAuxChecks,
  normalizeErAuxEquipmentRows,
} from 'src/views/inspection/types/er-aux/helpers'
import {
  buildFireExtinguisherChecklist,
  buildFireExtinguisherDescription,
  getFireExtinguisherMissingFields,
  getFireExtinguisherValidationDetails,
  getFireExtinguisherVisibleChecks,
  isFireExtinguisherInspectionType,
  normalizeFireExtinguisherChecks,
} from 'src/views/inspection/types/fire-extinguisher/helpers'
import {
  buildFrtChecklist,
  buildFrtDescription,
  getFrtCheckSummary,
  getFrtMissingFields,
  getFrtValidationDetails,
  getFrtVisibleDailyChecks,
  getFrtVisibleOneOffChecks,
  isFrtDailyInspectionType,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  buildGeneralChecklist,
  buildGeneralDescription,
  GENERAL_INSPECTION_TYPE,
  getGeneralMissingFields,
  getGeneralValidationDetails,
  isGeneralInspectionType as isGeneralInspectionTypeHelper,
} from 'src/views/inspection/types/general/helpers'
import {
  buildHighAngleChecklist,
  buildHighAngleDescription,
  getHighAngleMissingFields,
  getHighAngleVisibleChecks,
  HIGH_ANGLE_CONDITION_FIELD,
  isHighAngleInspectionType,
  normalizeHighAngleChecks,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  buildHseChecklist,
  buildHseDescription,
  getHseCheckSummary,
  getHseMissingFields,
  getHseValidationDetails,
  isHseInspectionType,
  normalizeHseFormFields,
} from 'src/views/inspection/types/hse/helpers'
import {
  buildHydraulicChecklist,
  buildHydraulicDescription,
  getHydraulicCheckSummary,
  getHydraulicMissingFields,
  getHydraulicVisibleChecks,
  HYDRAULIC_CHECK_FIELDS,
  normalizeHydraulicChecks,
  normalizeHydraulicEquipmentRows,
  isHydraulicInspectionType,
} from 'src/views/inspection/types/hydraulic/helpers'
import {
  buildScbaChecklist,
  buildScbaDescription,
  getScbaCheckSummary,
  getScbaMissingFields,
  getScbaFieldEvidenceKeys,
  isScbaInspectionType,
  normalizeScbaBackPlateChecks,
  normalizeScbaCustomSections,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
  SCBA_SECTION_DEFINITIONS,
} from 'src/views/inspection/types/scba/helpers'
import { normalizeInspectionDraft } from 'src/views/inspection/utils'
import { ROLE_ABBREVIATIONS } from 'src/constants/roles'
import { getPrimaryRoleLabel } from 'src/utils/authz'

export const INSPECTION_DRAFT_META_KEY = '__inspection'
export const INSPECTION_FORM_VERSION = 'inspection'
export const INSPECTION_CHECKLIST_VERSION = 'inspection-checklist-v1'

const padDatePart = (value) => String(value).padStart(2, '0')

export const getDefaultInspectionDateTime = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date)
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return (
    [
      safeDate.getFullYear(),
      padDatePart(safeDate.getMonth() + 1),
      padDatePart(safeDate.getDate()),
    ].join('-') + `T${padDatePart(safeDate.getHours())}:${padDatePart(safeDate.getMinutes())}`
  )
}

export const normalizeInspectionDateTime = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00`
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  return getDefaultInspectionDateTime(parsed)
}

export const getInspectionDateFromDateTime = (value = '') => {
  const normalized = normalizeInspectionDateTime(value)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) ? normalized.slice(0, 10) : ''
}

const deriveInspectedAt = (source = {}) => {
  const direct = normalizeInspectionDateTime(
    source.inspectedAt ||
      source.inspected_at ||
      source.inspectionDateTime ||
      source.inspection_date_time ||
      '',
  )
  if (direct) return direct

  return normalizeInspectionDateTime(
    source.erAuxInspectionDate ||
      source.er_aux_inspection_date ||
      source.fireExtinguisherInspectionDate ||
      source.fire_extinguisher_inspection_date ||
      source.frtInspectionDate ||
      source.frt_inspection_date ||
      source.highAngleInspectionDate ||
      source.high_angle_inspection_date ||
      source.scbaInspectionDate ||
      source.scba_inspection_date ||
      source.hseInspectionDate ||
      source.hse_inspection_date ||
      '',
  )
}

export const defaultInspectionForm = {
  selectedLocation: '',
  mainLocation: '',
  subLocation: '',
  mainLocationId: '',
  subLocationId: '',
  inspectionType: '',
  inspectedAt: '',
  description: '',
  photos: [],
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
  highAngleChecks: [],
  scbaInspectedBy: '',
  scbaInspectionDate: '',
  scbaBackPlateChecks: [],
  scbaCylinderChecks: [],
  scbaFaceMaskChecks: [],
  scbaCustomSections: [],
  hseInspectedBy: '',
  hseInspectionDate: '',
  hseSelections: [],
  hseAreaConditionRemarks: '',
  hseUnsafeActDetails: '',
  hseUnsafeConditionDetails: '',
  hseEnvironmentalDetails: '',
  hseSeverity: '',
  hseImmediateAction: '',
  hseCorrectiveAction: '',
  hseResponsiblePerson: '',
  hseTargetDate: '',
  hseRemarks: '',
  inspectionActor: null,
  submittedByRole: '',
  submittedByRoleCode: '',
}

export const getInspectionSessionActor = (user = {}) =>
  [user?.name, user?.full_name, user?.fullName, user?.display_name, user?.displayName, user?.email]
    .map((value) => String(value || '').trim())
    .find(Boolean) || ''

export const getInspectionSessionActorRole = (user = {}) =>
  String(user?.primary_role || user?.primaryRole || getPrimaryRoleLabel(user) || '').trim()

export const getInspectionSessionActorRoleCode = (user = {}) => {
  const role = getInspectionSessionActorRole(user)
  return String(
    user?.primary_role_code || user?.primaryRoleCode || ROLE_ABBREVIATIONS[role] || '',
  ).trim()
}

export const formatInspectionRole = (role = '', roleCode = '') => {
  const normalizedRole = String(role || '').trim()
  const normalizedRoleCode = String(roleCode || '').trim()
  if (normalizedRole && normalizedRoleCode) return `${normalizedRole} (${normalizedRoleCode})`
  return normalizedRole || normalizedRoleCode
}

const getInspectionSessionActorSnapshot = (user = {}) => ({
  userId: user?.id ?? null,
  name: getInspectionSessionActor(user),
  email: String(user?.email || '').trim(),
  role: getInspectionSessionActorRole(user),
  roleCode: getInspectionSessionActorRoleCode(user),
})

export const getInspectionInspectorField = (inspectionType = '') => {
  if (isErAuxInspectionType(inspectionType)) return 'erAuxInspectedBy'
  if (isFireExtinguisherInspectionType(inspectionType)) return 'fireExtinguisherInspectedBy'
  if (isFrtDailyInspectionType(inspectionType)) return 'frtInspectedBy'
  if (isHighAngleInspectionType(inspectionType)) return 'highAngleInspectedBy'
  if (isScbaInspectionType(inspectionType)) return 'scbaInspectedBy'
  if (isHseInspectionType(inspectionType)) return 'hseInspectedBy'
  return ''
}

export const applySessionInspector = (form = {}, user = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  const normalizedForm = normalizeInspectionForm(form)
  const inspectorField = getInspectionInspectorField(normalizedForm.inspectionType)
  const actor = getInspectionSessionActorSnapshot(user)
  if (!inspectorField) {
    return {
      ...source,
      ...normalizedForm,
      inspectionActor: actor,
      submittedByRole: actor.role,
      submittedByRoleCode: actor.roleCode,
    }
  }
  return {
    ...source,
    ...normalizedForm,
    [inspectorField]: actor.name,
    inspectionActor: actor,
    submittedByRole: actor.role,
    submittedByRoleCode: actor.roleCode,
  }
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
  'general inspection': [
    'Housekeeping checked',
    'Access/egress clear',
    'Hazard observed',
    'Corrective action noted',
  ],
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

const normalizeChecklist = (checklist) => {
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
  const normalizedForm = normalizeInspectionForm(form)
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

export const splitLegacyInspectionLocation = (value) => {
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

export const formatInspectionLocation = ({ mainLocation = '', subLocation = '' } = {}) => {
  const main = String(mainLocation || '').trim()
  const sub = String(subLocation || '').trim()
  return [main, sub].filter(Boolean).join(' > ')
}

export const normalizeInspectionLocation = (source = {}) => {
  const directMain = String(source?.mainLocation || source?.main_location || '').trim()
  const directSub = String(source?.subLocation || source?.sub_location || '').trim()
  const mainLocationId = String(source?.mainLocationId || source?.main_location_id || '').trim()
  const subLocationId = String(source?.subLocationId || source?.sub_location_id || '').trim()
  if (directMain || directSub) {
    const location = formatInspectionLocation({
      mainLocation: directMain,
      subLocation: directSub,
    })
    return {
      mainLocation: directMain,
      subLocation: directSub,
      mainLocationId,
      subLocationId,
      selectedLocation: location,
      location,
      locationPath: [directMain, directSub].filter(Boolean),
      locationIds: [mainLocationId, subLocationId].filter(Boolean),
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
    const location = formatInspectionLocation({ mainLocation: pathMain, subLocation: pathSub })
    return {
      mainLocation: pathMain,
      subLocation: pathSub,
      mainLocationId,
      subLocationId,
      selectedLocation: location,
      location,
      locationPath: [pathMain, pathSub].filter(Boolean),
      locationIds: [mainLocationId, subLocationId].filter(Boolean),
    }
  }

  const legacy = String(
    source?.selectedLocation || source?.location || source?.location_name || '',
  ).trim()
  const split = splitLegacyInspectionLocation(legacy)
  const location = formatInspectionLocation(split)
  return {
    ...split,
    mainLocationId,
    subLocationId,
    selectedLocation: location,
    location,
    locationPath: [split.mainLocation, split.subLocation].filter(Boolean),
    locationIds: [mainLocationId, subLocationId].filter(Boolean),
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
    id: String(photo.id || '').trim(),
    fileName: String(photo.fileName || '').trim(),
    description: String(photo.description || ''),
    url,
  }
}

const normalizePhotos = (photos) =>
  dedupePhotos((Array.isArray(photos) ? photos : []).map(normalizePhoto))

const deriveType = (source = {}) =>
  String(
    source.inspectionType ||
      source.incidentType ||
      source.findings?.[0]?.confirmedType ||
      source.findings?.[0]?.type ||
      '',
  ).trim()

const deriveDescription = (source = {}) =>
  String(
    source.description ||
      source.findings?.[0]?.selectedDescription ||
      source.findings?.[0]?.description ||
      '',
  )

const derivePhotos = (source = {}) => {
  const directPhotos = normalizePhotos(source.photos)
  if (directPhotos.length > 0) return directPhotos
  return normalizePhotos(
    (Array.isArray(source.findings) ? source.findings : []).map((finding) => finding?.photo),
  )
}

export const normalizeInspectionForm = (form = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  const location = normalizeInspectionLocation(source)
  const hseFields = normalizeHseFormFields(source)
  const inspectedAt = deriveInspectedAt(source)
  const inspectionDate = getInspectionDateFromDateTime(inspectedAt)
  const normalizedHseFields = {
    ...hseFields,
    hseInspectionDate: inspectionDate || hseFields.hseInspectionDate,
  }
  return {
    selectedLocation: location.selectedLocation,
    mainLocation: location.mainLocation,
    subLocation: location.subLocation,
    mainLocationId: location.mainLocationId,
    subLocationId: location.subLocationId,
    inspectionType: deriveType(source),
    inspectedAt,
    description: deriveDescription(source),
    photos: derivePhotos(source),
    checklist: normalizeChecklist(source.checklist),
    inspectionActor:
      source.inspectionActor && typeof source.inspectionActor === 'object'
        ? {
            userId: source.inspectionActor.userId ?? source.inspectionActor.user_id ?? null,
            name: String(source.inspectionActor.name || '').trim(),
            email: String(source.inspectionActor.email || '').trim(),
            role: String(source.inspectionActor.role || '').trim(),
            roleCode: String(
              source.inspectionActor.roleCode || source.inspectionActor.role_code || '',
            ).trim(),
          }
        : null,
    submittedByRole: String(source.submittedByRole || source.submitted_by_role || '').trim(),
    submittedByRoleCode: String(
      source.submittedByRoleCode || source.submitted_by_role_code || '',
    ).trim(),
    erAuxInspectedBy: String(source.erAuxInspectedBy || source.er_aux_inspected_by || '').trim(),
    erAuxInspectionDate: String(
      inspectionDate || source.erAuxInspectionDate || source.er_aux_inspection_date || '',
    ).trim(),
    erAuxChecks: normalizeErAuxChecks(source.erAuxChecks || source.er_aux_checks),
    erAuxEquipmentRows: normalizeErAuxEquipmentRows(
      source.erAuxEquipmentRows || source.er_aux_equipment_rows,
    ),
    fireExtinguisherInspectedBy: String(
      source.fireExtinguisherInspectedBy || source.fire_extinguisher_inspected_by || '',
    ).trim(),
    fireExtinguisherInspectionDate: String(
      inspectionDate ||
        source.fireExtinguisherInspectionDate ||
        source.fire_extinguisher_inspection_date ||
        '',
    ).trim(),
    fireExtinguisherChecks: normalizeFireExtinguisherChecks(
      source.fireExtinguisherChecks || source.fire_extinguisher_checks,
    ),
    fireExtinguisherCatalogRows: Array.isArray(source.fireExtinguisherCatalogRows)
      ? source.fireExtinguisherCatalogRows
      : [],
    hydraulicChecks: normalizeHydraulicChecks(source.hydraulicChecks || source.hydraulic_checks),
    hydraulicEquipmentRows: normalizeHydraulicEquipmentRows(
      source.hydraulicEquipmentRows || source.hydraulic_equipment_rows,
    ),
    frtInspectedBy: String(source.frtInspectedBy || source.frt_inspected_by || '').trim(),
    frtInspectionDate: String(
      inspectionDate || source.frtInspectionDate || source.frt_inspection_date || '',
    ).trim(),
    frtShift: String(source.frtShift || source.frt_shift || '').trim(),
    frtTruckId: String(source.frtTruckId || source.frt_truck_id || '').trim(),
    frtTruckPlateNo: String(source.frtTruckPlateNo || source.frt_truck_plate_no || '').trim(),
    frtTruckReference: normalizeFrtTruckReference(
      source.frtTruckReference || source.frt_truck_reference,
    ),
    frtDailyChecks: normalizeFrtDailyChecks(source.frtDailyChecks || source.frt_daily_checks),
    frtDailyRemarks: String(source.frtDailyRemarks || source.frt_daily_remarks || '').trim(),
    frtOneOffChecks: normalizeFrtOneOffChecks(source.frtOneOffChecks || source.frt_one_off_checks),
    frtOneOffRemarks: String(source.frtOneOffRemarks || source.frt_one_off_remarks || '').trim(),
    highAngleInspectedBy: String(
      source.highAngleInspectedBy || source.high_angle_inspected_by || '',
    ).trim(),
    highAngleInspectionDate: String(
      inspectionDate || source.highAngleInspectionDate || source.high_angle_inspection_date || '',
    ).trim(),
    highAngleChecks: normalizeHighAngleChecks(source.highAngleChecks || source.high_angle_checks),
    scbaInspectedBy: String(source.scbaInspectedBy || source.scba_inspected_by || '').trim(),
    scbaInspectionDate: String(
      inspectionDate || source.scbaInspectionDate || source.scba_inspection_date || '',
    ).trim(),
    scbaBackPlateChecks: normalizeScbaBackPlateChecks(
      source.scbaBackPlateChecks || source.scba_back_plate_checks,
    ),
    scbaCylinderChecks: normalizeScbaCylinderChecks(
      source.scbaCylinderChecks || source.scba_cylinder_checks,
    ),
    scbaFaceMaskChecks: normalizeScbaFaceMaskChecks(
      source.scbaFaceMaskChecks || source.scba_face_mask_checks,
    ),
    scbaCustomSections: normalizeScbaCustomSections(
      source.scbaCustomSections || source.scba_custom_sections,
    ),
    ...normalizedHseFields,
  }
}

export const getInspectionFormMissingFields = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const baseMissing = {
    inspectionType: !String(normalizedForm.inspectionType || '').trim(),
    inspectedAt: !String(normalizedForm.inspectedAt || '').trim(),
    selectedLocation: getInspectionLocationMissingFields(normalizedForm).selectedLocation,
    photos: normalizedForm.photos.length === 0,
  }
  const sharedStructuredMissing = {
    erAuxSession: false,
    erAuxChecks: false,
    erAuxRemarks: false,
    hydraulicChecks: false,
    hydraulicRemarks: false,
    frtSession: false,
    frtDailyChecks: false,
    frtDailyRemarks: false,
    frtOneOffChecks: false,
    frtOneOffRemarks: false,
    highAngleSession: false,
    highAngleChecks: false,
    highAngleRemarks: false,
    scbaSession: false,
    scbaChecks: false,
    scbaRemarks: false,
  }

  if (isHydraulicInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getHydraulicMissingFields(normalizedForm),
    }
  }

  if (isErAuxInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getErAuxMissingFields(normalizedForm),
    }
  }

  if (isFireExtinguisherInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getFireExtinguisherMissingFields(normalizedForm),
    }
  }

  if (isScbaInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getScbaMissingFields(normalizedForm),
    }
  }

  if (isFrtDailyInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getFrtMissingFields(normalizedForm),
    }
  }

  if (isHighAngleInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getHighAngleMissingFields(normalizedForm),
    }
  }

  if (isHseInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      photos: false,
      description: false,
      ...sharedStructuredMissing,
      ...getHseMissingFields(normalizedForm),
    }
  }

  if (isGeneralInspectionType(normalizedForm.inspectionType)) {
    return {
      ...baseMissing,
      ...sharedStructuredMissing,
      ...getGeneralMissingFields(normalizedForm),
    }
  }

  return {
    ...baseMissing,
    description: !String(normalizedForm.description || '').trim(),
    ...sharedStructuredMissing,
  }
}

export const getFirstMissingInspectionField = (form = {}) => {
  const missing = getInspectionFormMissingFields(form)
  return [
    'inspectionType',
    'inspectedAt',
    'selectedLocation',
    'erAuxSession',
    'erAuxChecks',
    'erAuxRemarks',
    'fireExtinguisherSession',
    'fireExtinguisherChecks',
    'fireExtinguisherRemarks',
    'hydraulicChecks',
    'hydraulicRemarks',
    'frtSession',
    'frtDailyChecks',
    'frtDailyRemarks',
    'frtOneOffChecks',
    'frtOneOffRemarks',
    'highAngleSession',
    'highAngleChecks',
    'highAngleRemarks',
    'scbaSession',
    'scbaChecks',
    'scbaRemarks',
    'hseSession',
    'hseSelection',
    'hseDetails',
    'description',
    'photos',
  ].find((field) => Boolean(missing[field]))
}

export const getInspectionFormValidationState = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const missing = getInspectionFormMissingFields(normalizedForm)
  const firstField = getFirstMissingInspectionField(normalizedForm)
  const isErAux = isErAuxInspectionType(normalizedForm.inspectionType)
  const isFireExtinguisher = isFireExtinguisherInspectionType(normalizedForm.inspectionType)
  const isFrt = isFrtDailyInspectionType(normalizedForm.inspectionType)
  const isHse = isHseInspectionType(normalizedForm.inspectionType)
  const isGeneral = isGeneralInspectionType(normalizedForm.inspectionType)
  const erAux = isErAux
    ? getErAuxValidationDetails(normalizedForm)
    : {
        incompleteCheckDetails: [],
        incompleteEvidenceDetails: [],
        firstTarget: null,
        errorCount: 0,
      }
  const fireExtinguisher = isFireExtinguisher
    ? getFireExtinguisherValidationDetails(normalizedForm)
    : {
        rowDetails: [],
        missingStatusesByRow: {},
        missingRemarksByRow: {},
        missingPhotosByRow: {},
        firstTarget: null,
        errorCount: 0,
      }
  const hse = isHse
    ? getHseValidationDetails(normalizedForm)
    : { missingFields: {}, firstTarget: null, errorCount: 0 }
  const frt = isFrt
    ? getFrtValidationDetails(normalizedForm)
    : { rowDetails: [], firstTarget: null, errorCount: 0 }
  const general = isGeneral
    ? getGeneralValidationDetails(normalizedForm)
    : { missingFields: {}, firstTarget: null, errorCount: 0 }

  const errorCount =
    Object.entries(missing).reduce((count, [field, value]) => {
      if (!value) return count
      if (isErAux && ['erAuxChecks', 'erAuxRemarks'].includes(field)) {
        return count
      }
      if (
        isFireExtinguisher &&
        ['fireExtinguisherChecks', 'fireExtinguisherRemarks'].includes(field)
      ) {
        return count
      }
      if (isHse && field === 'hseDetails') return count
      if (
        isFrt &&
        ['frtDailyChecks', 'frtDailyRemarks', 'frtOneOffChecks', 'frtOneOffRemarks'].includes(field)
      ) {
        return count
      }
      return count + 1
    }, 0) +
    erAux.errorCount +
    fireExtinguisher.errorCount +
    hse.errorCount +
    frt.errorCount

  const firstTarget =
    firstField === 'erAuxChecks' || firstField === 'erAuxRemarks'
      ? erAux.firstTarget || { field: firstField }
      : firstField === 'fireExtinguisherChecks' || firstField === 'fireExtinguisherRemarks'
        ? fireExtinguisher.firstTarget || { field: firstField }
        : ['frtDailyChecks', 'frtDailyRemarks', 'frtOneOffChecks', 'frtOneOffRemarks'].includes(
              firstField,
            )
          ? frt.firstTarget || { field: firstField }
          : firstField === 'hseDetails'
            ? hse.firstTarget || { field: firstField }
            : isGeneral && ['description', 'photos'].includes(firstField)
              ? general.firstTarget || { field: firstField }
              : firstField
                ? { field: firstField }
                : null

  return {
    missing,
    errorCount,
    firstTarget,
    erAux,
    fireExtinguisher,
    frt,
    hse,
    general,
  }
}

export const recordToInspectionForm = (record = {}) => {
  const normalized = normalizeInspectionDraft(record)
  return normalizeInspectionForm({
    selectedLocation: normalized.selectedLocation || normalized.location || '',
    mainLocation: normalized.mainLocation || normalized.main_location || '',
    subLocation: normalized.subLocation || normalized.sub_location || '',
    mainLocationId: normalized.mainLocationId || normalized.main_location_id || '',
    subLocationId: normalized.subLocationId || normalized.sub_location_id || '',
    locationPath: normalized.locationPath || normalized.location_path || [],
    inspectionType: normalized.incidentType || '',
    inspectedAt: normalized.inspectedAt || normalized.inspected_at || '',
    description: normalized.description || '',
    photos: normalized.photos || [],
    findings: normalized.findings || [],
    checklist: normalized.checklist || [],
    inspectionActor: normalized.inspectionActor || normalized.inspection_actor || null,
    submittedByRole: normalized.submittedByRole || normalized.submitted_by_role || '',
    submittedByRoleCode: normalized.submittedByRoleCode || normalized.submitted_by_role_code || '',
    erAuxInspectedBy: normalized.erAuxInspectedBy || normalized.er_aux_inspected_by || '',
    erAuxInspectionDate: normalized.erAuxInspectionDate || normalized.er_aux_inspection_date || '',
    erAuxChecks: normalized.erAuxChecks || normalized.er_aux_checks || [],
    erAuxEquipmentRows: normalized.erAuxEquipmentRows || normalized.er_aux_equipment_rows || [],
    fireExtinguisherInspectedBy:
      normalized.fireExtinguisherInspectedBy || normalized.fire_extinguisher_inspected_by || '',
    fireExtinguisherInspectionDate:
      normalized.fireExtinguisherInspectionDate ||
      normalized.fire_extinguisher_inspection_date ||
      '',
    fireExtinguisherChecks:
      normalized.fireExtinguisherChecks || normalized.fire_extinguisher_checks || [],
    hydraulicChecks: normalized.hydraulicChecks || normalized.hydraulic_checks || [],
    hydraulicEquipmentRows:
      normalized.hydraulicEquipmentRows || normalized.hydraulic_equipment_rows || [],
    frtInspectedBy: normalized.frtInspectedBy || normalized.frt_inspected_by || '',
    frtInspectionDate: normalized.frtInspectionDate || normalized.frt_inspection_date || '',
    frtShift: normalized.frtShift || normalized.frt_shift || '',
    frtTruckId: normalized.frtTruckId || normalized.frt_truck_id || '',
    frtTruckPlateNo: normalized.frtTruckPlateNo || normalized.frt_truck_plate_no || '',
    frtTruckReference: normalized.frtTruckReference || normalized.frt_truck_reference || {},
    frtDailyChecks: normalized.frtDailyChecks || normalized.frt_daily_checks || [],
    frtDailyRemarks: normalized.frtDailyRemarks || normalized.frt_daily_remarks || '',
    frtOneOffChecks: normalized.frtOneOffChecks || normalized.frt_one_off_checks || [],
    frtOneOffRemarks: normalized.frtOneOffRemarks || normalized.frt_one_off_remarks || '',
    highAngleInspectedBy:
      normalized.highAngleInspectedBy || normalized.high_angle_inspected_by || '',
    highAngleInspectionDate:
      normalized.highAngleInspectionDate || normalized.high_angle_inspection_date || '',
    highAngleChecks: normalized.highAngleChecks || normalized.high_angle_checks || [],
    scbaInspectedBy: normalized.scbaInspectedBy || normalized.scba_inspected_by || '',
    scbaInspectionDate: normalized.scbaInspectionDate || normalized.scba_inspection_date || '',
    scbaBackPlateChecks: normalized.scbaBackPlateChecks || normalized.scba_back_plate_checks || [],
    scbaCylinderChecks: normalized.scbaCylinderChecks || normalized.scba_cylinder_checks || [],
    scbaFaceMaskChecks: normalized.scbaFaceMaskChecks || normalized.scba_face_mask_checks || [],
    scbaCustomSections: normalized.scbaCustomSections || normalized.scba_custom_sections || [],
    hseInspectedBy: normalized.hseInspectedBy || normalized.hse_inspected_by || '',
    hseInspectionDate: normalized.hseInspectionDate || normalized.hse_inspection_date || '',
    hseSelections: normalized.hseSelections || normalized.hse_selections || [],
    hseAreaConditionRemarks:
      normalized.hseAreaConditionRemarks || normalized.hse_area_condition_remarks || '',
    hseUnsafeActDetails: normalized.hseUnsafeActDetails || normalized.hse_unsafe_act_details || '',
    hseUnsafeConditionDetails:
      normalized.hseUnsafeConditionDetails || normalized.hse_unsafe_condition_details || '',
    hseEnvironmentalDetails:
      normalized.hseEnvironmentalDetails || normalized.hse_environmental_details || '',
    hseSeverity: normalized.hseSeverity || normalized.hse_severity || '',
    hseImmediateAction: normalized.hseImmediateAction || normalized.hse_immediate_action || '',
    hseCorrectiveAction: normalized.hseCorrectiveAction || normalized.hse_corrective_action || '',
    hseResponsiblePerson:
      normalized.hseResponsiblePerson || normalized.hse_responsible_person || '',
    hseTargetDate: normalized.hseTargetDate || normalized.hse_target_date || '',
    hseRemarks: normalized.hseRemarks || normalized.hse_remarks || '',
  })
}

export const draftToInspectionForm = (draft = {}) => {
  const normalized = normalizeInspectionDraft(draft)
  return normalizeInspectionForm({
    selectedLocation: normalized.selectedLocation || normalized.location || '',
    mainLocation: normalized.mainLocation || normalized.main_location || '',
    subLocation: normalized.subLocation || normalized.sub_location || '',
    mainLocationId: normalized.mainLocationId || normalized.main_location_id || '',
    subLocationId: normalized.subLocationId || normalized.sub_location_id || '',
    locationPath: normalized.locationPath || normalized.location_path || [],
    inspectionType: normalized.incidentType || '',
    inspectedAt: normalized.inspectedAt || normalized.inspected_at || '',
    description: normalized.description || '',
    photos: normalized.photos || [],
    findings: normalized.findings || [],
    checklist: normalized.checklist || [],
    inspectionActor: normalized.inspectionActor || normalized.inspection_actor || null,
    submittedByRole: normalized.submittedByRole || normalized.submitted_by_role || '',
    submittedByRoleCode: normalized.submittedByRoleCode || normalized.submitted_by_role_code || '',
    erAuxInspectedBy: normalized.erAuxInspectedBy || normalized.er_aux_inspected_by || '',
    erAuxInspectionDate: normalized.erAuxInspectionDate || normalized.er_aux_inspection_date || '',
    erAuxChecks: normalized.erAuxChecks || normalized.er_aux_checks || [],
    erAuxEquipmentRows: normalized.erAuxEquipmentRows || normalized.er_aux_equipment_rows || [],
    fireExtinguisherInspectedBy:
      normalized.fireExtinguisherInspectedBy || normalized.fire_extinguisher_inspected_by || '',
    fireExtinguisherInspectionDate:
      normalized.fireExtinguisherInspectionDate ||
      normalized.fire_extinguisher_inspection_date ||
      '',
    fireExtinguisherChecks:
      normalized.fireExtinguisherChecks || normalized.fire_extinguisher_checks || [],
    hydraulicChecks: normalized.hydraulicChecks || normalized.hydraulic_checks || [],
    hydraulicEquipmentRows:
      normalized.hydraulicEquipmentRows || normalized.hydraulic_equipment_rows || [],
    frtInspectedBy: normalized.frtInspectedBy || normalized.frt_inspected_by || '',
    frtInspectionDate: normalized.frtInspectionDate || normalized.frt_inspection_date || '',
    frtShift: normalized.frtShift || normalized.frt_shift || '',
    frtTruckId: normalized.frtTruckId || normalized.frt_truck_id || '',
    frtTruckPlateNo: normalized.frtTruckPlateNo || normalized.frt_truck_plate_no || '',
    frtTruckReference: normalized.frtTruckReference || normalized.frt_truck_reference || {},
    frtDailyChecks: normalized.frtDailyChecks || normalized.frt_daily_checks || [],
    frtDailyRemarks: normalized.frtDailyRemarks || normalized.frt_daily_remarks || '',
    frtOneOffChecks: normalized.frtOneOffChecks || normalized.frt_one_off_checks || [],
    frtOneOffRemarks: normalized.frtOneOffRemarks || normalized.frt_one_off_remarks || '',
    highAngleInspectedBy:
      normalized.highAngleInspectedBy || normalized.high_angle_inspected_by || '',
    highAngleInspectionDate:
      normalized.highAngleInspectionDate || normalized.high_angle_inspection_date || '',
    highAngleChecks: normalized.highAngleChecks || normalized.high_angle_checks || [],
    scbaInspectedBy: normalized.scbaInspectedBy || normalized.scba_inspected_by || '',
    scbaInspectionDate: normalized.scbaInspectionDate || normalized.scba_inspection_date || '',
    scbaBackPlateChecks: normalized.scbaBackPlateChecks || normalized.scba_back_plate_checks || [],
    scbaCylinderChecks: normalized.scbaCylinderChecks || normalized.scba_cylinder_checks || [],
    scbaFaceMaskChecks: normalized.scbaFaceMaskChecks || normalized.scba_face_mask_checks || [],
    scbaCustomSections: normalized.scbaCustomSections || normalized.scba_custom_sections || [],
    hseInspectedBy: normalized.hseInspectedBy || normalized.hse_inspected_by || '',
    hseInspectionDate: normalized.hseInspectionDate || normalized.hse_inspection_date || '',
    hseSelections: normalized.hseSelections || normalized.hse_selections || [],
    hseAreaConditionRemarks:
      normalized.hseAreaConditionRemarks || normalized.hse_area_condition_remarks || '',
    hseUnsafeActDetails: normalized.hseUnsafeActDetails || normalized.hse_unsafe_act_details || '',
    hseUnsafeConditionDetails:
      normalized.hseUnsafeConditionDetails || normalized.hse_unsafe_condition_details || '',
    hseEnvironmentalDetails:
      normalized.hseEnvironmentalDetails || normalized.hse_environmental_details || '',
    hseSeverity: normalized.hseSeverity || normalized.hse_severity || '',
    hseImmediateAction: normalized.hseImmediateAction || normalized.hse_immediate_action || '',
    hseCorrectiveAction: normalized.hseCorrectiveAction || normalized.hse_corrective_action || '',
    hseResponsiblePerson:
      normalized.hseResponsiblePerson || normalized.hse_responsible_person || '',
    hseTargetDate: normalized.hseTargetDate || normalized.hse_target_date || '',
    hseRemarks: normalized.hseRemarks || normalized.hse_remarks || '',
  })
}

export const buildInspectionPayloadSnapshot = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const inspectionType = String(normalizedForm.inspectionType || '').trim()
  const mainLocation = String(normalizedForm.mainLocation || '').trim()
  const subLocation = String(normalizedForm.subLocation || '').trim()
  const mainLocationId = String(normalizedForm.mainLocationId || '').trim()
  const subLocationId = String(normalizedForm.subLocationId || '').trim()
  const location = formatInspectionLocation({ mainLocation, subLocation })
  const locationPath = [mainLocation, subLocation].filter(Boolean)
  const locationIds = [mainLocationId, subLocationId].filter(Boolean)
  const erAuxChecks = isErAuxInspectionType(inspectionType)
    ? getErAuxVisibleChecks(normalizedForm)
    : []
  const hydraulicChecks = isHydraulicInspectionType(inspectionType)
    ? getHydraulicVisibleChecks(normalizedForm)
    : []
  const fireExtinguisherChecks = isFireExtinguisherInspectionType(inspectionType)
    ? getFireExtinguisherVisibleChecks(normalizedForm)
    : []
  const frtDailyChecks = isFrtDailyInspectionType(inspectionType)
    ? getFrtVisibleDailyChecks(normalizedForm)
    : []
  const frtOneOffChecks = isFrtDailyInspectionType(inspectionType)
    ? getFrtVisibleOneOffChecks(normalizedForm)
    : []
  const highAngleChecks = isHighAngleInspectionType(inspectionType)
    ? getHighAngleVisibleChecks(normalizedForm)
    : []
  const scbaBackPlateChecks = isScbaInspectionType(inspectionType)
    ? normalizeScbaBackPlateChecks(normalizedForm.scbaBackPlateChecks)
    : []
  const scbaCylinderChecks = isScbaInspectionType(inspectionType)
    ? normalizeScbaCylinderChecks(normalizedForm.scbaCylinderChecks)
    : []
  const scbaFaceMaskChecks = isScbaInspectionType(inspectionType)
    ? normalizeScbaFaceMaskChecks(normalizedForm.scbaFaceMaskChecks)
    : []
  const scbaCustomSections = isScbaInspectionType(inspectionType)
    ? normalizeScbaCustomSections(normalizedForm.scbaCustomSections)
    : []
  const hseFields = isHseInspectionType(inspectionType)
    ? normalizeHseFormFields(normalizedForm)
    : normalizeHseFormFields()
  const description =
    isHydraulicInspectionType(inspectionType) && !String(normalizedForm.description || '').trim()
      ? buildHydraulicDescription({ ...normalizedForm, hydraulicChecks })
      : isFireExtinguisherInspectionType(inspectionType) &&
          !String(normalizedForm.description || '').trim()
        ? buildFireExtinguisherDescription({
            ...normalizedForm,
            location,
            fireExtinguisherChecks,
          })
        : isFrtDailyInspectionType(inspectionType) &&
            !String(normalizedForm.description || '').trim()
          ? buildFrtDescription({
              ...normalizedForm,
              location,
              frtDailyChecks,
              frtOneOffChecks,
            })
          : isHighAngleInspectionType(inspectionType) &&
              !String(normalizedForm.description || '').trim()
            ? buildHighAngleDescription({ ...normalizedForm, location, highAngleChecks })
            : isScbaInspectionType(inspectionType) &&
                !String(normalizedForm.description || '').trim()
              ? buildScbaDescription({
                  ...normalizedForm,
                  location,
                  scbaBackPlateChecks,
                  scbaCylinderChecks,
                  scbaFaceMaskChecks,
                  scbaCustomSections,
                })
              : isHseInspectionType(inspectionType) &&
                  !String(normalizedForm.description || '').trim()
                ? buildHseDescription({ ...normalizedForm, ...hseFields, location })
                : isGeneralInspectionType(inspectionType) &&
                    !String(normalizedForm.description || '').trim()
                  ? buildGeneralDescription({ ...normalizedForm, location })
                  : isErAuxInspectionType(inspectionType) &&
                      !String(normalizedForm.description || '').trim()
                    ? buildErAuxDescription({ ...normalizedForm, location, erAuxChecks })
                    : String(normalizedForm.description || '').trim()
  const photos = normalizePhotos(normalizedForm.photos)
  const structuredChecklist = [
    ...(isScbaInspectionType(inspectionType)
      ? buildScbaChecklist({
          ...normalizedForm,
          scbaBackPlateChecks,
          scbaCylinderChecks,
          scbaFaceMaskChecks,
          scbaCustomSections,
        })
      : []),
    ...(isErAuxInspectionType(inspectionType)
      ? buildErAuxChecklist({ ...normalizedForm, erAuxChecks })
      : []),
    ...(isHydraulicInspectionType(inspectionType)
      ? buildHydraulicChecklist({ ...normalizedForm, hydraulicChecks })
      : []),
    ...(isFireExtinguisherInspectionType(inspectionType)
      ? buildFireExtinguisherChecklist({ ...normalizedForm, fireExtinguisherChecks })
      : []),
    ...(isFrtDailyInspectionType(inspectionType)
      ? buildFrtChecklist({ ...normalizedForm, frtDailyChecks, frtOneOffChecks })
      : []),
    ...(isHighAngleInspectionType(inspectionType)
      ? buildHighAngleChecklist({ ...normalizedForm, highAngleChecks })
      : []),
    ...(isHseInspectionType(inspectionType)
      ? buildHseChecklist({ ...normalizedForm, ...hseFields })
      : []),
    ...(isGeneralInspectionType(inspectionType)
      ? buildGeneralChecklist({ ...normalizedForm, location })
      : []),
  ]
  const checklist = normalizeChecklist([
    ...structuredChecklist,
    ...normalizeChecklist(normalizedForm.checklist),
  ])
  const primaryPhoto = photos[0] || null
  const findings =
    inspectionType || location || description
      ? [
          {
            id: 'inspection-summary-finding',
            confirmedType: inspectionType,
            confirmedLocation: location,
            selectedDescription: description,
            type: inspectionType,
            location,
            description,
            photo: primaryPhoto,
            photoId: String(primaryPhoto?.id || '').trim(),
          },
        ]
      : []

  return {
    ...normalizedForm,
    incidentType: inspectionType,
    location,
    selectedLocation: location,
    mainLocation,
    subLocation,
    mainLocationId,
    subLocationId,
    locationPath,
    locationIds,
    inspectedAt: String(normalizedForm.inspectedAt || '').trim(),
    description,
    photos,
    checklist,
    inspectionActor: normalizedForm.inspectionActor,
    submittedByRole: String(normalizedForm.submittedByRole || '').trim(),
    submittedByRoleCode: String(normalizedForm.submittedByRoleCode || '').trim(),
    erAuxInspectedBy: String(normalizedForm.erAuxInspectedBy || '').trim(),
    erAuxInspectionDate: String(normalizedForm.erAuxInspectionDate || '').trim(),
    erAuxChecks,
    fireExtinguisherInspectedBy: String(normalizedForm.fireExtinguisherInspectedBy || '').trim(),
    fireExtinguisherInspectionDate: String(
      normalizedForm.fireExtinguisherInspectionDate || '',
    ).trim(),
    fireExtinguisherChecks,
    hydraulicChecks,
    frtInspectedBy: String(normalizedForm.frtInspectedBy || '').trim(),
    frtInspectionDate: String(normalizedForm.frtInspectionDate || '').trim(),
    frtShift: String(normalizedForm.frtShift || '').trim(),
    frtTruckId: String(normalizedForm.frtTruckId || '').trim(),
    frtTruckPlateNo: String(normalizedForm.frtTruckPlateNo || '').trim(),
    frtTruckReference: normalizeFrtTruckReference(normalizedForm.frtTruckReference),
    frtDailyChecks,
    frtDailyRemarks: String(normalizedForm.frtDailyRemarks || '').trim(),
    frtOneOffChecks,
    frtOneOffRemarks: String(normalizedForm.frtOneOffRemarks || '').trim(),
    highAngleInspectedBy: String(normalizedForm.highAngleInspectedBy || '').trim(),
    highAngleInspectionDate: String(normalizedForm.highAngleInspectionDate || '').trim(),
    highAngleChecks,
    scbaInspectedBy: String(normalizedForm.scbaInspectedBy || '').trim(),
    scbaInspectionDate: String(normalizedForm.scbaInspectionDate || '').trim(),
    scbaBackPlateChecks,
    scbaCylinderChecks,
    scbaFaceMaskChecks,
    scbaCustomSections,
    ...hseFields,
    checklistVersion: checklist.length > 0 ? INSPECTION_CHECKLIST_VERSION : '',
    findings,
  }
}

export const attachInspectionDraftMeta = (payload = {}, context = {}) => ({
  ...(payload && typeof payload === 'object' ? payload : {}),
  [INSPECTION_DRAFT_META_KEY]: {
    formVersion: INSPECTION_FORM_VERSION,
    mode: String(context.mode || '').trim() === 'edit' ? 'edit' : 'new',
    editReportId: String(context.editReportId || '').trim(),
  },
})

export const getInspectionDraftMeta = (payload = {}) => {
  const source = payload?.[INSPECTION_DRAFT_META_KEY]
  return {
    formVersion: String(source?.formVersion || '').trim(),
    mode: String(source?.mode || '').trim() === 'edit' ? 'edit' : 'new',
    editReportId: String(source?.editReportId || '').trim(),
  }
}

export const isInspectionDraftPayload = (payload = {}) =>
  getInspectionDraftMeta(payload).formVersion === INSPECTION_FORM_VERSION

export const buildInspectionDraftPayload = ({ form, mode = 'new', editReportId = '', user }) =>
  attachInspectionDraftMeta(
    {
      ...buildInspectionPayloadSnapshot(applySessionInspector(form, user)),
      savedAt: new Date().toISOString(),
    },
    { mode, editReportId },
  )

const buildBaseInspectionRecord = ({
  form,
  reportTypeSlug = 'inspection',
  reportTypeIdPrefix = 'INS',
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const payloadSnapshot = buildInspectionPayloadSnapshot(applySessionInspector(form, user))
  const { id, displayId } = createInspectionIdentity(reportTypeIdPrefix, nowIso, sequence)
  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'inspection',
    status: 'Draft',
    incidentType: payloadSnapshot.incidentType,
    location: payloadSnapshot.location,
    selectedLocation: payloadSnapshot.selectedLocation,
    mainLocation: payloadSnapshot.mainLocation,
    subLocation: payloadSnapshot.subLocation,
    mainLocationId: payloadSnapshot.mainLocationId,
    subLocationId: payloadSnapshot.subLocationId,
    locationPath: payloadSnapshot.locationPath,
    locationIds: payloadSnapshot.locationIds,
    inspectedAt: payloadSnapshot.inspectedAt,
    description: payloadSnapshot.description,
    photos: payloadSnapshot.photos,
    findings: payloadSnapshot.findings,
    checklist: payloadSnapshot.checklist,
    inspectionActor: payloadSnapshot.inspectionActor,
    submittedByRole: payloadSnapshot.submittedByRole,
    submittedByRoleCode: payloadSnapshot.submittedByRoleCode,
    erAuxInspectedBy: payloadSnapshot.erAuxInspectedBy,
    erAuxInspectionDate: payloadSnapshot.erAuxInspectionDate,
    erAuxChecks: payloadSnapshot.erAuxChecks,
    fireExtinguisherInspectedBy: payloadSnapshot.fireExtinguisherInspectedBy,
    fireExtinguisherInspectionDate: payloadSnapshot.fireExtinguisherInspectionDate,
    fireExtinguisherChecks: payloadSnapshot.fireExtinguisherChecks,
    hydraulicChecks: payloadSnapshot.hydraulicChecks,
    frtInspectedBy: payloadSnapshot.frtInspectedBy,
    frtInspectionDate: payloadSnapshot.frtInspectionDate,
    frtShift: payloadSnapshot.frtShift,
    frtTruckId: payloadSnapshot.frtTruckId,
    frtTruckPlateNo: payloadSnapshot.frtTruckPlateNo,
    frtTruckReference: payloadSnapshot.frtTruckReference,
    frtDailyChecks: payloadSnapshot.frtDailyChecks,
    frtDailyRemarks: payloadSnapshot.frtDailyRemarks,
    frtOneOffChecks: payloadSnapshot.frtOneOffChecks,
    frtOneOffRemarks: payloadSnapshot.frtOneOffRemarks,
    highAngleInspectedBy: payloadSnapshot.highAngleInspectedBy,
    highAngleInspectionDate: payloadSnapshot.highAngleInspectionDate,
    highAngleChecks: payloadSnapshot.highAngleChecks,
    scbaInspectedBy: payloadSnapshot.scbaInspectedBy,
    scbaInspectionDate: payloadSnapshot.scbaInspectionDate,
    scbaBackPlateChecks: payloadSnapshot.scbaBackPlateChecks,
    scbaCylinderChecks: payloadSnapshot.scbaCylinderChecks,
    scbaFaceMaskChecks: payloadSnapshot.scbaFaceMaskChecks,
    scbaCustomSections: payloadSnapshot.scbaCustomSections,
    hseInspectedBy: payloadSnapshot.hseInspectedBy,
    hseInspectionDate: payloadSnapshot.hseInspectionDate,
    hseSelections: payloadSnapshot.hseSelections,
    hseAreaConditionRemarks: payloadSnapshot.hseAreaConditionRemarks,
    hseUnsafeActDetails: payloadSnapshot.hseUnsafeActDetails,
    hseUnsafeConditionDetails: payloadSnapshot.hseUnsafeConditionDetails,
    hseEnvironmentalDetails: payloadSnapshot.hseEnvironmentalDetails,
    hseSeverity: payloadSnapshot.hseSeverity,
    hseImmediateAction: payloadSnapshot.hseImmediateAction,
    hseCorrectiveAction: payloadSnapshot.hseCorrectiveAction,
    hseResponsiblePerson: payloadSnapshot.hseResponsiblePerson,
    hseTargetDate: payloadSnapshot.hseTargetDate,
    hseRemarks: payloadSnapshot.hseRemarks,
    checklistVersion: payloadSnapshot.checklistVersion,
    submittedAt: '',
    submittedBy: '',
    ...(user?.name || user?.email ? { _preparedBy: user?.name || user?.email || '' } : {}),
  }
}

export const buildInspectionReviewRecord = ({
  form,
  mode = 'new',
  editingRecord = null,
  reportTypeSlug = 'inspection',
  reportTypeIdPrefix = 'INS',
  user,
  sequence,
}) => {
  const previewRecord = buildBaseInspectionRecord({
    form,
    reportTypeSlug,
    reportTypeIdPrefix,
    user,
    sequence,
  })

  if (mode !== 'edit') return previewRecord

  return {
    ...previewRecord,
    id: String(editingRecord?.id || '').trim() || previewRecord.id,
    displayId: String(editingRecord?.displayId || '').trim() || previewRecord.displayId,
    ...(editingRecord?.version !== undefined ? { version: editingRecord.version } : {}),
    ...(editingRecord?.revision !== undefined ? { revision: editingRecord.revision } : {}),
  }
}

export const buildInspectionSubmittedRecord = (
  reviewRecord = {},
  user,
  nowIso = new Date().toISOString(),
) => ({
  ...applySessionInspector(
    reviewRecord && typeof reviewRecord === 'object' ? reviewRecord : {},
    user,
  ),
  status: 'Submitted',
  submittedAt: nowIso,
  submittedBy: getInspectionSessionActor(user),
  submittedByRole: getInspectionSessionActorRole(user),
  submittedByRoleCode: getInspectionSessionActorRoleCode(user),
})

export const isInspectionFormValid = (form = {}) => {
  const missing = getInspectionFormMissingFields(form)
  return !Object.values(missing).some(Boolean)
}

const getPhotoSignature = (photo = {}) => {
  const url = String(photo?.url || '')
  return {
    id: String(photo?.id || '').trim(),
    fileName: String(photo?.fileName || '').trim(),
    description: String(photo?.description || ''),
    urlSize: url.length,
    urlHead: url.slice(0, 64),
    urlTail: url.slice(-64),
  }
}

export const createInspectionFormSignature = (form = {}) => {
  const snapshot = buildInspectionPayloadSnapshot(form)

  return JSON.stringify({
    ...snapshot,
    photos: normalizePhotos(snapshot.photos).map(getPhotoSignature),
    erAuxChecks: normalizeErAuxChecks(snapshot.erAuxChecks).map((check) => ({
      ...check,
      photos: normalizePhotos(check.photos).map(getPhotoSignature),
      defectPhotos: normalizePhotos(check.defectPhotos).map(getPhotoSignature),
    })),
    hydraulicChecks: normalizeHydraulicChecks(snapshot.hydraulicChecks).map((check) => ({
      ...check,
      photos: normalizePhotos(check.photos).map(getPhotoSignature),
      ...HYDRAULIC_CHECK_FIELDS.reduce((next, field) => {
        next[field.photosKey] = normalizePhotos(check[field.photosKey]).map(getPhotoSignature)
        return next
      }, {}),
    })),
    highAngleChecks: normalizeHighAngleChecks(snapshot.highAngleChecks).map((check) => ({
      ...check,
      [HIGH_ANGLE_CONDITION_FIELD.photosKey]: normalizePhotos(
        check[HIGH_ANGLE_CONDITION_FIELD.photosKey],
      ).map(getPhotoSignature),
    })),
    ...SCBA_SECTION_DEFINITIONS.reduce((next, section) => {
      const key =
        section.key === 'backPlate'
          ? 'scbaBackPlateChecks'
          : section.key === 'cylinder'
            ? 'scbaCylinderChecks'
            : 'scbaFaceMaskChecks'
      const normalizer =
        section.key === 'backPlate'
          ? normalizeScbaBackPlateChecks
          : section.key === 'cylinder'
            ? normalizeScbaCylinderChecks
            : normalizeScbaFaceMaskChecks
      next[key] = normalizer(snapshot[key]).map((check) => ({
        ...check,
        photos: normalizePhotos(check.photos).map(getPhotoSignature),
        ...section.fields.reduce((fieldPhotos, field) => {
          if (field.kind !== 'status') return fieldPhotos
          const { photosKey } = getScbaFieldEvidenceKeys(field)
          fieldPhotos[photosKey] = normalizePhotos(check[photosKey]).map(getPhotoSignature)
          return fieldPhotos
        }, {}),
      }))
      return next
    }, {}),
    scbaCustomSections: normalizeScbaCustomSections(snapshot.scbaCustomSections).map((section) => ({
      ...section,
      rows: section.rows.map((check) => ({
        ...check,
        photos: normalizePhotos(check.photos).map(getPhotoSignature),
        ...section.fields.reduce((fieldPhotos, field) => {
          const { photosKey } = getScbaFieldEvidenceKeys(field)
          fieldPhotos[photosKey] = normalizePhotos(check[photosKey]).map(getPhotoSignature)
          return fieldPhotos
        }, {}),
      })),
    })),
    findings: [],
  })
}

export const selectInspectionInitialForm = ({
  routeMode = 'new',
  routeRecordId = '',
  workspace = null,
  draftPayload = null,
  record = null,
}) => {
  const normalizedRecordId = String(routeRecordId || '').trim()
  const workspaceMode = String(workspace?.mode || '').trim() === 'edit' ? 'edit' : 'new'
  const workspaceRecordId = String(workspace?.recordId || '').trim()

  if (workspace?.form && workspaceMode === routeMode && workspaceRecordId === normalizedRecordId) {
    return { source: 'workspace', form: normalizeInspectionForm(workspace.form) }
  }

  if (isInspectionDraftPayload(draftPayload)) {
    const meta = getInspectionDraftMeta(draftPayload)
    if (meta.mode === routeMode && String(meta.editReportId || '').trim() === normalizedRecordId) {
      return { source: 'draft', form: draftToInspectionForm(draftPayload) }
    }
  }

  if (routeMode === 'edit' && record) {
    return { source: 'record', form: recordToInspectionForm(record) }
  }

  return {
    source: 'empty',
    form: normalizeInspectionForm({
      ...defaultInspectionForm,
      inspectedAt: getDefaultInspectionDateTime(),
    }),
  }
}

export {
  buildErAuxChecklist,
  buildErAuxDescription,
  buildFrtChecklist,
  buildFrtDescription,
  getErAuxCheckSummary,
  getErAuxMissingFields,
  getErAuxVisibleChecks,
  getFrtCheckSummary,
  getFrtMissingFields,
  getFrtVisibleDailyChecks,
  getFrtVisibleOneOffChecks,
  getHseCheckSummary,
  getHseMissingFields,
  getScbaCheckSummary,
  getScbaMissingFields,
  getHydraulicCheckSummary,
  getHydraulicMissingFields,
  getHydraulicVisibleChecks,
  isErAuxInspectionType,
  isFrtDailyInspectionType,
  isHseInspectionType,
  isScbaInspectionType,
  isHydraulicInspectionType,
  normalizeErAuxChecks,
  normalizeErAuxEquipmentRows,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
  normalizeHseFormFields,
  normalizeScbaBackPlateChecks,
  normalizeScbaCustomSections,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
  normalizeHydraulicChecks,
  normalizeHydraulicEquipmentRows,
}
