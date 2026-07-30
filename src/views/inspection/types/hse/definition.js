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
import { HseEditSection, HseReadOnlySection } from './v2Section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildHseDetailFindingItems, renderHseDetailFindingContent } from './detail'

const hseInspectionDefinition = {
  key: 'health-safety-environment-inspection',
  inspectionType: HSE_INSPECTION_TYPE,
  title: 'Health Safety Environment',
  description: 'Record an unsafe act or condition with supporting evidence.',
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
  initialFormState: HSE_FORM_DEFAULTS,
  isInspectionType: isHseInspectionType,
  getSummary: getHseCheckSummary,
  getMissingFields: getHseMissingFields,
  buildChecklist: buildHseChecklist,
  buildDescription: buildHseDescription,
  normalizeChecks: normalizeHseFormFields,
  EditSection: HseEditSection,
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
