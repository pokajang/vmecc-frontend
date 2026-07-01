import { HardHat } from 'lucide-react'
import {
  buildHighAngleChecklist,
  buildHighAngleDescription,
  getHighAngleCheckSummary,
  getHighAngleMissingFields,
  getHighAngleVisibleChecks,
  HIGH_ANGLE_RESCUE_EQUIPMENT_INSPECTION_TYPE,
  isHighAngleInspectionType,
  normalizeHighAngleChecks,
} from './helpers'
import { HighAngleEditSection, HighAngleReadOnlySection } from './section'

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
  supportsCustomLocations: false,
  supportsSubLocations: false,
  checksField: 'highAngleChecks',
  fieldRefKey: 'highAngleChecks',
  photoEvidenceTitle: 'General Evidence Photos',
  missingFieldKeys: ['highAngleSession', 'highAngleChecks', 'highAngleRemarks'],
  initialFormState: {
    highAngleInspectedBy: '',
    highAngleInspectionDate: '',
    highAngleChecks: [],
  },
  isInspectionType: isHighAngleInspectionType,
  getSummary: getHighAngleCheckSummary,
  getVisibleChecks: getHighAngleVisibleChecks,
  getMissingFields: getHighAngleMissingFields,
  buildChecklist: buildHighAngleChecklist,
  buildDescription: buildHighAngleDescription,
  normalizeChecks: normalizeHighAngleChecks,
  EditSection: HighAngleEditSection,
  ReadOnlySection: HighAngleReadOnlySection,
}

export default highAngleInspectionDefinition
