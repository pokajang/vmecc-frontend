import { Gauge } from 'lucide-react'
import {
  buildScbaChecklist,
  buildScbaDescription,
  getScbaCheckSummary,
  getScbaMissingFields,
  getScbaVisibleSections,
  isScbaInspectionType,
  normalizeScbaBackPlateChecks,
  normalizeScbaCylinderChecks,
  normalizeScbaFaceMaskChecks,
  SCBA_INSPECTION_TYPE,
} from './helpers'
import { ScbaEditSection, ScbaReadOnlySection } from './section'

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
  photoEvidenceTitle: 'General Evidence Photos',
  missingFieldKeys: ['scbaSession', 'scbaChecks', 'scbaRemarks'],
  initialFormState: {
    scbaInspectedBy: '',
    scbaInspectionDate: '',
    scbaBackPlateChecks: [],
    scbaCylinderChecks: [],
    scbaFaceMaskChecks: [],
  },
  isInspectionType: isScbaInspectionType,
  getSummary: getScbaCheckSummary,
  getVisibleChecks: getScbaVisibleSections,
  getMissingFields: getScbaMissingFields,
  buildChecklist: buildScbaChecklist,
  buildDescription: buildScbaDescription,
  normalizeBackPlateChecks: normalizeScbaBackPlateChecks,
  normalizeCylinderChecks: normalizeScbaCylinderChecks,
  normalizeFaceMaskChecks: normalizeScbaFaceMaskChecks,
  EditSection: ScbaEditSection,
  ReadOnlySection: ScbaReadOnlySection,
}

export default scbaInspectionDefinition
