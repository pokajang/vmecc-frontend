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
import { buildSubLocationContinuationOptions, CONTINUATION_TOKENS } from '../continuationHelpers'
import { createZoneLocationDetailContextFields } from '../detailConfigHelpers'
import {
  buildFireExtinguisherDetailFindingItems,
  FireExtinguisherEditSection,
  FireExtinguisherReadOnlySection,
  renderFireExtinguisherDetailFindingContent,
} from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'

const text = (value) => String(value || '').trim()

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
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
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
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildSubLocationContinuationOptions({
      form: {
        ...form,
        subLocation:
          form.subLocation || form.currentSubLocation || form.location || form.sub_location || '',
      },
      getOptions: () => context?.subLocationOptions || context?.location?.subLocationOptions || [],
      getSummary: getFireExtinguisherCheckSummary,
      getMissingFields: getFireExtinguisherMissingFields,
      label: CONTINUATION_TOKENS.location,
      parentLabel: text(form.mainLocation),
    }),
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
