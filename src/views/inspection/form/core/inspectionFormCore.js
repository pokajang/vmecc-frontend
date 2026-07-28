import { createInspectionIdentity } from 'src/views/inspection/inspectionSharedUtils'
import {
  buildErAuxChecklist,
  buildErAuxDescription,
  getErAuxCheckSummary,
  getErAuxMissingFields,
  getErAuxVisibleChecks,
  isErAuxInspectionType,
  normalizeErAuxChecks,
  normalizeErAuxEquipmentRows,
} from 'src/views/inspection/types/er-aux/helpers'
import {
  buildFireExtinguisherDescription,
  getFireExtinguisherVisibleChecks,
  isFireExtinguisherInspectionType,
} from 'src/views/inspection/types/fire-extinguisher/helpers'
import {
  buildFrtChecklist,
  buildFrtDescription,
  getFrtCheckSummary,
  getFrtMissingFields,
  getFrtVisibleDailyChecks,
  getFrtVisibleOneOffChecks,
  isFrtDailyInspectionType,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  buildGeneralDescription,
  GENERAL_INSPECTION_TYPE,
} from 'src/views/inspection/types/general/helpers'
import {
  buildHighAngleDescription,
  getHighAngleVisibleChecks,
  isHighAngleInspectionType,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  buildHseDescription,
  getHseCheckSummary,
  getHseMissingFields,
  isHseInspectionType,
  normalizeHseFormFields,
} from 'src/views/inspection/types/hse/helpers'
import {
  buildHydraulicDescription,
  getHydraulicCheckSummary,
  getHydraulicMissingFields,
  getHydraulicVisibleChecks,
  isHydraulicInspectionType,
  normalizeHydraulicChecks,
  normalizeHydraulicEquipmentRows,
} from 'src/views/inspection/types/hydraulic/helpers'
import {
  buildScbaDescription,
  getScbaCheckSummary,
  getScbaMissingFields,
  isScbaInspectionType,
  normalizeScbaBackPlateChecks,
  normalizeScbaCustomSections,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
} from 'src/views/inspection/types/scba/helpers'
import {
  INSPECTION_CHECKLIST_TEMPLATES,
  INSPECTION_CHECKLIST_VERSION,
  INSPECTION_DESCRIPTION_CHIPS,
  INSPECTION_DRAFT_META_KEY,
  INSPECTION_FORM_VERSION,
  INSPECTION_PHOTO_CAPTION_CHIPS,
  appendInspectionText,
  defaultInspectionForm,
  formatInspectionLocation,
  formatInspectionRole,
  getDefaultInspectionDateTime,
  getInspectionChecklistChips,
  getInspectionInspectorField,
  getInspectionLocationMissingFields,
  getInspectionSessionActor,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  isGeneralInspectionType,
  isInspectionChecklistItemSelected,
  makeInspectionChecklistId,
  splitLegacyInspectionLocation,
  toggleInspectionChecklistItem,
} from './inspectionFormShared'
import {
  buildDraftInspectionFormSource,
  buildRecordInspectionFormSource,
  selectInspectionInitialFormSource,
} from './inspectionFormSourceAdapters'
import {
  applySessionInspector,
  buildInspectionPayloadSnapshot,
  createInspectionFormSignature,
  normalizeInspectionForm,
} from './inspectionFormSnapshots'
import {
  buildInspectionFormMissingFields,
  buildInspectionFormValidationState,
  getFirstMissingInspectionFieldName,
} from './inspectionFormValidation'

export {
  INSPECTION_CHECKLIST_TEMPLATES,
  INSPECTION_CHECKLIST_VERSION,
  INSPECTION_DESCRIPTION_CHIPS,
  INSPECTION_DRAFT_META_KEY,
  INSPECTION_FORM_VERSION,
  INSPECTION_PHOTO_CAPTION_CHIPS,
  appendInspectionText,
  defaultInspectionForm,
  formatInspectionLocation,
  formatInspectionRole,
  getDefaultInspectionDateTime,
  getInspectionChecklistChips,
  getInspectionDateFromDateTime,
  getInspectionInspectorField,
  getInspectionLocationMissingFields,
  getInspectionSessionActor,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  isGeneralInspectionType,
  isInspectionChecklistItemSelected,
  makeInspectionChecklistId,
  normalizeInspectionDateTime,
  normalizeInspectionLocation,
  splitLegacyInspectionLocation,
  toggleInspectionChecklistItem,
} from './inspectionFormShared'

export { normalizeInspectionForm } from './inspectionFormSnapshots'
export {
  applySessionInspector,
  buildInspectionPayloadSnapshot,
  createInspectionFormSignature,
} from './inspectionFormSnapshots'

export const getInspectionFormMissingFields = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  return buildInspectionFormMissingFields(normalizedForm, getInspectionLocationMissingFields)
}

export const getFirstMissingInspectionField = (form = {}) => {
  const missing = getInspectionFormMissingFields(form)
  return getFirstMissingInspectionFieldName(missing)
}

export const getInspectionFormValidationState = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const missing = getInspectionFormMissingFields(normalizedForm)
  return buildInspectionFormValidationState(normalizedForm, missing)
}

export const recordToInspectionForm = (record = {}) => {
  return normalizeInspectionForm(buildRecordInspectionFormSource(record))
}

export const draftToInspectionForm = (draft = {}) => {
  return normalizeInspectionForm(buildDraftInspectionFormSource(draft))
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
    zone: payloadSnapshot.zone,
    zoneId: payloadSnapshot.zoneId,
    mainLocation: payloadSnapshot.mainLocation,
    subLocation: payloadSnapshot.subLocation,
    mainLocationId: payloadSnapshot.mainLocationId,
    subLocationId: payloadSnapshot.subLocationId,
    locationPath: payloadSnapshot.locationPath,
    locationIds: payloadSnapshot.locationIds,
    inspectedAt: payloadSnapshot.inspectedAt,
    description: payloadSnapshot.description,
    reportRemarks: payloadSnapshot.reportRemarks,
    photos: payloadSnapshot.photos,
    inspectionIssues: payloadSnapshot.inspectionIssues,
    issues: payloadSnapshot.inspectionIssues,
    findings: payloadSnapshot.findings,
    checklist: payloadSnapshot.checklist,
    inspectionActor: payloadSnapshot.inspectionActor,
    inspectionSessionUid: String(payloadSnapshot.inspectionSessionUid || '').trim(),
    ...(Number(payloadSnapshot.inspectionSessionVersion || 0) > 0
      ? { inspectionSessionVersion: Number(payloadSnapshot.inspectionSessionVersion) }
      : {}),
    inspectionSessionStartedByUserId: String(
      payloadSnapshot.inspectionSessionStartedByUserId || '',
    ).trim(),
    inspectionSessionScopeVersion: String(
      payloadSnapshot.inspectionSessionScopeVersion || '',
    ).trim(),
    ...(typeof payloadSnapshot.inspectionSessionCanSubmit === 'boolean'
      ? { inspectionSessionCanSubmit: payloadSnapshot.inspectionSessionCanSubmit }
      : {}),
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
    highAngleCustomMainLocations: payloadSnapshot.highAngleCustomMainLocations,
    highAngleCustomCompartments: payloadSnapshot.highAngleCustomCompartments,
    highAngleChecks: payloadSnapshot.highAngleChecks,
    scbaInspectedBy: payloadSnapshot.scbaInspectedBy,
    scbaInspectionDate: payloadSnapshot.scbaInspectionDate,
    scbaBackPlateChecks: payloadSnapshot.scbaBackPlateChecks,
    scbaCylinderChecks: payloadSnapshot.scbaCylinderChecks,
    scbaFaceMaskChecks: payloadSnapshot.scbaFaceMaskChecks,
    scbaCustomSections: payloadSnapshot.scbaCustomSections,
    hsePayloadVersion: payloadSnapshot.hsePayloadVersion,
    hseInspectedBy: payloadSnapshot.hseInspectedBy,
    hseSelections: payloadSnapshot.hseSelections,
    hseUnsafeActDetails: payloadSnapshot.hseUnsafeActDetails,
    hseUnsafeConditionDetails: payloadSnapshot.hseUnsafeConditionDetails,
    hseImmediateAction: payloadSnapshot.hseImmediateAction,
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
) => {
  const {
    inspectionTypeDrafts: _inspectionTypeDrafts,
    inspection_type_drafts: _inspectionTypeDraftsSnake,
    ...submittedSnapshot
  } = applySessionInspector(
    reviewRecord && typeof reviewRecord === 'object' ? reviewRecord : {},
    user,
  )

  return {
    ...submittedSnapshot,
    status: 'Submitted',
    submittedAt: nowIso,
    submittedBy: getInspectionSessionActor(user),
    submittedByRole: getInspectionSessionActorRole(user),
    submittedByRoleCode: getInspectionSessionActorRoleCode(user),
  }
}

export const isInspectionFormValid = (form = {}) => {
  const missing = getInspectionFormMissingFields(form)
  return !Object.values(missing).some(Boolean)
}

export const selectInspectionInitialForm = ({
  routeMode = 'new',
  routeRecordId = '',
  workspace = null,
  draftPayload = null,
  record = null,
}) => {
  const next = selectInspectionInitialFormSource({
    routeMode,
    routeRecordId,
    workspace,
    draftPayload,
    record,
    isInspectionDraftPayload,
    getInspectionDraftMeta,
    defaultInspectionForm,
    getDefaultInspectionDateTime,
  })
  return { source: next.source, form: normalizeInspectionForm(next.form) }
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
