import { Truck } from 'lucide-react'
import {
  buildFrtChecklist,
  buildFrtDescription,
  FRT_DAILY_INSPECTION_TYPE,
  getFrtCheckSummary,
  getFrtCompartmentOptions,
  getFrtMissingFields,
  getFrtReadOnlySummary,
  getFrtVisibleDailyChecks,
  isFrtDailyInspectionType,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
} from './helpers'
import { createTruckDetailContextFields } from '../detailConfigHelpers'
import { buildSubLocationContinuationOptions, CONTINUATION_TOKENS } from '../continuationHelpers'
import { FrtDailyEditSection, FrtDailyReadOnlySection } from './section'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import { buildFrtDetailFindingItems, renderFrtDetailFindingContent } from './detail'

const frtDailyInspectionDefinition = {
  key: 'frt-daily-inspection',
  inspectionType: FRT_DAILY_INSPECTION_TYPE,
  title: 'Fire Truck Daily Readiness',
  description: 'Inspect daily truck readiness and scheduled equipment checks.',
  iconKey: 'Truck',
  icon: Truck,
  implemented: true,
  formMode: 'structured',
  supportsEquipmentCatalog: false,
  supportsFireTruckCatalog: true,
  supportsCustomLocations: false,
  supportsSubLocations: true,
  usesCompartmentSelection: true,
  mainLocationLabel: 'Choose Truck',
  mainLocationSearchPlaceholder: 'Search truck plate...',
  mainLocationErrorLabel: 'Choose a truck.',
  subLocationLabel: 'Compartment',
  subLocationErrorLabel: 'Choose a compartment.',
  checksField: 'frtDailyChecks',
  fieldRefKey: 'frtChecks',
  photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle,
  missingFieldKeys: [
    'frtSession',
    'frtCompartment',
    'frtDailyChecks',
    'frtDailyRemarks',
    'frtOneOffChecks',
    'frtOneOffRemarks',
  ],
  initialFormState: {
    frtInspectedBy: '',
    frtInspectionDate: '',
    frtShift: '',
    frtTruckId: '',
    frtTruckPlateNo: '',
    frtTruckReference: normalizeFrtTruckReference(),
    frtCustomCompartments: [],
    frtDailyChecks: [],
    frtDailyRemarks: '',
    frtOneOffChecks: [],
    frtOneOffRemarks: '',
  },
  isInspectionType: isFrtDailyInspectionType,
  getSummary: getFrtCheckSummary,
  getReadOnlySummary: getFrtReadOnlySummary,
  getVisibleChecks: getFrtVisibleDailyChecks,
  getMissingFields: getFrtMissingFields,
  getCompartmentOptions: getFrtCompartmentOptions,
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildSubLocationContinuationOptions({
      form,
      getOptions: getFrtCompartmentOptions,
      label: CONTINUATION_TOKENS.compartment,
      parentLabel:
        context.selectedFireTruckPlate || form.frtTruckPlateNo || form.mainLocation || 'Fire truck',
    }),
  buildChecklist: buildFrtChecklist,
  buildDescription: buildFrtDescription,
  normalizeDailyChecks: normalizeFrtDailyChecks,
  normalizeOneOffChecks: normalizeFrtOneOffChecks,
  normalizeTruckReference: normalizeFrtTruckReference,
  EditSection: FrtDailyEditSection,
  ReadOnlySection: FrtDailyReadOnlySection,
  detailContextFields: createTruckDetailContextFields({
    typeLabel: 'Fire Truck Daily Readiness',
    inspectionType: FRT_DAILY_INSPECTION_TYPE,
  }),
  detailFindingsMode: 'itemized',
  detailFindingsTitle: 'Truck Readiness',
  buildDetailFindingItems: buildFrtDetailFindingItems,
  renderDetailFindingContent: renderFrtDetailFindingContent,
}

export default frtDailyInspectionDefinition
