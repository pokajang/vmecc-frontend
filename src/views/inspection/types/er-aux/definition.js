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
import { createLocationDetailContextFields } from '../detailConfigHelpers'
import { buildMainLocationContinuationOptions } from '../continuationHelpers'
import { ErAuxEditSection, ErAuxReadOnlySection } from './section'

const erAuxInspectionDefinition = {
  key: 'er-aux-equipment-inspection',
  inspectionType: ER_AUX_EQUIPMENT_INSPECTION_TYPE,
  title: 'Emergency Response Auxiliary Equipment',
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
  missingFieldKeys: ['erAuxChecks', 'erAuxRemarks'],
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
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildMainLocationContinuationOptions({
      form,
      context,
      getSummary: getErAuxCheckSummary,
      getMissingFields: getErAuxMissingFields,
      label: 'location',
    }),
  buildChecklist: buildErAuxChecklist,
  buildDescription: buildErAuxDescription,
  EditSection: ErAuxEditSection,
  ReadOnlySection: ErAuxReadOnlySection,
  detailContextFields: createLocationDetailContextFields({
    typeLabel: 'Emergency Response Auxiliary Equipment',
    inspectionType: ER_AUX_EQUIPMENT_INSPECTION_TYPE,
    primaryLabel: 'Location',
  }),
  detailFindingsMode: 'block',
  detailFindingsTitle: 'Equipment',
}

export default erAuxInspectionDefinition
