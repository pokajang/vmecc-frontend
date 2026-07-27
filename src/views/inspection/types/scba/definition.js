import { Gauge } from 'lucide-react'
import {
  buildScbaChecklist,
  buildScbaDescription,
  getScbaCheckSummary,
  getScbaMissingFields,
  getScbaReadOnlySummary,
  getScbaVisibleSections,
  isScbaInspectionType,
  normalizeScbaBackPlateChecks,
  normalizeScbaCustomSections,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
  SCBA_INSPECTION_TYPE,
} from './helpers'
import { createLocationDetailContextFields } from '../detailConfigHelpers'
import { buildMainLocationContinuationOptions, CONTINUATION_TOKENS } from '../continuationHelpers'
import { ScbaEditSection, ScbaReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildScbaDetailFindingItems, renderScbaDetailFindingContent } from './detail'

const scbaInspectionDefinition = {
  key: 'scba-inspection',
  inspectionType: SCBA_INSPECTION_TYPE,
  title: 'SCBA',
  description: 'SCBA back plate, cylinder, and face mask condition checks.',
  iconKey: 'Gauge',
  icon: Gauge,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: false,
  checksField: 'scbaChecks',
  fieldRefKey: 'scbaChecks',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  missingFieldKeys: ['scbaChecks', 'scbaRemarks'],
  initialFormState: {
    scbaInspectedBy: '',
    scbaInspectionDate: '',
    scbaBackPlateChecks: [],
    scbaCylinderChecks: [],
    scbaFaceMaskChecks: [],
    scbaCustomSections: [],
  },
  isInspectionType: isScbaInspectionType,
  getSummary: getScbaCheckSummary,
  getReadOnlySummary: getScbaReadOnlySummary,
  getVisibleChecks: getScbaVisibleSections,
  getMissingFields: getScbaMissingFields,
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildMainLocationContinuationOptions({
      form,
      context,
      getSummary: getScbaCheckSummary,
      getMissingFields: getScbaMissingFields,
      label: CONTINUATION_TOKENS.location,
    }),
  buildChecklist: buildScbaChecklist,
  buildDescription: buildScbaDescription,
  normalizeBackPlateChecks: normalizeScbaBackPlateChecks,
  normalizeCylinderChecks: normalizeScbaCylinderChecks,
  normalizeFaceMaskChecks: normalizeScbaFaceMaskChecks,
  normalizeCustomSections: normalizeScbaCustomSections,
  EditSection: ScbaEditSection,
  ReadOnlySection: ScbaReadOnlySection,
  detailContextFields: createLocationDetailContextFields({
    typeLabel: 'SCBA',
    inspectionType: SCBA_INSPECTION_TYPE,
    primaryLabel: 'Location',
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'SCBA Items',
  buildDetailFindingItems: buildScbaDetailFindingItems,
  renderDetailFindingContent: renderScbaDetailFindingContent,
}

export default scbaInspectionDefinition
