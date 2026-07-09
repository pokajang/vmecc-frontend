import { normalizeInspectionDraft } from 'src/views/inspection/utils'
import { isGeneralInspectionType } from 'src/views/inspection/types/general/helpers'
import { isHseInspectionType } from 'src/views/inspection/types/hse/helpers'

const getInspectionIssuesSource = (source = {}) => {
  const explicitIssues = source.inspectionIssues || source.inspection_issues
  if (explicitIssues) return explicitIssues

  const inspectionType =
    source.incidentType || source.inspectionType || source.inspection_type || ''
  return isGeneralInspectionType(inspectionType) || isHseInspectionType(inspectionType)
    ? source.issues || source.observations || []
    : []
}

export const buildInspectionFormSourceInput = (source = {}) => ({
  selectedLocation: source.selectedLocation || source.location || '',
  mainLocation: source.mainLocation || source.main_location || '',
  subLocation: source.subLocation || source.sub_location || '',
  mainLocationId: source.mainLocationId || source.main_location_id || '',
  subLocationId: source.subLocationId || source.sub_location_id || '',
  locationPath: source.locationPath || source.location_path || [],
  inspectionType: source.incidentType || source.inspectionType || source.inspection_type || '',
  inspectedAt: source.inspectedAt || source.inspected_at || '',
  description: source.description || '',
  reportRemarks: source.reportRemarks ?? source.report_remarks ?? '',
  photos: source.photos || [],
  inspectionIssues: getInspectionIssuesSource(source),
  findings: source.findings || [],
  checklist: source.checklist || [],
  inspectionActor: source.inspectionActor || source.inspection_actor || null,
  submittedByRole: source.submittedByRole || source.submitted_by_role || '',
  submittedByRoleCode: source.submittedByRoleCode || source.submitted_by_role_code || '',
  erAuxInspectedBy: source.erAuxInspectedBy || source.er_aux_inspected_by || '',
  erAuxInspectionDate: source.erAuxInspectionDate || source.er_aux_inspection_date || '',
  erAuxChecks: source.erAuxChecks || source.er_aux_checks || [],
  erAuxEquipmentRows: source.erAuxEquipmentRows || source.er_aux_equipment_rows || [],
  fireExtinguisherInspectedBy:
    source.fireExtinguisherInspectedBy || source.fire_extinguisher_inspected_by || '',
  fireExtinguisherInspectionDate:
    source.fireExtinguisherInspectionDate || source.fire_extinguisher_inspection_date || '',
  fireExtinguisherChecks: source.fireExtinguisherChecks || source.fire_extinguisher_checks || [],
  hydraulicChecks: source.hydraulicChecks || source.hydraulic_checks || [],
  hydraulicEquipmentRows: source.hydraulicEquipmentRows || source.hydraulic_equipment_rows || [],
  frtInspectedBy: source.frtInspectedBy || source.frt_inspected_by || '',
  frtInspectionDate: source.frtInspectionDate || source.frt_inspection_date || '',
  frtShift: source.frtShift || source.frt_shift || '',
  frtTruckId: source.frtTruckId || source.frt_truck_id || '',
  frtTruckPlateNo: source.frtTruckPlateNo || source.frt_truck_plate_no || '',
  frtTruckReference: source.frtTruckReference || source.frt_truck_reference || {},
  frtDailyChecks: source.frtDailyChecks || source.frt_daily_checks || [],
  frtDailyRemarks: source.frtDailyRemarks || source.frt_daily_remarks || '',
  frtOneOffChecks: source.frtOneOffChecks || source.frt_one_off_checks || [],
  frtOneOffRemarks: source.frtOneOffRemarks || source.frt_one_off_remarks || '',
  highAngleInspectedBy: source.highAngleInspectedBy || source.high_angle_inspected_by || '',
  highAngleInspectionDate:
    source.highAngleInspectionDate || source.high_angle_inspection_date || '',
  highAngleCustomMainLocations:
    source.highAngleCustomMainLocations || source.high_angle_custom_main_locations || [],
  highAngleCustomCompartments:
    source.highAngleCustomCompartments || source.high_angle_custom_compartments || [],
  highAngleChecks: source.highAngleChecks || source.high_angle_checks || [],
  scbaInspectedBy: source.scbaInspectedBy || source.scba_inspected_by || '',
  scbaInspectionDate: source.scbaInspectionDate || source.scba_inspection_date || '',
  scbaBackPlateChecks: source.scbaBackPlateChecks || source.scba_back_plate_checks || [],
  scbaCylinderChecks: source.scbaCylinderChecks || source.scba_cylinder_checks || [],
  scbaFaceMaskChecks: source.scbaFaceMaskChecks || source.scba_face_mask_checks || [],
  scbaCustomSections: source.scbaCustomSections || source.scba_custom_sections || [],
  hseInspectedBy: source.hseInspectedBy || source.hse_inspected_by || '',
  hseInspectionDate: source.hseInspectionDate || source.hse_inspection_date || '',
  hseSelections: source.hseSelections || source.hse_selections || [],
  hseAreaConditionRemarks:
    source.hseAreaConditionRemarks || source.hse_area_condition_remarks || '',
  hseUnsafeActDetails: source.hseUnsafeActDetails || source.hse_unsafe_act_details || '',
  hseUnsafeConditionDetails:
    source.hseUnsafeConditionDetails || source.hse_unsafe_condition_details || '',
  hseEnvironmentalDetails: source.hseEnvironmentalDetails || source.hse_environmental_details || '',
  hseSeverity: source.hseSeverity || source.hse_severity || '',
  hseImmediateAction: source.hseImmediateAction || source.hse_immediate_action || '',
  hseCorrectiveAction: source.hseCorrectiveAction || source.hse_corrective_action || '',
  hseResponsiblePerson: source.hseResponsiblePerson || source.hse_responsible_person || '',
  hseTargetDate: source.hseTargetDate || source.hse_target_date || '',
  hseRemarks: source.hseRemarks || source.hse_remarks || '',
})

export const buildRecordInspectionFormSource = (record = {}) =>
  buildInspectionFormSourceInput(normalizeInspectionDraft(record))

export const buildDraftInspectionFormSource = (draft = {}) =>
  buildInspectionFormSourceInput(normalizeInspectionDraft(draft))

export const selectInspectionInitialFormSource = ({
  routeMode = 'new',
  routeRecordId = '',
  workspace = null,
  draftPayload = null,
  record = null,
  isInspectionDraftPayload,
  getInspectionDraftMeta,
  defaultInspectionForm,
  getDefaultInspectionDateTime,
}) => {
  const normalizedRecordId = String(routeRecordId || '').trim()
  const workspaceMode = String(workspace?.mode || '').trim() === 'edit' ? 'edit' : 'new'
  const workspaceRecordId = String(workspace?.recordId || '').trim()

  if (workspace?.form && workspaceMode === routeMode && workspaceRecordId === normalizedRecordId) {
    return { source: 'workspace', form: workspace.form }
  }

  if (isInspectionDraftPayload(draftPayload)) {
    const meta = getInspectionDraftMeta(draftPayload)
    if (meta.mode === routeMode && String(meta.editReportId || '').trim() === normalizedRecordId) {
      return { source: 'draft', form: buildDraftInspectionFormSource(draftPayload) }
    }
  }

  if (routeMode === 'edit' && record) {
    return { source: 'record', form: buildRecordInspectionFormSource(record) }
  }

  return {
    source: 'empty',
    form: {
      ...defaultInspectionForm,
      inspectedAt: getDefaultInspectionDateTime(),
    },
  }
}
