import { ClipboardCheck } from 'lucide-react'
import {
  buildGeneralChecklist,
  buildGeneralDescription,
  GENERAL_INSPECTION_TYPE,
  getGeneralCheckSummary,
  getGeneralMissingFields,
  isGeneralInspectionType,
} from './helpers'
import { GeneralReadOnlySection } from './section'

const generalInspectionDefinition = {
  key: 'general-inspection',
  inspectionType: GENERAL_INSPECTION_TYPE,
  title: 'General Inspection',
  description: 'General condition, access, housekeeping, hazard, and compliance checks.',
  iconKey: 'ClipboardCheck',
  icon: ClipboardCheck,
  implemented: true,
  formMode: 'generic',
  supportsEquipmentCatalog: false,
  photoEvidenceTitle: 'Upload Photos and Describe',
  initialFormState: {},
  missingFieldKeys: ['description', 'photos'],
  isInspectionType: isGeneralInspectionType,
  getSummary: getGeneralCheckSummary,
  getMissingFields: getGeneralMissingFields,
  buildChecklist: buildGeneralChecklist,
  buildDescription: buildGeneralDescription,
  ReadOnlySection: GeneralReadOnlySection,
}

export default generalInspectionDefinition
