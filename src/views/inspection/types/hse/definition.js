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
import { HseEditSection, HseReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildHseDetailFindingItems, renderHseDetailFindingContent } from './detail'

const hseInspectionDefinition = {
  key: 'health-safety-environment-inspection',
  inspectionType: HSE_INSPECTION_TYPE,
  title: 'Health Safety Environment',
  description: 'Area-satisfactory, unsafe act, unsafe condition, and environmental observations.',
  iconKey: 'ShieldCheck',
  icon: ShieldCheck,
  implemented: true,
  formMode: 'structured',
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
