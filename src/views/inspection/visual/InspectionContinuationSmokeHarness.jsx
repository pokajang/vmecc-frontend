import React, { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import 'src/scss/style.scss'
import InspectionFormBodySections from 'src/views/inspection/form/components/InspectionFormBodySections'

const noop = () => {}

const styles = `
  body {
    margin: 0;
    background: #eef1f5;
  }

  .continuation-smoke-shell {
    width: min(100%, 430px);
    min-height: 100vh;
    margin: 0 auto;
    padding: 1rem;
    background: #fff;
  }

  .continuation-smoke-case {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .continuation-smoke-case:last-child {
    border-bottom: 0;
  }
`

const baseProps = {
  appendDescription: noop,
  checklistChips: [],
  currentStructuredSummary: null,
  descriptionRef: createRef(),
  draftStatus: '',
  fieldErrors: {},
  form: { photos: [] },
  getLatestForm: () => ({ photos: [] }),
  isFireExtinguisherCatalogInspectionForm: false,
  isFireTruckCatalogInspectionForm: false,
  isFullInspectionForm: false,
  isLoadingEquipmentRows: false,
  isLoadingFireExtinguisherRows: false,
  isLoadingScbaCatalogSections: false,
  isStructuredInspectionForm: false,
  location: { selectedMainLocationTitle: '' },
  mainLocation: '',
  onRequestReview: noop,
  onSaveDraft: noop,
  photosRef: createRef(),
  removePhoto: noop,
  requestRootPhotoUpload: noop,
  selectedFireTruckPlate: '',
  selectedType: '',
  selectedTypeDefinition: null,
  showComingSoonNotice: false,
  structuredDisplayForm: {},
  structuredSectionHandlers: {},
  structuredSectionRef: createRef(),
  StructuredEditSection: null,
  toggleChecklistChip: noop,
  updateForm: noop,
  updatePhotoDescription: noop,
  uploadInputRef: createRef(),
  cameraInputRef: createRef(),
  validationState: null,
  validationStatusMessage: '',
  zone: '',
}

const DummySection = ({ label }) => <div className="small text-body-secondary">{label}</div>

const completed = (value, title = value) => ({
  value,
  title,
  progress: { isDone: true, inspectedCount: 2, totalCount: 2 },
  metaLabel: 'Completed',
  metaIconKey: 'check',
  metaTone: 'success',
})

const incomplete = (value, title = value) => ({
  value,
  title,
  progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
  metaLabel: '0/2 checks',
})

const SmokeCase = ({ id, title, props }) => (
  <section className="continuation-smoke-case" data-smoke-case={id}>
    <h2 className="h6 mb-0">{title}</h2>
    <InspectionFormBodySections {...baseProps} {...props} />
  </section>
)

const structuredCaseProps = ({
  form,
  label,
  mainLocation,
  options,
  selectedTypeDefinition,
  sectionLabel,
  scope,
  selectedFireTruckPlate = '',
}) => ({
  form,
  isFireTruckCatalogInspectionForm: selectedTypeDefinition?.key === 'frt-daily-inspection',
  isStructuredInspectionForm: true,
  location: { selectedMainLocationTitle: mainLocation, subLocationOptions: [] },
  mainLocation,
  selectedFireTruckPlate,
  selectedType: form.inspectionType,
  selectedTypeDefinition,
  StructuredEditSection: () => <DummySection label={sectionLabel} />,
  structuredSectionHandlers: {
    onSelectNextScope: noop,
    scopeContinuation: {
      scope,
      label,
      parentLabel: selectedFireTruckPlate,
      currentValue: scope === 'mainLocation' ? form.mainLocation : form.subLocation,
      options,
    },
  },
})

const App = () => (
  <main className="continuation-smoke-shell inspection-module-page">
    <style>{styles}</style>
    <h1 className="h5">Inspection continuation smoke</h1>
    <SmokeCase
      id="fire-extinguisher"
      title="Fire Extinguisher"
      props={{
        form: {
          inspectionType: 'Fire Extinguisher Inspection',
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Infront Auditorium',
          photos: [],
        },
        currentStructuredSummary: {
          visibleChecks: [{ id: 'fe:1', sessionStatus: 'completed' }],
          completedCount: 1,
          totalCount: 1,
        },
        isFireExtinguisherCatalogInspectionForm: true,
        isStructuredInspectionForm: true,
        location: { selectedMainLocationTitle: 'Manjung Hub', subLocationOptions: [] },
        mainLocation: 'Manjung Hub',
        selectedType: 'Fire Extinguisher Inspection',
        selectedTypeDefinition: { key: 'fire-extinguisher-inspection' },
        StructuredEditSection: () => <DummySection label="Fire extinguisher rows" />,
        zone: '1',
        structuredSectionHandlers: {
          onSelectNextFireExtinguisherLocation: noop,
          fireExtinguisherLocationContinuation: {
            currentValue: 'Infront Auditorium',
            label: 'location',
            mainLocation: 'Manjung Hub',
            options: [
              completed('Reception'),
              { value: 'Infront Auditorium', title: 'Infront Auditorium' },
              incomplete('Cafeteria'),
            ],
            parentLabel: 'Manjung Hub',
            scope: 'subLocation',
            value: 'Infront Auditorium',
          },
        },
      }}
    />
    <SmokeCase
      id="frt"
      title="FRT Daily"
      props={structuredCaseProps({
        form: {
          inspectionType: 'Fire Truck Daily Readiness',
          mainLocation: 'FIRE TRUCK',
          subLocation: 'LOCKER 01',
          photos: [],
        },
        label: 'compartment',
        mainLocation: 'FIRE TRUCK',
        options: [completed('LOCKER 01'), incomplete('LOCKER 02')],
        scope: 'subLocation',
        selectedFireTruckPlate: 'AJG9555',
        selectedTypeDefinition: { key: 'frt-daily-inspection' },
        sectionLabel: 'FRT rows',
      })}
    />
    <SmokeCase
      id="er-aux"
      title="ER Aux"
      props={structuredCaseProps({
        form: {
          inspectionType: 'ER Aux Equipment Inspection',
          mainLocation: 'Store',
          photos: [],
        },
        label: 'location',
        mainLocation: 'Store',
        options: [completed('Store'), incomplete('Office')],
        scope: 'mainLocation',
        selectedTypeDefinition: { key: 'er-aux-equipment-inspection' },
        sectionLabel: 'ER Aux rows',
      })}
    />
    <SmokeCase
      id="hydraulic"
      title="Hydraulic"
      props={structuredCaseProps({
        form: {
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          mainLocation: 'FRT',
          photos: [],
        },
        label: 'location',
        mainLocation: 'FRT',
        options: [completed('FRT'), incomplete('Store')],
        scope: 'mainLocation',
        selectedTypeDefinition: { key: 'hydraulic-rescue-tools-inspection' },
        sectionLabel: 'Hydraulic rows',
      })}
    />
    <SmokeCase
      id="scba"
      title="SCBA"
      props={structuredCaseProps({
        form: {
          inspectionType: 'SCBA Inspection',
          mainLocation: 'FRT',
          photos: [],
        },
        label: 'location',
        mainLocation: 'FRT',
        options: [completed('FRT'), incomplete('Store')],
        scope: 'mainLocation',
        selectedTypeDefinition: { key: 'scba-inspection' },
        sectionLabel: 'SCBA rows',
      })}
    />
    <SmokeCase
      id="high-angle"
      title="High Angle"
      props={structuredCaseProps({
        form: {
          inspectionType: 'High Angle Rescue Equipment Inspection',
          mainLocation: 'Response Kit #1',
          photos: [],
        },
        label: 'kit',
        mainLocation: 'Response Kit #1',
        options: [completed('Response Kit #1'), incomplete('Response Kit #2')],
        scope: 'mainLocation',
        selectedTypeDefinition: { key: 'high-angle-rescue-equipment-inspection' },
        sectionLabel: 'High Angle rows',
      })}
    />
    <SmokeCase
      id="general"
      title="General"
      props={{
        form: {
          inspectionType: 'General Inspection',
          inspectionIssues: [],
          photos: [],
        },
        isFullInspectionForm: true,
        selectedType: 'General Inspection',
        selectedTypeDefinition: { key: 'general-inspection' },
      }}
    />
    <SmokeCase
      id="hse"
      title="HSE"
      props={{
        form: {
          inspectionType: 'Health Safety Environment Inspection',
          hseObservations: [],
          photos: [],
        },
        isFullInspectionForm: true,
        selectedType: 'Health Safety Environment Inspection',
        selectedTypeDefinition: { key: 'health-safety-environment-inspection' },
      }}
    />
  </main>
)

createRoot(document.getElementById('root')).render(<App />)
