import { Truck } from 'lucide-react'
import {
  buildFrtChecklist,
  buildFrtDescription,
  FRT_DAILY_INSPECTION_TYPE,
  getFrtCheckSummary,
  getFrtCompartmentOptions,
  getFrtMissingFields,
  getFrtVisibleDailyChecks,
  isFrtDailyInspectionType,
  normalizeFrtDailyChecks,
  normalizeFrtOneOffChecks,
  normalizeFrtTruckReference,
} from './helpers'
import { createTruckDetailContextFields } from '../detailConfigHelpers'
import { buildSubLocationContinuationOptions } from '../continuationHelpers'
import { FrtDailyEditSection, FrtDailyReadOnlySection } from './section'

const frtDailyInspectionDefinition = {
  key: 'frt-daily-inspection',
  inspectionType: FRT_DAILY_INSPECTION_TYPE,
  title: 'Fire Truck Daily Readiness',
  description:
    'Truck-first daily readiness roster and one-off checks with seeded rows and required readings.',
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
  photoEvidenceTitle: 'General Evidence Photos',
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
  getVisibleChecks: getFrtVisibleDailyChecks,
  getMissingFields: getFrtMissingFields,
  getCompartmentOptions: getFrtCompartmentOptions,
  buildContinuationOptions: (form, _summary, context = {}) =>
    buildSubLocationContinuationOptions({
      form,
      getOptions: getFrtCompartmentOptions,
      label: 'compartment',
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
  detailFindingsMode: 'block',
  detailFindingsTitle: 'Truck Readiness',
}

export default frtDailyInspectionDefinition
