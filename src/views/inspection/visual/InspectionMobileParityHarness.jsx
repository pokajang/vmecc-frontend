import React, { createRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CButton } from '@coreui/react'
import 'src/scss/style.scss'
import InspectionFormBodySections from 'src/views/inspection/form/components/InspectionFormBodySections'
import {
  ErAuxEquipmentChecks,
  FrtDailyInspectionChecks,
  HighAngleInspectionChecks,
  HydraulicEquipmentChecks,
  ScbaInspectionChecks,
} from 'src/views/inspection/form/components/InspectionFormDisplaySections'
import { InspectionMobileCollapsedSelectorRow } from 'src/views/inspection/form/components/InspectionSetupSelectorControls'
import { FireExtinguisherEditSection } from 'src/views/inspection/types/fire-extinguisher/section'
import { HseEditSection } from 'src/views/inspection/types/hse/section'
import { SCBA_SECTION_DEFINITIONS } from 'src/views/inspection/types/scba/helpers'

const noop = () => {}

const visualStyles = `
  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    background: #e7e9ee;
    color: #111827;
  }

  .visual-shell {
    width: min(100%, 430px);
    min-height: 100vh;
    margin: 0 auto;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
  }

  .visual-header {
    padding: 1.15rem 1.35rem 0.65rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .visual-list {
    display: grid;
    gap: 1.6rem;
    padding: 1rem 1.35rem 3rem;
  }

  .visual-case {
    display: grid;
    gap: 1rem;
    padding-bottom: 1.4rem;
    border-bottom: 1px solid #eef0f3;
  }

  .visual-case:last-child {
    border-bottom: 0;
  }

  .visual-case-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .visual-setup {
    display: grid;
    gap: 0.55rem;
  }
`

const updateById = (rows, row, patch) =>
  rows.map((candidate) =>
    String(candidate.id || '') === String(row.id || '') ? { ...candidate, ...patch } : candidate,
  )

const SetupPreview = ({ type, items = [] }) => (
  <div className="visual-setup">
    <InspectionMobileCollapsedSelectorRow label="Type" value={type} onEdit={noop} />
    <InspectionMobileCollapsedSelectorRow
      label="Date and time"
      value="2026-07-05T17:26"
      onEdit={noop}
    />
    {items.map((item) => (
      <InspectionMobileCollapsedSelectorRow
        key={item.label}
        label={item.label}
        value={item.value}
        onEdit={noop}
      />
    ))}
  </div>
)

const VisualCase = ({ id, title, setupType, setupItems, children }) => (
  <section className="visual-case" data-visual-case={id}>
    <div className="visual-case-title">
      <h2 className="h5 mb-0">{title}</h2>
      <CButton type="button" color="secondary" variant="outline" size="sm">
        Back
      </CButton>
    </div>
    <SetupPreview type={setupType} items={setupItems} />
    {children}
  </section>
)

const FireExtinguisherCase = () => {
  const [rows, setRows] = useState([
    {
      id: 'fe:can-001',
      canEdit: true,
      idLocNo: 'CAN-001',
      barcodeNo: 'SR072024Y171594',
      feType: 'DP 9KG',
      mainLocation: 'Canteen',
      subLocation: 'Canteen',
      certificationValidity: '2025-09-13',
      physicalCondition: 'Good',
      signageCondition: '',
      boxKeyAvailability: '',
      boxGlassAvailability: '',
      operationalCondition: '',
      photos: [],
    },
  ])

  return (
    <VisualCase
      id="fire-extinguisher"
      title="Fire Extinguisher"
      setupType="Fire Extinguisher"
      setupItems={[
        { label: 'Zone', value: 'Zone 1' },
        { label: 'Main Area', value: 'Canteen' },
        { label: 'Location', value: 'Canteen' },
      ]}
    >
      <FireExtinguisherEditSection
        mainLocation="Canteen"
        mainLocationLabel="Zone 1 > Canteen"
        form={{ zone: '1', subLocation: 'Canteen' }}
        summary={{
          visibleChecks: rows,
          completedCount: 0,
          totalCount: rows.length,
          defectCount: 0,
        }}
        fieldErrors={{}}
        validationState={null}
        handlers={{
          onUpdateCheck: (row, patch) => setRows((current) => updateById(current, row, patch)),
          onUpdateExtinguisher: (row, patch) =>
            setRows((current) => updateById(current, row, patch)),
        }}
      />
    </VisualCase>
  )
}

const HydraulicCase = () => {
  const [rows, setRows] = useState([
    {
      id: 'hydraulic:1',
      equipment: 'Hydraulic Pump Motor 1',
      equipmentDescription: 'FRT bay',
      physicalCondition: '',
      mechanicalCondition: '',
      noLeakageCondition: '',
      functionalCondition: '',
      photos: [],
    },
  ])

  return (
    <VisualCase
      id="hydraulic"
      title="Hydraulic Rescue Tools"
      setupType="Hydraulic Rescue Tools"
      setupItems={[{ label: 'Main Location', value: 'FRT Bay' }]}
    >
      <HydraulicEquipmentChecks
        mainLocation="FRT Bay"
        checks={rows}
        summary={{ visibleChecks: rows, totalCount: rows.length }}
        onUpdateCheck={(row, patch) => setRows((current) => updateById(current, row, patch))}
        onMarkAllOk={noop}
        onAddEquipment={noop}
      />
    </VisualCase>
  )
}

const ErAuxCase = () => {
  const [rows, setRows] = useState([
    {
      id: 'er-aux:1',
      equipment: 'Radio Tetra',
      equipmentDescription: 'Office set',
      defaultQuantity: '7',
      condition: '',
      quantity: '',
      photos: [],
    },
    {
      id: 'er-aux:2',
      equipment: 'Radio VHF',
      equipmentDescription: 'Command set',
      defaultQuantity: '3',
      condition: '',
      quantity: '',
      photos: [],
    },
    {
      id: 'er-aux:3',
      equipment: 'Mobile Radio',
      equipmentDescription: 'Vehicle kit',
      defaultQuantity: '2',
      condition: '',
      quantity: '',
      photos: [],
    },
  ])

  return (
    <VisualCase
      id="er-aux"
      title="Emergency Response Auxiliary Equipment"
      setupType="Emergency Response Auxiliary Equipment"
      setupItems={[{ label: 'Main Location', value: 'Office' }]}
    >
      <ErAuxEquipmentChecks
        mainLocation="Office"
        checks={rows}
        summary={{ visibleChecks: rows, totalCount: rows.length }}
        onUpdateCheck={(row, patch) => setRows((current) => updateById(current, row, patch))}
        onMarkAllOk={noop}
        onAddEquipment={noop}
      />
    </VisualCase>
  )
}

const ScbaCase = () => {
  const section = SCBA_SECTION_DEFINITIONS.find((entry) => entry.key === 'backPlate')
  const [rows, setRows] = useState([
    {
      id: 'backPlate:frt:msa:06',
      sectionKey: 'backPlate',
      mainLocation: 'FRT',
      brand: 'MSA',
      serialNo: '06',
      backPlateHarnessCondition: '',
      photos: [],
    },
  ])

  return (
    <VisualCase
      id="scba"
      title="SCBA"
      setupType="SCBA"
      setupItems={[{ label: 'Main Location', value: 'FRT' }]}
    >
      <ScbaInspectionChecks
        mainLocation="FRT"
        form={{ scbaCustomSections: [] }}
        summary={{
          visibleSections: [
            {
              ...section,
              visibleRows: rows,
              checkedCount: 0,
              issueCount: 0,
              incompleteRemarksCount: 0,
            },
          ],
          totalCount: rows.length,
          checkedCount: 0,
          issueCount: 0,
          incompleteRemarksCount: 0,
          incompletePhotoCount: 0,
          retainedEvidenceCount: 0,
        }}
        onUpdateGroupedCheck={(_, row, patch) =>
          setRows((current) => updateById(current, row, patch))
        }
        onMarkAllGood={noop}
        onAddSection={noop}
      />
    </VisualCase>
  )
}

const HighAngleCase = () => {
  const [rows, setRows] = useState([
    {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
      condition: '',
      photos: [],
    },
  ])
  const [customGroups, setCustomGroups] = useState([])

  const makeHighAngleGroupKey = (location = '', subLocation = '') =>
    `${String(location || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}::${String(subLocation || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`

  const addCompartment = (payload = {}) => {
    const location = String(payload.location || '').trim()
    const subLocation = String(payload.subLocation || '').trim()
    const key = makeHighAngleGroupKey(location, subLocation)
    setCustomGroups((current) =>
      current.some((group) => group.key === key)
        ? current
        : [
            ...current,
            {
              key,
              title: [location, subLocation].filter(Boolean).join(' - '),
              location,
              subLocation,
              checkedCount: 0,
              issueCount: 0,
              rows: [],
              custom: true,
            },
          ],
    )
  }

  const addItem = (payload = {}) => {
    setRows((current) => [
      ...current,
      {
        id: `high-angle:${current.length + 1}`,
        mainLocation: 'High Angle Rescue Kit',
        rowNumber: String(current.length + 1),
        equipment: payload.equipment,
        location: payload.location,
        subLocation: payload.subLocation,
        quantity: payload.quantity,
        condition: '',
        photos: [],
        isCustomEquipment: true,
      },
    ])
  }

  const lockerRows = rows.filter((row) => row.location === 'Locker A')
  const customVisibleGroups = customGroups.map((group) => ({
    ...group,
    rows: rows.filter(
      (row) => row.location === group.location && row.subLocation === group.subLocation,
    ),
  }))

  return (
    <VisualCase
      id="high-angle"
      title="High Angle Rescue Equipment"
      setupType="High Angle Rescue Equipment"
      setupItems={[{ label: 'Main Location', value: 'High Angle Rescue Kit' }]}
    >
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              location: 'Locker A',
              subLocation: 'Top shelf',
              checkedCount: 0,
              issueCount: 0,
              rows: lockerRows,
            },
            ...customVisibleGroups,
          ],
          checkedCount: 0,
          totalCount: rows.length,
          issueCount: 0,
        }}
        onUpdateCheck={(row, patch) => setRows((current) => updateById(current, row, patch))}
        onMarkAllOk={noop}
        onAddCompartment={addCompartment}
        onAddItem={addItem}
      />
    </VisualCase>
  )
}

const FrtCase = () => {
  const [rows, setRows] = useState([
    {
      id: 'frt:daily:1',
      rowNumber: '1',
      rowKind: 'status',
      equipment: 'Pump Panel',
      quantity: '1',
      status: '',
      photos: [],
    },
  ])
  const [oneOffRows, setOneOffRows] = useState([
    {
      id: 'frt:one-off:1',
      rowNumber: 'A',
      rowKind: 'oneOff',
      equipment: 'Emergency Beacon',
      condition: '',
      photos: [],
    },
  ])

  return (
    <VisualCase
      id="frt"
      title="Fire Truck Readiness"
      setupType="Fire Truck Daily Readiness"
      setupItems={[{ label: 'Truck', value: 'AJG9555' }]}
    >
      <FrtDailyInspectionChecks
        mainLocation="FRT"
        mainLocationLabel="AJG9555"
        summary={{
          visibleDailySections: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              visibleRows: rows,
            },
          ],
          visibleOneOffSections: [
            {
              key: 'one-off',
              title: 'One-Off',
              checkedCount: 0,
              issueCount: 0,
              visibleRows: oneOffRows,
            },
          ],
          truckReference: { plateNo: 'AJG9555' },
          dailyCheckedCount: 0,
          dailyRows: rows,
          dailyIssueCount: 0,
          dailyIncompleteRemarksCount: 0,
          dailyIncompletePhotoCount: 0,
          oneOffCheckedCount: 0,
          oneOffRows,
          oneOffIssueCount: 0,
          oneOffIncompleteRemarksCount: 0,
          oneOffIncompletePhotoCount: 0,
        }}
        onUpdateCheck={(row, patch) => {
          if (String(row.id || '').includes('one-off')) {
            setOneOffRows((current) => updateById(current, row, patch))
            return
          }
          setRows((current) => updateById(current, row, patch))
        }}
        onMarkAllOk={noop}
      />
    </VisualCase>
  )
}

const HseCase = () => {
  const [form, setForm] = useState({
    hseSelections: ['areaSatisfactory'],
    hseAreaConditionRemarks: 'Walkway and work area are satisfactory.',
    hseUnsafeActDetails: '',
    hseUnsafeConditionDetails: '',
    hseEnvironmentalDetails: '',
    hseSeverity: '',
    hseImmediateAction: '',
    hseCorrectiveAction: '',
    hseResponsiblePerson: '',
    hseTargetDate: '',
    hseRemarks: '',
  })

  return (
    <VisualCase
      id="hse"
      title="Health Safety Environment"
      setupType="Health Safety Environment"
      setupItems={[{ label: 'Main Location', value: 'Workshop' }]}
    >
      <HseEditSection
        form={form}
        handlers={{
          onToggleHseSelection: (value) =>
            setForm((current) => ({
              ...current,
              hseSelections: current.hseSelections.includes(value) ? [] : [value],
            })),
          onUpdateHseField: (key, value) =>
            setForm((current) => ({
              ...current,
              [key]: value,
            })),
        }}
      />
    </VisualCase>
  )
}

const GeneralCase = () => (
  <VisualCase
    id="general"
    title="General Inspection"
    setupType="General Inspection"
    setupItems={[{ label: 'Main Location', value: 'Office' }]}
  >
    <InspectionFormBodySections
      appendDescription={noop}
      checklistChips={['Housekeeping']}
      currentStructuredSummary={null}
      descriptionRef={createRef()}
      draftStatus=""
      fieldErrors={{}}
      form={{
        inspectionType: 'General Inspection',
        checklist: [
          {
            id: 'general-inspection:housekeeping',
            label: 'Housekeeping',
            selected: true,
          },
        ],
        description: 'Walkway clear.',
        photos: [],
      }}
      getLatestForm={noop}
      isFireExtinguisherCatalogInspectionForm={false}
      isLoadingEquipmentRows={false}
      isLoadingFireExtinguisherRows={false}
      isLoadingScbaCatalogSections={false}
      isFireTruckCatalogInspectionForm={false}
      isFullInspectionForm
      isStructuredInspectionForm={false}
      location={{}}
      mainLocation="Office"
      onRequestReview={noop}
      onSaveDraft={noop}
      photosRef={createRef()}
      removePhoto={noop}
      requestRootPhotoUpload={noop}
      selectedFireTruckPlate=""
      selectedType="General Inspection"
      selectedTypeDefinition={null}
      showComingSoonNotice={false}
      structuredDisplayForm={{}}
      structuredSectionHandlers={{}}
      structuredSectionRef={createRef()}
      StructuredEditSection={null}
      toggleChecklistChip={noop}
      updateForm={noop}
      updatePhotoDescription={noop}
      uploadInputRef={createRef()}
      cameraInputRef={createRef()}
      validationState={null}
      validationStatusMessage=""
      zone=""
    />
  </VisualCase>
)

const App = () => (
  <>
    <style>{visualStyles}</style>
    <main className="visual-shell inspection-module-page">
      <header className="visual-header">
        <h1 className="h4 mb-1">Inspection Mobile UI Parity</h1>
        <p className="small text-body-secondary mb-0">
          Backend-independent visual harness using real inspection components.
        </p>
      </header>
      <div className="visual-list">
        <FireExtinguisherCase />
        <HydraulicCase />
        <ErAuxCase />
        <ScbaCase />
        <HighAngleCase />
        <FrtCase />
        <HseCase />
        <GeneralCase />
      </div>
    </main>
  </>
)

createRoot(document.getElementById('root')).render(<App />)
