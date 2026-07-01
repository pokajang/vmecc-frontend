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
import { HydraulicEditSection, HydraulicReadOnlySection } from './section'

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
  photoEvidenceTitle: 'General Evidence Photos',
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
  buildChecklist: buildHydraulicChecklist,
  buildDescription: buildHydraulicDescription,
  statusOptions: HYDRAULIC_CHECK_STATUS_OPTIONS,
  checkFields: HYDRAULIC_CHECK_FIELDS,
  EditSection: HydraulicEditSection,
  ReadOnlySection: HydraulicReadOnlySection,
}

export default hydraulicInspectionDefinition
