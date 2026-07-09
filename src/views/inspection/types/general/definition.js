import { ClipboardCheck } from 'lucide-react'
import {
  buildGeneralChecklist,
  buildGeneralDescription,
  GENERAL_INSPECTION_TYPE,
  getGeneralCheckSummary,
  getGeneralMissingFields,
  isGeneralInspectionType,
} from './helpers'
import { createZoneLocationDetailContextFields } from '../detailConfigHelpers'
import { GeneralReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'

const generalInspectionDefinition = {
  key: 'general-inspection',
  inspectionType: GENERAL_INSPECTION_TYPE,
  title: 'General Inspection',
  description: 'General condition, access, housekeeping, hazard, and compliance notes.',
  iconKey: 'ClipboardCheck',
  icon: ClipboardCheck,
  implemented: true,
  formMode: 'generic',
  supportsEquipmentCatalog: false,
  usesZoneLocationFlow: true,
  mainLocationLabel: 'Choose Main Area',
  mainLocationSearchPlaceholder: 'Search main area...',
  mainLocationErrorLabel: 'Choose a zone and main area.',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  initialFormState: {},
  missingFieldKeys: [],
  isInspectionType: isGeneralInspectionType,
  getSummary: getGeneralCheckSummary,
  getMissingFields: getGeneralMissingFields,
  buildChecklist: buildGeneralChecklist,
  buildDescription: buildGeneralDescription,
  ReadOnlySection: GeneralReadOnlySection,
  detailContextFields: createZoneLocationDetailContextFields({
    typeLabel: 'General Inspection',
    inspectionType: GENERAL_INSPECTION_TYPE,
  }),
  detailFindingsMode: 'block',
  detailFindingsTitle: 'Findings',
}

export default generalInspectionDefinition
