import { ClipboardList } from 'lucide-react'
import {
  buildErAuxChecklist,
  buildErAuxDescription,
  ER_AUX_EQUIPMENT_INSPECTION_TYPE,
  getErAuxCheckSummary,
  getErAuxMissingFields,
  getErAuxVisibleChecks,
  isErAuxInspectionType,
  normalizeErAuxChecks,
  normalizeErAuxEquipmentRows,
} from './helpers'
import { ErAuxEditSection, ErAuxReadOnlySection } from './section'

const erAuxInspectionDefinition = {
  key: 'er-aux-equipment-inspection',
  inspectionType: ER_AUX_EQUIPMENT_INSPECTION_TYPE,
  title: 'ER Aux Equipment',
  description: 'Emergency response auxiliary equipment inventory and condition checks.',
  iconKey: 'ClipboardList',
  icon: ClipboardList,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: true,
  equipmentRowsField: 'erAuxEquipmentRows',
  checksField: 'erAuxChecks',
  photoEvidenceTitle: 'General Evidence Photos',
  fieldRefKey: 'erAuxChecks',
  missingFieldKeys: ['erAuxSession', 'erAuxChecks', 'erAuxRemarks'],
  initialFormState: {
    erAuxInspectedBy: '',
    erAuxInspectionDate: '',
    erAuxChecks: [],
    erAuxEquipmentRows: [],
  },
  isInspectionType: isErAuxInspectionType,
  normalizeChecks: normalizeErAuxChecks,
  normalizeEquipmentRows: normalizeErAuxEquipmentRows,
  getVisibleChecks: getErAuxVisibleChecks,
  getSummary: getErAuxCheckSummary,
  getMissingFields: getErAuxMissingFields,
  buildChecklist: buildErAuxChecklist,
  buildDescription: buildErAuxDescription,
  EditSection: ErAuxEditSection,
  ReadOnlySection: ErAuxReadOnlySection,
}

export default erAuxInspectionDefinition
