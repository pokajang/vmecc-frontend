import { HardHat } from 'lucide-react'
import {
  buildHighAngleChecklist,
  buildHighAngleDescription,
  getHighAngleCheckSummary,
  getHighAngleMissingFields,
  getHighAngleVisibleChecks,
  HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
  getHighAngleMainLocationOptions,
  isHighAngleInspectionType,
  normalizeHighAngleChecks,
} from './helpers'
import { createLocationDetailContextFields } from '../detailConfigHelpers'
import { buildMainLocationContinuationOptions, CONTINUATION_TOKENS } from '../continuationHelpers'
import { HighAngleEditSection, HighAngleReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildHighAngleDetailFindingItems, renderHighAngleDetailFindingContent } from './detail'

const highAngleInspectionDefinition = {
  key: 'high-angle-rescue-equipment-inspection',
  inspectionType: HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
  title: 'High Angle Rescue Equipment',
  description: 'Workbook-backed rescue kit checks with fixed quantity, condition, and remarks.',
  iconKey: 'HardHat',
  icon: HardHat,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: false,
  supportsCustomLocations: true,
  supportsSubLocations: false,
  supportsHighAngleCompartments: true,
  supportsHighAngleCustomItems: true,
  checksField: 'highAngleChecks',
  fieldRefKey: 'highAngleChecks',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  missingFieldKeys: ['highAngleChecks', 'highAngleRemarks'],
  initialFormState: {
    highAngleInspectedBy: '',
    highAngleInspectionDate: '',
    highAngleCustomMainLocations: [],
    highAngleCustomCompartments: [],
    highAngleChecks: [],
  },
  isInspectionType: isHighAngleInspectionType,
  getSummary: getHighAngleCheckSummary,
  getVisibleChecks: getHighAngleVisibleChecks,
  getMissingFields: getHighAngleMissingFields,
  buildContinuationOptions: (form) =>
    buildMainLocationContinuationOptions({
      form,
      options: getHighAngleMainLocationOptions(form),
      getSummary: getHighAngleCheckSummary,
      getMissingFields: getHighAngleMissingFields,
      label: CONTINUATION_TOKENS.kit,
    }),
  buildChecklist: buildHighAngleChecklist,
  buildDescription: buildHighAngleDescription,
  normalizeChecks: normalizeHighAngleChecks,
  EditSection: HighAngleEditSection,
  ReadOnlySection: HighAngleReadOnlySection,
  detailContextFields: createLocationDetailContextFields({
    typeLabel: 'High Angle Rescue Equipment',
    inspectionType: HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
    primaryLabel: 'Main Location',
    secondaryLabel: 'Compartment',
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'Equipment',
  buildDetailFindingItems: buildHighAngleDetailFindingItems,
  renderDetailFindingContent: renderHighAngleDetailFindingContent,
}

export default highAngleInspectionDefinition
