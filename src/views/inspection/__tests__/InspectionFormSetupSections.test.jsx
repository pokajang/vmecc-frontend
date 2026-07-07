// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ChevronUp } from 'lucide-react'
import InspectionFormSetupSections from '../form/components/InspectionFormSetupSections'
import { FIRE_EXTINGUISHER_CHECK_FIELDS } from '../types/fire-extinguisher/helpers'

const mockCompactViewport = (matches) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
})

vi.mock('src/components/CreateActionButton', () => ({
  default: ({ label, onClick, showIcon = true }) => (
    <button type="button" onClick={onClick}>
      {showIcon ? label : label}
    </button>
  ),
}))

vi.mock('../form/components/InspectionFormDisplaySections', () => ({
  FormFieldError: ({ children }) => <>{children ? <div>{children}</div> : null}</>,
  InspectionSelectedTypeCard: ({ inspectionType }) => <div>{inspectionType}</div>,
}))

vi.mock('../types/fire-extinguisher/FireExtinguisherScanner', () => ({
  default: ({ visible, onScan }) =>
    visible ? (
      <button type="button" onClick={() => onScan?.('SR102014Z060198')}>
        Mock FE scanner
      </button>
    ) : null,
}))

vi.mock('../app/inspectionTypeRegistry', () => ({
  getInspectionTypeDefinition: (value) =>
    value === 'FRT Daily Inspection' ? { supportsFireTruckCatalog: true } : null,
  getInspectionTypeOptions: () => [
    { value: 'General Inspection', title: 'General Inspection' },
    { value: 'Fire Extinguisher Inspection', title: 'Fire Extinguisher Inspection' },
  ],
}))

const baseProps = {
  fieldErrors: {},
  fireTruckOptions: [],
  form: { inspectionType: '', inspectedAt: '', photos: [] },
  incident: {
    openAddModal: vi.fn(),
    setShowAllIncidentTypes: vi.fn(),
    showAddTypeModal: false,
    typeOptions: [
      { value: 'General Inspection', title: 'General Inspection' },
      { value: 'Fire Extinguisher Inspection', title: 'Fire Extinguisher Inspection' },
      { value: 'SCBA', title: 'SCBA' },
      { value: 'Hydraulic Equipment', title: 'Hydraulic Equipment' },
    ],
    visibleTypeOptions: [
      { value: 'General Inspection', title: 'General Inspection' },
      { value: 'Fire Extinguisher Inspection', title: 'Fire Extinguisher Inspection' },
      { value: '__inspection_incident_types_toggle__', title: 'Show less', icon: ChevronUp },
    ],
  },
  inspectedAtRef: { current: null },
  inspectionTypeRef: { current: null },
  isEditingType: true,
  isFireExtinguisherCatalogInspectionForm: false,
  isFireTruckCatalogInspectionForm: false,
  location: {
    mainLocationOptions: [],
    visibleMainLocationOptions: [],
    subLocationOptions: [],
    visibleSubLocationOptions: [],
    zoneOptions: [],
    visibleZoneOptions: [],
    areaOptions: [],
    visibleAreaOptions: [],
    showAddLocationModal: false,
    setMainLocation: vi.fn(),
    setSubLocation: vi.fn(),
    setZone: vi.fn(),
    setShowAllMainLocationTypes: vi.fn(),
    setShowAllSubLocationTypes: vi.fn(),
    setShowAllZoneTypes: vi.fn(),
  },
  mainLocation: '',
  openAddFireTruckModal: vi.fn(),
  selectedFireTruckPlate: '',
  selectedLocationRef: { current: null },
  selectedType: '',
  selectedTypeDefinition: null,
  selectedTypeIcon: null,
  selectedTypeOption: null,
  setIsEditingType: vi.fn(),
  selectFireTruck: vi.fn(),
  subLocation: '',
  supportsCustomLocations: false,
  supportsSubLocations: false,
  updateForm: vi.fn(),
  updateInspectionType: vi.fn(),
  updateInspectedAt: vi.fn(),
  zone: '',
}

const buildFireExtinguisherRow = (overrides = {}, complete = false) => ({
  id: overrides.id || 'fe-row',
  zone: '1',
  mainLocation: 'Manjung Hub',
  subLocation: 'Reception',
  ...(complete
    ? FIRE_EXTINGUISHER_CHECK_FIELDS.reduce((next, field) => {
        next[field.key] = field.options[0]
        next[field.remarksKey] = ''
        next[field.photosKey] = []
        return next
      }, {})
    : {}),
  ...overrides,
})

describe('InspectionFormSetupSections', () => {
  it('collapses expanded incident types after selecting a type card', () => {
    mockCompactViewport(true)
    const incident = {
      ...baseProps.incident,
      setShowAllIncidentTypes: vi.fn(),
    }
    const updateForm = vi.fn()
    const updateInspectionType = vi.fn()
    const setIsEditingType = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        incident={incident}
        updateForm={updateForm}
        updateInspectionType={updateInspectionType}
        setIsEditingType={setIsEditingType}
      />,
    )

    fireEvent.click(screen.getByText('General Inspection'))

    expect(incident.setShowAllIncidentTypes).toHaveBeenCalledWith(false)
    expect(updateInspectionType).toHaveBeenCalledWith('General Inspection')
    expect(updateForm).not.toHaveBeenCalled()
    expect(setIsEditingType).toHaveBeenCalledWith(false)
  })

  it('shows the mobile show-less toggle icon while choosing type inline', () => {
    mockCompactViewport(true)

    render(<InspectionFormSetupSections {...baseProps} />)

    expect(screen.getByText('Show less')).toBeTruthy()
    expect(screen.getByLabelText('Show less icon')).toBeTruthy()
  })

  it('shows all inspection types on desktop without mobile toggle affordances', () => {
    mockCompactViewport(false)

    render(<InspectionFormSetupSections {...baseProps} />)

    expect(screen.getByText('General Inspection')).toBeTruthy()
    expect(screen.getByText('Fire Extinguisher Inspection')).toBeTruthy()
    expect(screen.getByText('SCBA')).toBeTruthy()
    expect(screen.getByText('Hydraulic Equipment')).toBeTruthy()
    expect(screen.queryByText('Show more')).toBeNull()
    expect(screen.queryByText('Show less')).toBeNull()
  })

  it('shows the selected mobile type in a collapsed row and edits it from a bottom drawer', async () => {
    mockCompactViewport(true)
    const setIsEditingType = vi.fn()
    const updateForm = vi.fn()
    const updateInspectionType = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        selectedType="General Inspection"
        selectedTypeOption={{ value: 'General Inspection', title: 'General Inspection' }}
        setIsEditingType={setIsEditingType}
        updateForm={updateForm}
        updateInspectionType={updateInspectionType}
      />,
    )

    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.getByText('General Inspection')).toBeTruthy()
    expect(screen.queryByText('Choose Type')).toBeNull()

    fireEvent.click(screen.getByLabelText('Edit Type'))

    expect(screen.getByText('Change Type')).toBeTruthy()
    expect(screen.getByText('SCBA')).toBeTruthy()
    expect(screen.getByText('Hydraulic Equipment')).toBeTruthy()
    expect(screen.queryByText('Show less')).toBeNull()
    expect(screen.queryByText('Show more')).toBeNull()
    expect(setIsEditingType).not.toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByText('Fire Extinguisher Inspection'))

    expect(updateInspectionType).toHaveBeenCalledWith('Fire Extinguisher Inspection')
    expect(updateForm).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('Change Type')).toBeNull())
    expect(document.body.style.overflow).toBe('')
  })

  it('resets the selected mobile type and clears dependent setup state', () => {
    mockCompactViewport(true)
    const updateInspectionType = vi.fn()
    const setIsEditingType = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        setIsEditingType={setIsEditingType}
        updateInspectionType={updateInspectionType}
      />,
    )

    fireEvent.click(screen.getByLabelText('Reset type'))

    expect(updateInspectionType).toHaveBeenCalledWith('')
    expect(setIsEditingType).toHaveBeenCalledWith(false)
  })

  it('returns to the type-only mobile landing state after resetting type', () => {
    mockCompactViewport(true)

    const Wrapper = () => {
      const [selectedType, setSelectedType] = React.useState('General Inspection')
      return (
        <InspectionFormSetupSections
          {...baseProps}
          form={{ ...baseProps.form, inspectedAt: '2026-07-05T22:03' }}
          isEditingType={false}
          location={{
            ...baseProps.location,
            mainLocationOptions: [{ value: 'ASIC', title: 'ASIC' }],
            visibleMainLocationOptions: [{ value: 'ASIC', title: 'ASIC' }],
            selectedMainLocationTitle: 'ASIC',
          }}
          mainLocation="ASIC"
          selectedType={selectedType}
          selectedTypeOption={selectedType ? { value: selectedType, title: selectedType } : null}
          updateInspectionType={setSelectedType}
        />
      )
    }

    render(<Wrapper />)

    expect(screen.getByText('Date and time')).toBeTruthy()
    expect(screen.getByText('Main Location')).toBeTruthy()
    expect(screen.getByText('ASIC')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Reset type'))

    expect(screen.getByText('Choose Type')).toBeTruthy()
    expect(screen.queryByText('Date and time')).toBeNull()
    expect(screen.queryByText('Choose Main Location')).toBeNull()
    expect(screen.queryByText('ASIC')).toBeNull()
  })

  it('replaces a setup drawer with the add type drawer and restores it after close', async () => {
    mockCompactViewport(true)

    const Wrapper = () => {
      const [showAddTypeModal, setShowAddTypeModal] = React.useState(false)
      const incident = {
        ...baseProps.incident,
        showAddTypeModal,
        openAddModal: () => setShowAddTypeModal(true),
      }

      return (
        <>
          <InspectionFormSetupSections
            {...baseProps}
            isEditingType={false}
            selectedType="General Inspection"
            selectedTypeOption={{ value: 'General Inspection', title: 'General Inspection' }}
            incident={incident}
          />
          {showAddTypeModal ? (
            <button type="button" onClick={() => setShowAddTypeModal(false)}>
              Close add type
            </button>
          ) : null}
        </>
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByLabelText('Edit Type'))
    expect(screen.getByText('Change Type')).toBeTruthy()

    fireEvent.click(screen.getByText('Add type'))

    await waitFor(() => expect(screen.queryByText('Change Type')).toBeNull())

    fireEvent.click(screen.getByText('Close add type'))

    await waitFor(() => expect(screen.getByText('Change Type')).toBeTruthy())
  })

  it('edits the selected mobile date and time from a bottom drawer', async () => {
    mockCompactViewport(true)
    const updateInspectedAt = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        form={{ ...baseProps.form, inspectedAt: '2026-07-05T14:27' }}
        selectedType="General Inspection"
        selectedTypeOption={{ value: 'General Inspection', title: 'General Inspection' }}
        updateInspectedAt={updateInspectedAt}
      />,
    )

    expect(screen.getByText('Date and time')).toBeTruthy()
    expect(screen.getByText('2026-07-05T14:27')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Edit date and time'))

    expect(screen.getByText('Change Date and time')).toBeTruthy()

    fireEvent.change(document.getElementById('inspection-mobile-inspected-at-drawer'), {
      target: { value: '2026-07-06T08:15' },
    })

    expect(updateInspectedAt).toHaveBeenCalledWith('2026-07-06T08:15')

    fireEvent.click(screen.getByText('Done'))

    await waitFor(() => expect(screen.queryByText('Change Date and time')).toBeNull())
    expect(document.body.style.overflow).toBe('')
  })

  it('resets the selected mobile date and time from the collapsed row', () => {
    mockCompactViewport(true)
    const updateInspectedAt = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        form={{ ...baseProps.form, inspectedAt: '2026-07-05T14:27' }}
        selectedType="General Inspection"
        selectedTypeOption={{ value: 'General Inspection', title: 'General Inspection' }}
        updateInspectedAt={updateInspectedAt}
      />,
    )

    fireEvent.click(screen.getByLabelText('Reset date and time'))

    expect(updateInspectedAt).toHaveBeenCalledWith('')
  })

  it('edits a selected mobile fire extinguisher zone from a bottom drawer', async () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      zoneOptions: [
        { value: '1', title: 'Zone 1', metaLabel: '2 areas' },
        { value: '2', title: 'Zone 2', metaLabel: '1 area' },
      ],
      visibleZoneOptions: [
        { value: '1', title: 'Zone 1', metaLabel: '2 areas' },
        { value: '2', title: 'Zone 2', metaLabel: '1 area' },
      ],
      areaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
      setZone: vi.fn(),
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
      />,
    )

    fireEvent.click(screen.getByLabelText('Edit Zone'))

    expect(screen.getByText('Change Zone')).toBeTruthy()
    expect(screen.getByText('2 areas')).toBeTruthy()

    fireEvent.click(screen.getByText('Zone 2'))

    expect(location.setZone).toHaveBeenCalledWith('2')
    await waitFor(() => expect(screen.queryByText('Change Zone')).toBeNull())
    expect(document.body.style.overflow).toBe('')
  })

  it('resets the selected mobile fire extinguisher zone and cascades lower location fields', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      selectedSubLocationTitle: 'Reception',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '2 areas' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '2 areas' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' },
      ],
      subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      visibleSubLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      setZone: vi.fn(),
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        subLocation="Reception"
        supportsSubLocations
      />,
    )

    fireEvent.click(screen.getByLabelText('Reset Zone'))

    expect(location.setZone).toHaveBeenCalledWith('')
    expect(location.setMainLocation).not.toHaveBeenCalled()
    expect(location.setSubLocation).not.toHaveBeenCalled()
  })

  it('resets the selected mobile fire extinguisher main area and cascades location', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      selectedSubLocationTitle: 'Reception',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '1 location' }],
      visibleAreaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '1 location' }],
      subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      visibleSubLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      setMainLocation: vi.fn(),
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        subLocation="Reception"
        supportsSubLocations
      />,
    )

    fireEvent.click(screen.getByLabelText('Reset Main Area'))

    expect(location.setMainLocation).toHaveBeenCalledWith('')
    expect(location.setSubLocation).not.toHaveBeenCalled()
  })

  it('resets the selected mobile fire extinguisher location only', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      selectedSubLocationTitle: 'Reception',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '1 location' }],
      visibleAreaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '1 location' }],
      subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      visibleSubLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      setSubLocation: vi.fn(),
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        subLocation="Reception"
        supportsSubLocations
      />,
    )

    fireEvent.click(screen.getByLabelText('Reset Location'))

    expect(location.setSubLocation).toHaveBeenCalledWith('')
  })

  it('shows fire extinguisher main-area location counts while choosing inline', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '2 areas' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '2 areas' }],
      areaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '3 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
      />,
    )

    expect(screen.getByText('Choose Main Area')).toBeTruthy()
    expect(screen.getByText('3 locations')).toBeTruthy()
    expect(screen.getByText('2 locations')).toBeTruthy()
  })

  it('shows fire extinguisher zone progress from preloaded context before zone selection', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      zoneOptions: [
        { value: '1', title: 'Zone 1', metaLabel: '2 areas' },
        { value: '2', title: 'Zone 2', metaLabel: '1 area' },
      ],
      visibleZoneOptions: [
        { value: '1', title: 'Zone 1', metaLabel: '2 areas' },
        { value: '2', title: 'Zone 2', metaLabel: '1 area' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherSessionProgress={{
          completedLocations: [],
          locationProgress: [
            {
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
            {
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Dry Store',
              status: 'in_progress',
              expectedCount: 1,
              completedCount: 0,
            },
            {
              zone: '2',
              mainLocation: 'Generator House',
              subLocation: 'Pump Room',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
          ],
          results: [],
        }}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        form={{
          ...baseProps.form,
          fireExtinguisherEntryMode: 'area',
        }}
        location={location}
      />,
    )

    expect(screen.getByText('1/2 areas')).toBeTruthy()
    expect(screen.getByText('1/1 area')).toBeTruthy()
  })

  it('shows fire extinguisher main-area done-location progress under the selected zone', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '1 location' },
      ],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '1 location' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow(
            { id: 'fe-1', mainLocation: 'Manjung Hub', subLocation: 'Reception' },
            true,
          ),
          buildFireExtinguisherRow(
            { id: 'fe-2', mainLocation: 'Manjung Hub', subLocation: 'Operation LAB' },
            false,
          ),
          buildFireExtinguisherRow(
            { id: 'fe-3', mainLocation: 'Canteen', subLocation: 'Canteen' },
            true,
          ),
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
      />,
    )

    expect(screen.getByText('Choose Main Area')).toBeTruthy()
    expect(screen.getByText('1/2 locations')).toBeTruthy()
    expect(screen.getByText('1/1 location')).toBeTruthy()
    expect(screen.queryByText('Done')).toBeNull()
  })

  it('shows the selected fire extinguisher main-area progress inside the collapsed main-area card', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow(
            { id: 'fe-1', mainLocation: 'Manjung Hub', subLocation: 'Reception' },
            true,
          ),
          buildFireExtinguisherRow(
            { id: 'fe-2', mainLocation: 'Manjung Hub', subLocation: 'Operation LAB' },
            false,
          ),
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        supportsSubLocations
      />,
    )

    expect(screen.getByText('Choose Location')).toBeTruthy()
    expect(
      within(screen.getByRole('group', { name: 'Main Area' })).getByText('1/2 locations'),
    ).toBeTruthy()
  })

  it('shows the selected fire extinguisher unit progress inside the collapsed location card', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      selectedSubLocationTitle: 'Reception',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow(
            { id: 'fe-1', mainLocation: 'Manjung Hub', subLocation: 'Reception' },
            true,
          ),
          buildFireExtinguisherRow(
            { id: 'fe-2', mainLocation: 'Manjung Hub', subLocation: 'Operation LAB' },
            false,
          ),
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        subLocation="Reception"
        supportsSubLocations
      />,
    )

    expect(
      within(screen.getByRole('group', { name: 'Location' })).getByText('1/1 FEs'),
    ).toBeTruthy()
  })

  it('keeps other fire extinguisher main-area progress visible when one area is selected', async () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Canteen',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '13 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '13 locations' },
        { value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' },
      ],
      subLocationOptions: [{ value: 'Dry Store', title: 'Dry Store' }],
      visibleSubLocationOptions: [{ value: 'Dry Store', title: 'Dry Store' }],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherSessionProgress={{
          completedLocations: [],
          locationProgress: [
            {
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
            {
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Dry Store',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
            {
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Serving Area',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
          ],
          results: [],
        }}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Canteen"
        supportsSubLocations
      />,
    )

    fireEvent.click(screen.getByLabelText('Edit Main Area'))

    await waitFor(() => expect(screen.getByText('Change Main Area')).toBeTruthy())
    expect(screen.getByText('1/13 locations')).toBeTruthy()
    expect(screen.getAllByText('2/2 locations').length).toBeGreaterThan(0)
  })

  it('keeps numeric done-location counts when every fire extinguisher area location is done', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow(
            { id: 'fe-1', mainLocation: 'Manjung Hub', subLocation: 'Reception' },
            true,
          ),
          buildFireExtinguisherRow(
            { id: 'fe-2', mainLocation: 'Manjung Hub', subLocation: 'Operation LAB' },
            true,
          ),
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
      />,
    )

    expect(screen.getByText('2/2 locations')).toBeTruthy()
    expect(screen.queryByText('All')).toBeNull()
    expect(screen.queryByText('Completed')).toBeNull()
  })

  it('shows fire extinguisher counts on location options while choosing inline', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          { id: 'fe-1', subLocation: 'Reception' },
          { id: 'fe-2', subLocation: 'Reception' },
          { id: 'fe-3', subLocation: 'Operation LAB' },
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        supportsSubLocations
      />,
    )

    expect(screen.getByText('Choose Location')).toBeTruthy()
    expect(screen.getByText('0/2 FEs')).toBeTruthy()
    expect(screen.getByText('0/1 FEs')).toBeTruthy()
  })

  it('shows done on fire extinguisher location cards when every child unit is checked', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow({ id: 'fe-1', subLocation: 'Reception' }, true),
          buildFireExtinguisherRow({ id: 'fe-2', subLocation: 'Reception' }, true),
          buildFireExtinguisherRow({ id: 'fe-3', subLocation: 'Operation LAB' }, false),
        ]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Manjung Hub"
        supportsSubLocations
      />,
    )

    expect(screen.getByText('Choose Location')).toBeTruthy()
    expect(screen.getByText('2/2 FEs')).toBeTruthy()
    expect(screen.getByText('0/1 FEs')).toBeTruthy()
  })

  it('shows server-completed fire extinguisher status on location selection cards', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Manjung Hub',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' }],
      visibleAreaOptions: [
        { value: 'Manjung Hub', title: 'Manjung Hub', metaLabel: '2 locations' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Operation LAB', title: 'Operation LAB' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[
          buildFireExtinguisherRow({ id: 'fe-1', subLocation: 'Reception' }, false),
          buildFireExtinguisherRow({ id: 'fe-2', subLocation: 'Operation LAB' }, false),
        ]}
        fireExtinguisherSessionProgress={{
          completedLocations: [
            {
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              status: 'completed',
              expectedCount: 1,
              completedCount: 1,
            },
          ],
          results: [],
        }}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="Zone 1"
        mainLocation="Manjung Hub"
        supportsSubLocations
      />,
    )

    expect(screen.getByText('Choose Location')).toBeTruthy()
    expect(screen.getByText('1/1 FEs')).toBeTruthy()
    expect(screen.getByText('0/1 FEs')).toBeTruthy()
  })

  it('shows loading instead of false zero unit counts while fire extinguisher location rows load', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      selectedMainLocationTitle: 'Canteen',
      zoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      visibleZoneOptions: [{ value: '1', title: 'Zone 1', metaLabel: '1 area' }],
      areaOptions: [{ value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' }],
      visibleAreaOptions: [{ value: 'Canteen', title: 'Canteen', metaLabel: '2 locations' }],
      subLocationOptions: [
        { value: 'Canteen', title: 'Canteen' },
        { value: 'Dry Store', title: 'Dry Store' },
      ],
      visibleSubLocationOptions: [
        { value: 'Canteen', title: 'Canteen' },
        { value: 'Dry Store', title: 'Dry Store' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        fireExtinguisherAreaRows={[]}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        isLoadingFireExtinguisherAreaRows
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
        mainLocation="Canteen"
        supportsSubLocations
      />,
    )

    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0)
    expect(screen.queryByText('0 units')).toBeNull()
  })

  it('shows all drawer location options without show more or show less toggles', () => {
    mockCompactViewport(true)
    const location = {
      ...baseProps.location,
      selectedZoneTitle: 'Zone 1',
      zoneOptions: [
        { value: '1', title: 'Zone 1' },
        { value: '2', title: 'Zone 2' },
        { value: '3', title: 'Zone 3' },
      ],
      visibleZoneOptions: [
        { value: '1', title: 'Zone 1' },
        { value: '__inspection_location_types_toggle__', title: 'Show more' },
      ],
      setZone: vi.fn(),
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        selectedType="Fire Extinguisher Inspection"
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        location={location}
        zone="1"
      />,
    )

    fireEvent.click(screen.getByLabelText('Edit Zone'))

    expect(screen.getByText('Zone 2')).toBeTruthy()
    expect(screen.getByText('Zone 3')).toBeTruthy()
    expect(screen.queryByText('Show more')).toBeNull()
    expect(screen.queryByText('Show less')).toBeNull()
  })

  it('shows full desktop location option sets instead of mobile-capped subsets', () => {
    mockCompactViewport(false)
    const location = {
      ...baseProps.location,
      zoneOptions: [
        { value: '1', title: 'Zone 1' },
        { value: '2', title: 'Zone 2' },
        { value: '3', title: 'Zone 3' },
      ],
      visibleZoneOptions: [
        { value: '1', title: 'Zone 1' },
        { value: '__inspection_location_types_toggle__', title: 'Show more' },
      ],
      areaOptions: [
        { value: 'Canteen', title: 'Canteen' },
        { value: 'Office', title: 'Office' },
        { value: 'Lobby', title: 'Lobby' },
      ],
      visibleAreaOptions: [
        { value: 'Canteen', title: 'Canteen' },
        { value: '__inspection_location_types_toggle__', title: 'Show more' },
      ],
      subLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: 'Pantry', title: 'Pantry' },
        { value: 'Store', title: 'Store' },
      ],
      visibleSubLocationOptions: [
        { value: 'Reception', title: 'Reception' },
        { value: '__inspection_location_types_toggle__', title: 'Show more' },
      ],
    }

    render(
      <InspectionFormSetupSections
        {...baseProps}
        isEditingType={false}
        isFireExtinguisherCatalogInspectionForm
        location={location}
        mainLocation="Canteen"
        selectedType="Fire Extinguisher Inspection"
        selectedTypeDefinition={{
          supportsFireExtinguisherCatalog: true,
          usesZoneLocationFlow: true,
        }}
        selectedTypeOption={{
          value: 'Fire Extinguisher Inspection',
          title: 'Fire Extinguisher Inspection',
        }}
        supportsSubLocations
        subLocation="Reception"
        zone="1"
      />,
    )

    expect(screen.getByText('Zone 2')).toBeTruthy()
    expect(screen.getByText('Zone 3')).toBeTruthy()
    expect(screen.getByText('Office')).toBeTruthy()
    expect(screen.getByText('Lobby')).toBeTruthy()
    expect(screen.getByText('Pantry')).toBeTruthy()
    expect(screen.getByText('Store')).toBeTruthy()
    expect(screen.queryByText('Show more')).toBeNull()
    expect(screen.queryByText('Show less')).toBeNull()
  })

  it('replaces a setup drawer with the add location drawer and restores it after close', async () => {
    mockCompactViewport(true)

    const Wrapper = () => {
      const [showAddLocationModal, setShowAddLocationModal] = React.useState(false)
      const location = {
        ...baseProps.location,
        selectedZoneTitle: 'Zone 1',
        showAddLocationModal,
        zoneOptions: [
          { value: '1', title: 'Zone 1' },
          { value: '2', title: 'Zone 2' },
        ],
        visibleZoneOptions: [
          { value: '1', title: 'Zone 1' },
          { value: '2', title: 'Zone 2' },
        ],
        openAddZoneModal: () => setShowAddLocationModal(true),
      }

      return (
        <>
          <InspectionFormSetupSections
            {...baseProps}
            isEditingType={false}
            isFireExtinguisherCatalogInspectionForm
            selectedType="Fire Extinguisher Inspection"
            selectedTypeOption={{
              value: 'Fire Extinguisher Inspection',
              title: 'Fire Extinguisher Inspection',
            }}
            supportsCustomLocations
            location={location}
            zone="1"
          />
          {showAddLocationModal ? (
            <button type="button" onClick={() => setShowAddLocationModal(false)}>
              Close add zone
            </button>
          ) : null}
        </>
      )
    }

    render(<Wrapper />)

    fireEvent.click(screen.getByLabelText('Edit Zone'))
    expect(screen.getByText('Change Zone')).toBeTruthy()

    fireEvent.click(screen.getByText('Add zone'))

    await waitFor(() => expect(screen.queryByText('Change Zone')).toBeNull())

    fireEvent.click(screen.getByText('Close add zone'))

    await waitFor(() => expect(screen.getByText('Change Zone')).toBeTruthy())
  })

  it('shows fire truck compartments after selecting a truck and stores the selected compartment', () => {
    mockCompactViewport(true)
    const updateForm = vi.fn()
    const compartmentOptions = [
      { value: 'LOCKER 01', title: 'LOCKER 01', metaLabel: '0/8 checked' },
      { value: 'FIRE TRUCK', title: 'FIRE TRUCK', metaLabel: '0/60 checked' },
    ]

    render(
      <InspectionFormSetupSections
        {...baseProps}
        form={{
          ...baseProps.form,
          inspectionType: 'FRT Daily Inspection',
          inspectedAt: '2026-07-05T23:09',
        }}
        fireTruckOptions={[{ value: 'AJG9555', title: 'AJG9555' }]}
        isEditingType={false}
        isFireTruckCatalogInspectionForm
        mainLocation="AJG9555"
        selectedFireTruckPlate="AJG9555"
        selectedType="FRT Daily Inspection"
        selectedTypeDefinition={{
          supportsFireTruckCatalog: true,
          usesCompartmentSelection: true,
          subLocationLabel: 'Compartment',
          getCompartmentOptions: () => compartmentOptions,
        }}
        selectedTypeOption={{ value: 'FRT Daily Inspection', title: 'Fire Truck Daily Readiness' }}
        supportsSubLocations
        updateForm={updateForm}
      />,
    )

    expect(screen.getByText('Choose Compartment')).toBeTruthy()
    expect(screen.getByText('LOCKER 01')).toBeTruthy()
    expect(screen.getByText('0/8 checked')).toBeTruthy()

    fireEvent.click(screen.getByText('LOCKER 01'))

    expect(updateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        subLocation: 'LOCKER 01',
        subLocationId: '',
      }),
    )
  })

  it('adds a fire truck compartment through the mobile drawer', () => {
    mockCompactViewport(true)
    const updateForm = vi.fn()

    render(
      <InspectionFormSetupSections
        {...baseProps}
        form={{
          ...baseProps.form,
          inspectionType: 'FRT Daily Inspection',
          inspectedAt: '2026-07-05T23:09',
          frtCustomCompartments: [],
        }}
        fireTruckOptions={[{ value: 'AJG9555', title: 'AJG9555' }]}
        isEditingType={false}
        isFireTruckCatalogInspectionForm
        mainLocation="AJG9555"
        selectedFireTruckPlate="AJG9555"
        selectedType="FRT Daily Inspection"
        selectedTypeDefinition={{
          supportsFireTruckCatalog: true,
          usesCompartmentSelection: true,
          subLocationLabel: 'Compartment',
          getCompartmentOptions: () => [{ value: 'LOCKER 01', title: 'LOCKER 01' }],
        }}
        selectedTypeOption={{ value: 'FRT Daily Inspection', title: 'Fire Truck Daily Readiness' }}
        supportsSubLocations
        updateForm={updateForm}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add compartment (1)' }))

    expect(screen.getByText('Add Compartment')).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Compartment name is required.')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('e.g. LOCKER 03'), {
      target: { value: 'locker 03' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(updateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        subLocation: 'LOCKER 03',
        subLocationId: '',
        frtCustomCompartments: ['LOCKER 03'],
      }),
    )
  })

  it('shows fire extinguisher entry modes and opens scanner when scan mode is selected', () => {
    mockCompactViewport(false)
    const onChangeMode = vi.fn()
    const onScan = vi.fn()

    const scanProps = {
      ...baseProps,
      fireExtinguisherScan: {
        isScannerOpen: false,
        onChangeMode,
        onScan,
      },
      isEditingType: false,
      isFireExtinguisherCatalogInspectionForm: true,
      selectedType: 'Fire Extinguisher Inspection',
      selectedTypeDefinition: {
        supportsFireExtinguisherCatalog: true,
        usesZoneLocationFlow: true,
      },
      selectedTypeOption: {
        value: 'Fire Extinguisher Inspection',
        title: 'Fire Extinguisher',
      },
      supportsCustomLocations: true,
      supportsSubLocations: true,
    }

    const { rerender } = render(
      <InspectionFormSetupSections
        {...scanProps}
        form={{
          ...baseProps.form,
          inspectionType: 'Fire Extinguisher Inspection',
          inspectedAt: '2026-07-05T23:09',
          fireExtinguisherEntryMode: '',
        }}
      />,
    )

    expect(screen.getByText('Choose Inspection Mode')).toBeTruthy()
    expect(screen.queryByText('Choose zone, main area, and location.')).toBeNull()
    expect(screen.queryByText('Inspect only the scanned FE.')).toBeNull()
    expect(screen.queryByText('Date and time of inspection')).toBeNull()
    expect(screen.queryByText('Choose Zone')).toBeNull()

    const byAreaButton = screen.getByRole('button', { name: /by area/i })
    const scanButton = screen.getByRole('button', { name: /scan qr \/ barcode/i })
    expect(byAreaButton.parentElement?.className || '').toContain('col-6')
    expect(scanButton.parentElement?.className || '').toContain('col-6')

    fireEvent.click(byAreaButton)
    expect(onChangeMode).toHaveBeenCalledWith('area')

    fireEvent.click(scanButton)

    expect(onChangeMode).toHaveBeenCalledWith('scan')
    rerender(
      <InspectionFormSetupSections
        {...scanProps}
        form={{
          ...baseProps.form,
          inspectionType: 'Fire Extinguisher Inspection',
          inspectedAt: '2026-07-05T23:09',
          fireExtinguisherEntryMode: 'scan',
        }}
        fireExtinguisherScan={{
          ...scanProps.fireExtinguisherScan,
          isScannerOpen: true,
        }}
      />,
    )

    expect(screen.queryByText('Choose Zone')).toBeNull()
    expect(screen.queryByText('Date and time of inspection')).toBeNull()
    expect(screen.queryByText('Scanned Fire Extinguisher')).toBeNull()
    expect(screen.getByText('Mock FE scanner')).toBeTruthy()
  })
})
