import { ShieldCheck } from 'lucide-react'
import {
  buildHseChecklist,
  buildHseDescription,
  getHseCheckSummary,
  getHseMissingFields,
  HSE_FORM_DEFAULTS,
  HSE_INSPECTION_TYPE,
  isHseInspectionType,
  normalizeHseFormFields,
} from './helpers'
import { createZoneLocationDetailContextFields } from '../detailConfigHelpers'
import { HseReadOnlySection } from './section'
import { HseVersionedEditSection } from './v2Section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildHseDetailFindingItems, renderHseDetailFindingContent } from './detail'
import featureFlags from 'src/config/featureFlags'

const initialHseFormState = featureFlags.inspectionHseV2Enabled
  ? HSE_FORM_DEFAULTS
  : { ...HSE_FORM_DEFAULTS, hsePayloadVersion: 0 }

const hseInspectionDefinition = {
  key: 'health-safety-environment-inspection',
  inspectionType: HSE_INSPECTION_TYPE,
  title: 'Health Safety Environment',
  description: 'Record an unsafe act or unsafe condition with a description and photo.',
  iconKey: 'ShieldCheck',
  icon: ShieldCheck,
  implemented: true,
  formMode: 'structured',
  submissionMode: 'direct',
  ownsRootEvidence: true,
  supportsGenericFindings: false,
  payloadVersion: 2,
  supportsEquipmentCatalog: false,
  usesZoneLocationFlow: true,
  mainLocationLabel: 'Choose Main Area',
  mainLocationSearchPlaceholder: 'Search main area...',
  mainLocationErrorLabel: 'Choose a zone and main area.',
  checksField: 'hseSelections',
  fieldRefKey: 'hseObservation',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  missingFieldKeys: ['hseSelection', 'hseDetails'],
  initialFormState: initialHseFormState,
  isInspectionType: isHseInspectionType,
  getSummary: getHseCheckSummary,
  getMissingFields: getHseMissingFields,
  buildChecklist: buildHseChecklist,
  buildDescription: buildHseDescription,
  normalizeChecks: normalizeHseFormFields,
  EditSection: HseVersionedEditSection,
  ReadOnlySection: HseReadOnlySection,
  detailContextFields: createZoneLocationDetailContextFields({
    typeLabel: 'Health Safety Environment',
    inspectionType: HSE_INSPECTION_TYPE,
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'HSE Observation',
  buildDetailFindingItems: buildHseDetailFindingItems,
  renderDetailFindingContent: renderHseDetailFindingContent,
}

export default hseInspectionDefinition
