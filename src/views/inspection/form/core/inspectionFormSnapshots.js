import {
  buildErAuxChecklist,
  buildErAuxDescription,
  getErAuxSubmissionCandidateRows,
  isErAuxInspectionType,
  normalizeErAuxChecks,
  normalizeErAuxEquipmentRows,
} from 'src/views/inspection/types/er-aux/helpers'
import {
  buildFireExtinguisherChecklist,
  buildFireExtinguisherDescription,
  getFireExtinguisherInspectionCandidateRows,
  getFireExtinguisherSubmissionCandidateRows,
  isFireExtinguisherInspectionType,
  normalizeFireExtinguisherChecks,
} from 'src/views/inspection/types/fire-extinguisher/helpers'
import {
  buildFrtChecklist,
  buildFrtDescription,
  getFrtSubmissionDailyChecks,
  getFrtSubmissionOneOffChecks,
  isFrtDailyInspectionType,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
} from 'src/views/inspection/types/frt-daily/helpers'
import {
  buildGeneralChecklist,
  buildGeneralDescription,
} from 'src/views/inspection/types/general/helpers'
import {
  buildHighAngleChecklist,
  buildHighAngleDescription,
  getHighAngleSubmissionCandidateRows,
  HIGH_ANGLE_CONDITION_FIELD,
  isHighAngleInspectionType,
  normalizeHighAngleCustomCompartments,
  normalizeHighAngleCustomMainLocations,
  normalizeHighAngleChecks,
} from 'src/views/inspection/types/high-angle/helpers'
import {
  buildHseChecklist,
  buildHseDescription,
  isHseInspectionType,
  normalizeHseFormFields,
} from 'src/views/inspection/types/hse/helpers'
import {
  normalizeInspectionIssues,
  normalizeInspectionIssueDrafts,
} from 'src/views/inspection/types/inspectionIssues'
import {
  buildHydraulicChecklist,
  buildHydraulicDescription,
  getHydraulicSubmissionCandidateRows,
  HYDRAULIC_CHECK_FIELDS,
  normalizeHydraulicChecks,
  normalizeHydraulicEquipmentRows,
  isHydraulicInspectionType,
} from 'src/views/inspection/types/hydraulic/helpers'
import {
  buildScbaChecklist,
  buildScbaDescription,
  getScbaFieldEvidenceKeys,
  getScbaSubmissionCandidateSections,
  isScbaInspectionType,
  normalizeScbaBackPlateChecks,
  normalizeScbaCustomSections,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
  SCBA_SECTION_DEFINITIONS,
} from 'src/views/inspection/types/scba/helpers'
import {
  INSPECTION_CHECKLIST_VERSION,
  deriveDescription,
  deriveReportRemarks,
  deriveInspectedAt,
  derivePhotos,
  deriveType,
  formatInspectionLocation,
  getInspectionDateFromDateTime,
  getInspectionInspectorField,
  getInspectionSessionActor,
  getInspectionSessionActorRole,
  getInspectionSessionActorRoleCode,
  getInspectionSessionActorSnapshot,
  isGeneralInspectionType,
  normalizeChecklist,
  normalizeInspectionLocation,
  normalizePhotos,
  withInferredFireExtinguisherZone,
} from './inspectionFormShared'

const getInspectionIssuesSource = (source = {}, inspectionType = '') => {
  if (!isGeneralInspectionType(inspectionType)) return []

  const explicitIssues = source.inspectionIssues || source.inspection_issues
  if (explicitIssues) return explicitIssues

  return source.issues || source.observations || []
}

const normalizeInspectionTypeDrafts = (drafts = {}) => {
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) return {}

  return Object.entries(drafts).reduce((next, [key, draft]) => {
    const draftKey = String(key || '')
      .trim()
      .toLowerCase()
    if (!draftKey || !draft || typeof draft !== 'object' || Array.isArray(draft)) return next
    const {
      inspectionTypeDrafts: _inspectionTypeDrafts,
      inspection_type_drafts: _inspectionTypeDraftsSnake,
      ...cleanDraft
    } = draft
    next[draftKey] = cleanDraft
    return next
  }, {})
}

export const normalizeInspectionForm = (form = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  const inspectionType = deriveType(source)
  const location = withInferredFireExtinguisherZone(
    source,
    normalizeInspectionLocation(source),
    inspectionType,
  )
  const hseFields = normalizeHseFormFields(source, { preserveWhitespace: true })
  const inspectedAt = deriveInspectedAt(source)
  const inspectionDate = getInspectionDateFromDateTime(inspectedAt)
  const inspectionSessionUid = String(
    source.inspectionSessionUid || source.inspection_session_uid || '',
  ).trim()
  const inspectionSessionVersion = Math.max(
    0,
    Number(source.inspectionSessionVersion || source.inspection_session_version || 0) || 0,
  )
  const inspectionSessionStartedByUserId = String(
    source.inspectionSessionStartedByUserId || source.inspection_session_started_by_user_id || '',
  ).trim()
  const inspectionSessionScopeVersion = String(
    source.inspectionSessionScopeVersion || source.inspection_session_scope_version || '',
  ).trim()
  return {
    selectedLocation: location.selectedLocation,
    zone: location.zone,
    zoneId: location.zoneId,
    mainLocation: location.mainLocation,
    subLocation: location.subLocation,
    mainLocationId: location.mainLocationId,
    subLocationId: location.subLocationId,
    inspectionType,
    inspectedAt,
    description: deriveDescription(source),
    reportRemarks: deriveReportRemarks(source),
    photos: derivePhotos(source),
    inspectionIssues: normalizeInspectionIssueDrafts(
      getInspectionIssuesSource(source, inspectionType),
    ),
    inspectionTypeDrafts: normalizeInspectionTypeDrafts(
      source.inspectionTypeDrafts || source.inspection_type_drafts,
    ),
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
    ...(inspectionSessionUid ? { inspectionSessionUid } : {}),
    ...(inspectionSessionVersion > 0 ? { inspectionSessionVersion } : {}),
    ...(inspectionSessionStartedByUserId ? { inspectionSessionStartedByUserId } : {}),
    ...(inspectionSessionScopeVersion ? { inspectionSessionScopeVersion } : {}),
    ...(typeof source.inspectionSessionCanSubmit === 'boolean'
      ? { inspectionSessionCanSubmit: source.inspectionSessionCanSubmit }
      : typeof source.inspection_session_can_submit === 'boolean'
        ? { inspectionSessionCanSubmit: source.inspection_session_can_submit }
        : {}),
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
    fireExtinguisherEntryMode: String(
      source.fireExtinguisherEntryMode || source.fire_extinguisher_entry_mode || '',
    ).trim(),
    fireExtinguisherScannedLocator: String(
      source.fireExtinguisherScannedLocator || source.fire_extinguisher_scanned_locator || '',
    ).trim(),
    fireExtinguisherFocusedAssetKey: String(
      source.fireExtinguisherFocusedAssetKey || source.fire_extinguisher_focused_asset_key || '',
    ).trim(),
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
    highAngleCustomMainLocations: normalizeHighAngleCustomMainLocations(
      source.highAngleCustomMainLocations || source.high_angle_custom_main_locations,
    ),
    highAngleCustomCompartments: normalizeHighAngleCustomCompartments(
      source.highAngleCustomCompartments || source.high_angle_custom_compartments,
    ),
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
    ...hseFields,
  }
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

export const recordToInspectionForm = (record = {}) => normalizeInspectionForm(record)

export const draftToInspectionForm = (draft = {}) => normalizeInspectionForm(draft)

export const buildInspectionPayloadSnapshot = (form = {}) => {
  const normalizedForm = normalizeInspectionForm(form)
  const inspectionType = String(normalizedForm.inspectionType || '').trim()
  const zone = String(normalizedForm.zone || '').trim()
  const zoneId = String(normalizedForm.zoneId || '').trim()
  const mainLocation = String(normalizedForm.mainLocation || '').trim()
  const subLocation = String(normalizedForm.subLocation || '').trim()
  const mainLocationId = String(normalizedForm.mainLocationId || '').trim()
  const subLocationId = String(normalizedForm.subLocationId || '').trim()
  const location = formatInspectionLocation({ zone, mainLocation, subLocation })
  const locationPath = [zone ? `Zone ${zone}` : '', mainLocation, subLocation].filter(Boolean)
  const locationIds = [zoneId, mainLocationId, subLocationId].filter(Boolean)
  const erAuxChecks = isErAuxInspectionType(inspectionType)
    ? getErAuxSubmissionCandidateRows(normalizedForm)
    : []
  const hydraulicChecks = isHydraulicInspectionType(inspectionType)
    ? getHydraulicSubmissionCandidateRows(normalizedForm)
    : []
  const fireExtinguisherChecks = isFireExtinguisherInspectionType(inspectionType)
    ? getFireExtinguisherSubmissionCandidateRows(normalizedForm)
    : []
  const frtDailyChecks = isFrtDailyInspectionType(inspectionType)
    ? getFrtSubmissionDailyChecks(normalizedForm)
    : []
  const frtOneOffChecks = isFrtDailyInspectionType(inspectionType)
    ? getFrtSubmissionOneOffChecks(normalizedForm)
    : []
  const highAngleChecks = isHighAngleInspectionType(inspectionType)
    ? getHighAngleSubmissionCandidateRows(normalizedForm)
    : []
  const highAngleCustomMainLocations = isHighAngleInspectionType(inspectionType)
    ? normalizeHighAngleCustomMainLocations(normalizedForm.highAngleCustomMainLocations)
    : []
  const highAngleCustomCompartments = isHighAngleInspectionType(inspectionType)
    ? normalizeHighAngleCustomCompartments(normalizedForm.highAngleCustomCompartments)
    : []
  const scbaSubmissionSections = isScbaInspectionType(inspectionType)
    ? getScbaSubmissionCandidateSections(normalizedForm)
    : []
  const scbaBackPlateSection = Array.isArray(scbaSubmissionSections)
    ? scbaSubmissionSections.find((section) => section.key === 'backPlate')
    : []
  const scbaCylinderSection = Array.isArray(scbaSubmissionSections)
    ? scbaSubmissionSections.find((section) => section.key === 'cylinder')
    : []
  const scbaFaceMaskSection = Array.isArray(scbaSubmissionSections)
    ? scbaSubmissionSections.find((section) => section.key === 'faceMask')
    : []
  const scbaBackPlateChecks = scbaBackPlateSection?.visibleRows || scbaBackPlateSection?.rows || []
  const scbaCylinderChecks = scbaCylinderSection?.visibleRows || scbaCylinderSection?.rows || []
  const scbaFaceMaskChecks = scbaFaceMaskSection?.visibleRows || scbaFaceMaskSection?.rows || []
  const scbaCustomSections = Array.isArray(scbaSubmissionSections)
    ? scbaSubmissionSections.filter(
        (section) => section.key && section.key.startsWith('customScba-'),
      )
    : []
  const hseFields = isHseInspectionType(inspectionType)
    ? normalizeHseFormFields(normalizedForm)
    : normalizeHseFormFields()
  const isHse = isHseInspectionType(inspectionType)
  const description =
    isHydraulicInspectionType(inspectionType) && !String(normalizedForm.description || '').trim()
      ? buildHydraulicDescription({ ...normalizedForm }, { checks: hydraulicChecks })
      : isFireExtinguisherInspectionType(inspectionType) &&
          !String(normalizedForm.description || '').trim()
        ? buildFireExtinguisherDescription(
            {
              ...normalizedForm,
              location,
              fireExtinguisherChecks,
            },
            { checks: fireExtinguisherChecks },
          )
        : isFrtDailyInspectionType(inspectionType) &&
            !String(normalizedForm.description || '').trim()
          ? buildFrtDescription(
              {
                ...normalizedForm,
                location,
                frtDailyChecks,
                frtOneOffChecks,
              },
              {
                dailyRows: frtDailyChecks,
                oneOffRows: frtOneOffChecks,
              },
            )
          : isHighAngleInspectionType(inspectionType) &&
              !String(normalizedForm.description || '').trim()
            ? buildHighAngleDescription(
                {
                  ...normalizedForm,
                  location,
                  highAngleChecks,
                },
                { checks: highAngleChecks },
              )
            : isScbaInspectionType(inspectionType) &&
                !String(normalizedForm.description || '').trim()
              ? buildScbaDescription(
                  {
                    ...normalizedForm,
                    location,
                    scbaBackPlateChecks,
                    scbaCylinderChecks,
                    scbaFaceMaskChecks,
                    scbaCustomSections,
                  },
                  { sections: scbaSubmissionSections },
                )
              : isHseInspectionType(inspectionType) &&
                  !String(normalizedForm.description || '').trim()
                ? buildHseDescription({ ...normalizedForm, ...hseFields, location })
                : isGeneralInspectionType(inspectionType) &&
                    !String(normalizedForm.description || '').trim()
                  ? buildGeneralDescription({ ...normalizedForm, location })
                  : isErAuxInspectionType(inspectionType) &&
                      !String(normalizedForm.description || '').trim()
                    ? buildErAuxDescription(
                        { ...normalizedForm, location, erAuxChecks },
                        { checks: erAuxChecks },
                      )
                    : String(normalizedForm.description || '').trim()
  const photos = normalizePhotos(normalizedForm.photos)
  const inspectionIssues = isHse ? [] : normalizeInspectionIssues(normalizedForm.inspectionIssues)
  const structuredChecklist = [
    ...(isScbaInspectionType(inspectionType)
      ? buildScbaChecklist(
          {
            ...normalizedForm,
            scbaBackPlateChecks,
            scbaCylinderChecks,
            scbaFaceMaskChecks,
            scbaCustomSections,
          },
          { sections: scbaSubmissionSections },
        )
      : []),
    ...(isErAuxInspectionType(inspectionType)
      ? buildErAuxChecklist({ ...normalizedForm, erAuxChecks }, { checks: erAuxChecks })
      : []),
    ...(isHydraulicInspectionType(inspectionType)
      ? buildHydraulicChecklist({ ...normalizedForm, hydraulicChecks }, { checks: hydraulicChecks })
      : []),
    ...(isFireExtinguisherInspectionType(inspectionType)
      ? buildFireExtinguisherChecklist(
          { ...normalizedForm, fireExtinguisherChecks },
          { checks: fireExtinguisherChecks },
        )
      : []),
    ...(isFrtDailyInspectionType(inspectionType)
      ? buildFrtChecklist(
          {
            ...normalizedForm,
            frtDailyChecks,
            frtOneOffChecks,
          },
          { dailyRows: frtDailyChecks, oneOffRows: frtOneOffChecks },
        )
      : []),
    ...(isHighAngleInspectionType(inspectionType)
      ? buildHighAngleChecklist({ ...normalizedForm, highAngleChecks }, { checks: highAngleChecks })
      : []),
    ...(isHseInspectionType(inspectionType)
      ? buildHseChecklist({ ...normalizedForm, ...hseFields })
      : []),
    ...(isGeneralInspectionType(inspectionType)
      ? buildGeneralChecklist({ ...normalizedForm, location })
      : []),
  ]
  const persistedChecklist = isGeneralInspectionType(inspectionType)
    ? []
    : normalizeChecklist(normalizedForm.checklist)
  const checklist = normalizeChecklist([...structuredChecklist, ...persistedChecklist])
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
    zone,
    zoneId,
    mainLocation,
    subLocation,
    mainLocationId,
    subLocationId,
    locationPath,
    locationIds,
    inspectedAt: String(normalizedForm.inspectedAt || '').trim(),
    description,
    reportRemarks: isHse ? '' : String(normalizedForm.reportRemarks || '').trim(),
    photos,
    inspectionIssues,
    inspectionTypeDrafts: normalizedForm.inspectionTypeDrafts || {},
    issues: inspectionIssues,
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
    highAngleCustomMainLocations,
    highAngleCustomCompartments,
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
    inspectionIssues: normalizeInspectionIssueDrafts(snapshot.inspectionIssues).map((issue) => ({
      ...issue,
      photos: normalizePhotos(issue.photos).map(getPhotoSignature),
    })),
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
    frtDailyChecks: normalizeFrtDailyChecks(snapshot.frtDailyChecks).map((check) => ({
      ...check,
      photos: normalizePhotos(check.photos).map(getPhotoSignature),
      additionalPhotos: normalizePhotos(check.additionalPhotos).map(getPhotoSignature),
    })),
    frtOneOffChecks: normalizeFrtOneOffChecks(snapshot.frtOneOffChecks).map((check) => ({
      ...check,
      photos: normalizePhotos(check.photos).map(getPhotoSignature),
      additionalPhotos: normalizePhotos(check.additionalPhotos).map(getPhotoSignature),
    })),
    highAngleChecks: normalizeHighAngleChecks(snapshot.highAngleChecks).map((check) => ({
      ...check,
      [HIGH_ANGLE_CONDITION_FIELD.photosKey]: normalizePhotos(
        check[HIGH_ANGLE_CONDITION_FIELD.photosKey],
      ).map(getPhotoSignature),
      additionalPhotos: normalizePhotos(check.additionalPhotos).map(getPhotoSignature),
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
