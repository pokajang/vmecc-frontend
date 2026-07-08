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
import { createZoneLocationDetailContextFields } from '../detailConfigHelpers'
import {
  buildFireExtinguisherDetailFindingItems,
  FireExtinguisherEditSection,
  FireExtinguisherReadOnlySection,
  renderFireExtinguisherDetailFindingContent,
} from './section'

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
  usesZoneLocationFlow: true,
  mainLocationLabel: 'Choose Main Area',
  mainLocationSearchPlaceholder: 'Search main area...',
  mainLocationErrorLabel: 'Choose a fire extinguisher zone and main area.',
  checksField: 'fireExtinguisherChecks',
  catalogRowsField: 'fireExtinguisherCatalogRows',
  fieldRefKey: 'fireExtinguisherChecks',
  photoEvidenceTitle: 'General Evidence Photos',
  missingFieldKeys: ['fireExtinguisherChecks', 'fireExtinguisherRemarks'],
  initialFormState: {
    zone: '',
    zoneId: '',
    fireExtinguisherInspectedBy: '',
    fireExtinguisherInspectionDate: '',
    fireExtinguisherChecks: [],
    fireExtinguisherCatalogRows: [],
    fireExtinguisherEntryMode: '',
    fireExtinguisherScannedLocator: '',
    fireExtinguisherFocusedAssetKey: '',
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
  detailContextFields: createZoneLocationDetailContextFields({
    typeLabel: 'Fire Extinguisher',
    inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'Extinguishers',
  buildDetailFindingItems: buildFireExtinguisherDetailFindingItems,
  renderDetailFindingContent: renderFireExtinguisherDetailFindingContent,
}

export default fireExtinguisherInspectionDefinition
