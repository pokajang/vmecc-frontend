import { ClipboardCheck } from 'lucide-react'

export const GENERAL_INSPECTION_TYPE = 'General Inspection'

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
  missingFieldKeys: [],
}

export default generalInspectionDefinition
