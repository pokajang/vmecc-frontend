import { Flame } from 'lucide-react'
import {
  buildFireExtinguisherChecklist,
  buildFireExtinguisherDescription,
  FIRE_EXTINGUISHER_INSPECTION_TYPE,
  getFireExtinguisherCheckSummary,
  getFireExtinguisherMissingFields,
  getFireExtinguisherVisibleChecks,
  isFireExtinguisherInspectionType,
  normalizeFireExtinguisherChecks,
} from './helpers'
import { FireExtinguisherEditSection, FireExtinguisherReadOnlySection } from './section'

const fireExtinguisherInspectionDefinition = {
  key: 'fire-extinguisher-inspection',
  inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
  title: 'Fire Extinguisher',
  description:
    'Extinguisher location, certification, physical, signage, box, and operational checks.',
  iconKey: 'Flame',
  icon: Flame,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: false,
  supportsFireExtinguisherCatalog: true,
  checksField: 'fireExtinguisherChecks',
  catalogRowsField: 'fireExtinguisherCatalogRows',
  fieldRefKey: 'fireExtinguisherChecks',
  photoEvidenceTitle: 'General Evidence Photos',
  missingFieldKeys: [
    'fireExtinguisherSession',
    'fireExtinguisherChecks',
    'fireExtinguisherRemarks',
  ],
  initialFormState: {
    fireExtinguisherInspectedBy: '',
    fireExtinguisherInspectionDate: '',
    fireExtinguisherChecks: [],
    fireExtinguisherCatalogRows: [],
  },
  isInspectionType: isFireExtinguisherInspectionType,
  getSummary: getFireExtinguisherCheckSummary,
  getVisibleChecks: getFireExtinguisherVisibleChecks,
  getMissingFields: getFireExtinguisherMissingFields,
  buildChecklist: buildFireExtinguisherChecklist,
  buildDescription: buildFireExtinguisherDescription,
  normalizeChecks: normalizeFireExtinguisherChecks,
  EditSection: FireExtinguisherEditSection,
  ReadOnlySection: FireExtinguisherReadOnlySection,
}

export default fireExtinguisherInspectionDefinition
