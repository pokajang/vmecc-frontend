import { Wrench } from 'lucide-react'
import {
  buildHydraulicChecklist,
  buildHydraulicDescription,
  getHydraulicCheckSummary,
  getHydraulicMissingFields,
  getHydraulicVisibleChecks,
  HYDRAULIC_CHECK_FIELDS,
  HYDRAULIC_CHECK_STATUS_OPTIONS,
  HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE,
  isHydraulicInspectionType,
  normalizeHydraulicChecks,
  normalizeHydraulicEquipmentRows,
} from './helpers'
import { createLocationDetailContextFields } from '../detailConfigHelpers'
import { buildMainLocationContinuationOptions, CONTINUATION_TOKENS } from '../continuationHelpers'
import { HydraulicEditSection, HydraulicReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildHydraulicDetailFindingItems, renderHydraulicDetailFindingContent } from './detail'

const hydraulicInspectionDefinition = {
  key: 'hydraulic-rescue-tools-inspection',
  inspectionType: HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE,
  title: 'Hydraulic Rescue Tools',
  description: 'Hydraulic tool physical, mechanical, leakage, function, and defect checks.',
  iconKey: 'Wrench',
  icon: Wrench,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: true,
  equipmentRowsField: 'hydraulicEquipmentRows',
  checksField: 'hydraulicChecks',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  fieldRefKey: 'hydraulicChecks',
  missingFieldKeys: ['hydraulicChecks', 'hydraulicRemarks'],
  initialFormState: {
    hydraulicChecks: [],
    hydraulicEquipmentRows: [],
  },
  isInspectionType: isHydraulicInspectionType,
  normalizeChecks: normalizeHydraulicChecks,
  normalizeEquipmentRows: normalizeHydraulicEquipmentRows,
  getVisibleChecks: getHydraulicVisibleChecks,
  getSummary: getHydraulicCheckSummary,
  getMissingFields: getHydraulicMissingFields,
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildMainLocationContinuationOptions({
      form,
      context,
      getSummary: getHydraulicCheckSummary,
      getMissingFields: getHydraulicMissingFields,
      label: CONTINUATION_TOKENS.location,
    }),
  buildChecklist: buildHydraulicChecklist,
  buildDescription: buildHydraulicDescription,
  statusOptions: HYDRAULIC_CHECK_STATUS_OPTIONS,
  checkFields: HYDRAULIC_CHECK_FIELDS,
  EditSection: HydraulicEditSection,
  ReadOnlySection: HydraulicReadOnlySection,
  detailContextFields: createLocationDetailContextFields({
    typeLabel: 'Hydraulic Rescue Tools',
    inspectionType: HYDRAULIC_RESCUE_TOOLS_INSPECTION_TYPE,
    primaryLabel: 'Location',
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'Equipment',
  buildDetailFindingItems: buildHydraulicDetailFindingItems,
  renderDetailFindingContent: renderHydraulicDetailFindingContent,
}

export default hydraulicInspectionDefinition
