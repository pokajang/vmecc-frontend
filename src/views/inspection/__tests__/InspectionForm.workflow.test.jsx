// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import InspectionForm from '../InspectionForm'

vi.mock('src/components/report-workflow/TypeManagerModal', () => ({
  default: () => null,
}))

vi.mock('../useLocationTypeManager', () => ({
  LOCATION_TOGGLE_VALUE: '__inspection_location_types_toggle__',
  default: ({ inspectionType = '', mainLocation = '', subLocation = '', updateSetupField }) => {
    const defaultMainLocationOptions = [
      { value: 'Zone A', title: 'Zone A', description: 'Zone A' },
      { value: 'FRT', title: 'FRT', description: 'FRT' },
      { value: 'Store', title: 'Store', description: 'Store' },
      { value: 'FIRE TRUCK', title: 'FIRE TRUCK', description: 'FIRE TRUCK' },
      { value: 'Response Kit #1', title: 'Response Kit #1', description: 'Response Kit #1' },
      { value: 'Rescue Rope', title: 'Rescue Rope', description: 'Rescue Rope' },
    ]
    const fireMainLocationOptions = [
      { value: 'Zone A', title: 'Zone A', description: 'Zone A' },
      ...Array.from({ length: 12 }, (_, index) => ({
        value: `Fire Location ${index + 1}`,
        title: `Fire Location ${index + 1}`,
        description: `Fire Location ${index + 1}`,
      })),
      { value: 'Manjung Hub', title: 'Manjung Hub', description: 'Zone 1 location' },
    ]
    const fireSubLocationOptions =
      mainLocation === 'Manjung Hub'
        ? [
            ...Array.from({ length: 12 }, (_, index) => ({
              value: `Hub Area ${index + 1}`,
              title: `Hub Area ${index + 1}`,
              description: `Hub Area ${index + 1}`,
            })),
            { value: 'Reception', title: 'Reception', description: 'Front desk' },
          ]
        : []
    const isFireExtinguisher = inspectionType === 'Fire Extinguisher Inspection'
    const mainLocationOptions = isFireExtinguisher
      ? fireMainLocationOptions
      : defaultMainLocationOptions
    const subLocationOptions = isFireExtinguisher
      ? fireSubLocationOptions
      : mainLocation
        ? [{ value: 'Dock', title: 'Dock', description: 'Dock' }]
        : []
    const visibleMainLocationOptions = isFireExtinguisher
      ? [
          ...mainLocationOptions.slice(0, 4),
          { value: '__inspection_location_types_toggle__', title: 'Show more' },
        ]
      : mainLocationOptions
    const visibleSubLocationOptions =
      isFireExtinguisher && subLocationOptions.length > 0
        ? [
            ...subLocationOptions.slice(0, 4),
            { value: '__inspection_location_types_toggle__', title: 'Show more' },
          ]
        : subLocationOptions
    return {
      showAddLocationModal: false,
      closeAddModal: () => {},
      locationEditMode: false,
      setLocationEditMode: () => {},
      typeOptions: mainLocationOptions,
      visibleTypeOptions: visibleMainLocationOptions,
      mainLocationOptions,
      visibleMainLocationOptions,
      subLocationOptions,
      visibleSubLocationOptions,
      editLocationOptions: mainLocationOptions,
      setShowAllLocationTypes: () => {},
      setShowAllMainLocationTypes: () => {},
      setShowAllSubLocationTypes: () => {},
      openAddModal: () => {},
      openAddMainLocationModal: () => {},
      openAddSubLocationModal: () => {},
      removeType: () => {},
      setMainLocation: (value) =>
        updateSetupField('locationSelection', { mainLocation: value, subLocation: '' }),
      setSubLocation: (value) =>
        updateSetupField('locationSelection', {
          mainLocation,
          subLocation: subLocation === value ? '' : value,
        }),
      isEditingSubLocation: false,
      newLocationName: '',
      setNewLocationName: () => {},
      addLocationError: '',
      setAddLocationError: () => {},
      newLocationDescription: '',
      setNewLocationDescription: () => {},
      editingLocationKey: '',
      startEditType: () => {},
      saveType: () => {},
      newLocationIconKey: '',
      setNewLocationIconKey: () => {},
    }
  },
}))

vi.mock('../useIncidentTypeManager', () => ({
  INCIDENT_TYPE_TOGGLE_VALUE: '__inspection_incident_types_toggle__',
  default: () => ({
    showAddTypeModal: false,
    closeAddModal: () => {},
    incidentEditMode: false,
    setIncidentEditMode: () => {},
    typeOptions: [
      { value: 'General Inspection', title: 'General Inspection' },
      { value: 'ER Aux Equipment Inspection', title: 'ER Aux Equipment Inspection' },
      { value: 'FRT Daily Inspection', title: 'FRT Daily Inspection' },
      {
        value: 'High Angle Rescue Equipment Inspection',
        title: 'High Angle Rescue Equipment Inspection',
      },
      { value: 'Hydraulic Rescue Tools Inspection', title: 'Hydraulic Rescue Tools Inspection' },
      { value: 'SCBA Inspection', title: 'SCBA Inspection' },
      {
        value: 'Health Safety Environment Inspection',
        title: 'Health Safety Environment Inspection',
      },
    ],
    visibleTypeOptions: [
      { value: 'General Inspection', title: 'General Inspection' },
      { value: 'ER Aux Equipment Inspection', title: 'ER Aux Equipment Inspection' },
      { value: 'FRT Daily Inspection', title: 'FRT Daily Inspection' },
      {
        value: 'High Angle Rescue Equipment Inspection',
        title: 'High Angle Rescue Equipment Inspection',
      },
      { value: 'Hydraulic Rescue Tools Inspection', title: 'Hydraulic Rescue Tools Inspection' },
      { value: 'SCBA Inspection', title: 'SCBA Inspection' },
      {
        value: 'Health Safety Environment Inspection',
        title: 'Health Safety Environment Inspection',
      },
    ],
    setShowAllIncidentTypes: () => {},
    openAddModal: () => {},
    removeType: () => {},
    newTypeName: '',
    setNewTypeName: () => {},
    addTypeError: '',
    setAddTypeError: () => {},
    newTypeDescription: '',
    setNewTypeDescription: () => {},
    editingIncidentTypeKey: '',
    startEditType: () => {},
    saveType: () => {},
    iconOptions: [],
    newTypeIconKey: '',
    setNewTypeIconKey: () => {},
  }),
}))

const baseProps = {
  user: { id: 'user-1', name: 'Inspector' },
  pushToast: vi.fn(),
  onChange: vi.fn(),
  onSaveDraft: vi.fn(),
  onRequestReview: vi.fn(),
}

const hydraulicRows = {
  FRT: [
    'Hydraulic Pump Motor 1',
    'Hydraulic Hose 1',
    'Hydraulic Spreader 1',
    'Hydraulic Cutter 1',
    'Hydraulic Combi 1',
    'Hydraulic Cylinder Ramp 1',
  ],
  Store: [
    'Hydraulic Pump Motor 2',
    'Hydraulic Hose 2',
    'Hydraulic Spreader 2',
    'Hydraulic Cutter 2',
    'Hydraulic Combi 2',
    'Hydraulic Cylinder Ramp 2',
  ],
}

const slug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const makeHydraulicChecks = (location = 'FRT', overrides = {}) =>
  hydraulicRows[location].map((equipment) => ({
    id: `${slug(location)}:${slug(equipment)}`,
    location,
    equipment,
    physicalCondition: 'OK',
    mechanicalCondition: 'OK',
    noLeakage: 'OK',
    functionTest: 'OK',
    remarks: '',
    ...(overrides[equipment] || {}),
  }))

describe('InspectionForm workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  it('submits review request when form is valid', () => {
    const onRequestReview = vi.fn()
    const { container } = render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: 'Pump inspection completed.',
          photos: [
            {
              id: 'photo-1',
              fileName: 'photo.png',
              description: 'Pump condition',
              url: 'data:image/png;base64,abc123',
            },
          ],
        }}
      />,
    )

    expect(
      container.querySelector('[data-testid="selected-inspection-type-icon"] svg'),
    ).toBeTruthy()
    fireEvent.click(screen.getAllByText('Save & Review')[0])

    expect(onRequestReview).toHaveBeenCalledTimes(1)
    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedLocation: 'Zone A',
        inspectionType: 'General Inspection',
      }),
    )
  })

  it('shows warning and blocks review request when form is incomplete', () => {
    const onRequestReview = vi.fn()
    const pushToast = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        pushToast={pushToast}
        onRequestReview={onRequestReview}
        value={{
          selectedLocation: '',
          inspectionType: 'General Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Save & Review')[0])

    expect(onRequestReview).not.toHaveBeenCalled()
    expect(pushToast).toHaveBeenCalledWith('Complete the inspection form before review.', {
      title: 'Incomplete form',
      color: 'warning',
    })
    expect(screen.getByText('Choose a main inspection location.')).toBeTruthy()
    expect(screen.getByText('Describe the inspection before review.')).toBeTruthy()
    expect(screen.getByText('Upload at least one inspection photo.')).toBeTruthy()
  })

  it('clears corrected inline validation errors after a failed review attempt', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: '',
          inspectionType: 'General Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Save & Review')[0])
    expect(screen.getByText('Choose a main inspection location.')).toBeTruthy()

    fireEvent.click(screen.getAllByText('Zone A')[0])
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Zone A',
        selectedLocation: 'Zone A',
      }),
    )

    rerender(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.queryByText('Choose a main inspection location.')).toBeNull()
  })

  it('appends quick description chips without replacing existing text', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: 'Existing note',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Follow-up required'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Existing note\nFollow-up required',
      }),
    )
  })

  it('toggles quick-check chips into structured checklist state', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: 'Existing note',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Housekeeping checked'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Existing note\nHousekeeping checked',
        checklist: [
          expect.objectContaining({
            label: 'Housekeeping checked',
            selected: true,
          }),
        ],
      }),
    )
  })

  it('applies photo caption chips to the selected photo', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: 'Pump inspection completed.',
          photos: [
            {
              id: 'photo-1',
              fileName: 'photo.png',
              description: 'Existing caption',
              url: 'data:image/png;base64,abc123',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Defect'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [
          expect.objectContaining({
            id: 'photo-1',
            description: 'Existing caption\nDefect',
          }),
        ],
      }),
    )
  })

  it('selects a sub-location under the selected main location', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Zone A',
          subLocation: '',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByText('Choose Sub-location')).toBeTruthy()
    fireEvent.click(screen.getAllByText('Dock')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Zone A',
        subLocation: 'Dock',
        selectedLocation: 'Zone A > Dock',
      }),
    )
  })

  it('searches large main-location lists and selects an option outside the initial visible list', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Zone A',
          subLocation: 'Dock',
          selectedLocation: 'Zone A > Dock',
          inspectionType: 'Fire Extinguisher Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Search main location...')).toBeTruthy()
    expect(screen.queryByText('Manjung Hub')).toBeNull()

    fireEvent.change(screen.getByLabelText('Search main location'), {
      target: { value: 'manjung' },
    })
    fireEvent.click(screen.getByText('Manjung Hub'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Manjung Hub',
        subLocation: '',
        selectedLocation: 'Manjung Hub',
      }),
    )
  })

  it('searches large sub-location lists and selects the matching sub-location', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Manjung Hub',
          subLocation: '',
          selectedLocation: 'Manjung Hub',
          inspectionType: 'Fire Extinguisher Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Search sub-location...')).toBeTruthy()
    expect(screen.queryByText('Reception')).toBeNull()

    fireEvent.change(screen.getByLabelText('Search sub-location'), {
      target: { value: 'front desk' },
    })
    fireEvent.click(screen.getByText('Reception'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Manjung Hub > Reception',
      }),
    )
  })

  it('marks a safe Fire Extinguisher row good without requiring repeated status taps', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Manjung Hub',
          selectedLocation: 'Manjung Hub',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              feType: 'DP 6KG',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mark all Good' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fireExtinguisherChecks: expect.arrayContaining([
          expect.objectContaining({
            id: 'fe:1',
            physicalCondition: 'Good',
            signageCondition: 'Good',
            boxKeyAvailability: 'Yes',
            boxGlassAvailability: 'Yes',
            operationalCondition: 'Operational',
          }),
        ]),
      }),
    )
  })

  it('keeps Fire Extinguisher defect rows prominent and hides Mark all Good when evidence exists', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Manjung Hub',
          selectedLocation: 'Manjung Hub',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
            },
          ],
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Mark all Good' })).toBeNull()
    expect(screen.getByText('Defect')).toBeTruthy()
    expect(screen.getByPlaceholderText('FE Physical Condition defect remarks')).toBeTruthy()
  })

  it('collapses completed Fire Extinguisher rows and opens the next incomplete row even when search hides it', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Manjung Hub',
          selectedLocation: 'Manjung Hub',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Operational',
            },
            {
              id: 'fe:2',
              mainLocation: 'Manjung Hub',
              subLocation: 'Auditorium',
              idLocNo: 'ADO-002',
              barcodeNo: 'EE042021Y544839',
              physicalCondition: '',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Complete')).toBeTruthy()
    expect(screen.queryByText('General extinguisher remarks')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Search fire extinguisher rows'), {
      target: { value: '544896' },
    })
    expect(screen.queryByText('ADO-002')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next incomplete' }))

    await waitFor(() => {
      expect(screen.getByText('ADO-002')).toBeTruthy()
    })
  })

  it('renders HSE observation and allows area-satisfactory review without photos', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Zone A',
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          hseInspectedBy: 'Inspector A',
          hseInspectionDate: '2026-06-29',
          hseSelections: ['areaSatisfactory'],
          hseAreaConditionRemarks: 'Area is clear and housekeeping is acceptable.',
        }}
      />,
    )

    expect(screen.getByText('HSE Observation')).toBeTruthy()
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.getByText('HSE Evidence Photos')).toBeTruthy()

    fireEvent.click(screen.getAllByText('Save & Review')[0])

    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        hseInspectedBy: 'Inspector A',
        hseInspectionDate: '2026-06-29',
        hseSelections: ['areaSatisfactory'],
        hseAreaConditionRemarks: 'Area is clear and housekeeping is acceptable.',
        photos: [],
      }),
    )
  })

  it('shows exact HSE inline errors for selected finding details and severity', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Zone A',
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          hseInspectedBy: 'Inspector A',
          hseInspectionDate: '2026-06-29',
          hseSelections: ['unsafeAct', 'environmental'],
          hseUnsafeActDetails: '',
          hseEnvironmentalDetails: '',
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Save & Review')[0])

    expect(onRequestReview).not.toHaveBeenCalled()
    expect(screen.getByText('Severity is required for HSE findings.')).toBeTruthy()
    expect(screen.getByText('Unsafe Act Details is required.')).toBeTruthy()
    expect(screen.getByText('Environmental Details is required.')).toBeTruthy()
    expect(screen.getAllByText('3 items need attention before review.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Take HSE photo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Upload HSE photo').length).toBeGreaterThan(0)
  })

  it('shows ER Aux equipment cards for the selected Store location', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Store',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxInspectedBy: '',
          erAuxInspectionDate: '',
          erAuxChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Inspection Session')).toBeTruthy()
    expect(screen.getByText('ER Aux Equipment Checks')).toBeTruthy()
    expect(screen.getByText('Fire Jacket')).toBeTruthy()
    expect(screen.getByText('Animal catcher net')).toBeTruthy()
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.getByText('General Evidence Photos')).toBeTruthy()
    expect(screen.getAllByText('Save & Review').length).toBeGreaterThan(0)
  })

  it('shows FRT Daily structured cards for FIRE TRUCK without a sub-location selector', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FIRE TRUCK',
          selectedLocation: 'FIRE TRUCK',
          inspectionType: 'FRT Daily Inspection',
          photos: [],
          frtInspectedBy: '',
          frtInspectionDate: '',
          frtShift: '',
          frtTruckReference: {
            plateNo: 'AJG9555',
            roadTaxExpiry: '13/02/2026',
            insuranceExpiry: '13/02/2026',
            puspakomExpiry: '19/02/2026',
          },
          frtDailyChecks: [],
          frtDailyRemarks: '',
          frtOneOffChecks: [],
          frtOneOffRemarks: '',
        }}
      />,
    )

    expect(screen.getByText('Inspection Session')).toBeTruthy()
    expect(screen.getByText('Truck Reference')).toBeTruthy()
    expect(screen.getByText('FRT Daily Roster')).toBeTruthy()
    expect(screen.getByText('FRT One-Off Checklist')).toBeTruthy()
    expect(screen.getByText('LOCKER 01')).toBeTruthy()
    expect(screen.getByText('TRUCK CHECKLIST')).toBeTruthy()
    expect(screen.getByText('MILEAGE (ODOMETER)')).toBeTruthy()
    expect(screen.getByText('FUEL LEVEL (%)')).toBeTruthy()
    expect(screen.queryByText('Choose Sub-location')).toBeNull()
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.getAllByText('Save & Review').length).toBeGreaterThan(0)
  })

  it('shows FRT hydraulic equipment cards for the selected FRT location', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Hydraulic Equipment Checks')).toBeTruthy()
    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Cylinder Ramp 1')).toBeTruthy()
    expect(screen.queryByText('Hydraulic Pump Motor 2')).toBeNull()
    expect(screen.getAllByText('FRT').length).toBeGreaterThan(0)
    expect(screen.getByText('0 of 6 checked')).toBeTruthy()
    expect(screen.getByText('No defects')).toBeTruthy()
    expect(screen.getByText('General Evidence Photos')).toBeTruthy()
    expect(screen.getAllByText('Save & Review').length).toBeGreaterThan(0)
  })

  it('shows Store hydraulic equipment cards for the selected Store location', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Store',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Hydraulic Pump Motor 2')).toBeTruthy()
    expect(screen.getByText('Hydraulic Cylinder Ramp 2')).toBeTruthy()
    expect(screen.queryByText('Hydraulic Pump Motor 1')).toBeNull()
  })

  it('shows SCBA section cards for the selected FRT location', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'SCBA Inspection',
          photos: [],
          scbaInspectedBy: '',
          scbaInspectionDate: '',
          scbaBackPlateChecks: [],
          scbaCylinderChecks: [],
          scbaFaceMaskChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Inspection Session')).toBeTruthy()
    expect(screen.getByText('SCBA Checks')).toBeTruthy()
    expect(screen.getByText('Back Plate')).toBeTruthy()
    expect(screen.getByText('Cylinder')).toBeTruthy()
    expect(screen.getByText('Face Mask')).toBeTruthy()
    expect(screen.getByText('MSA 06')).toBeTruthy()
    expect(screen.getByText('Drager 02')).toBeTruthy()
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.getAllByText('Save & Review').length).toBeGreaterThan(0)
  })

  it('shows High Angle kit cards for the selected Response Kit #1', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Response Kit #1',
          inspectionType: 'High Angle Rescue Equipment Inspection',
          photos: [],
          highAngleInspectedBy: '',
          highAngleInspectionDate: '',
          highAngleChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Inspection Session')).toBeTruthy()
    expect(screen.getByText('High Angle Rescue Equipment Checks')).toBeTruthy()
    expect(screen.getAllByText('Response Kit #1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('General Kit Items').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Heavy Duty Organizer Bag').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Main Compartment').length).toBeGreaterThan(0)
    expect(screen.getByText('Locking Carabiner - CT - Steel - S')).toBeTruthy()
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('Qty 10') ?? false).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
  })

  it('updates High Angle row conditions from segmented controls', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Response Kit #1',
          inspectionType: 'High Angle Rescue Equipment Inspection',
          photos: [],
          highAngleInspectedBy: '',
          highAngleInspectionDate: '',
          highAngleChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Not Good')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        highAngleChecks: expect.arrayContaining([
          expect.objectContaining({
            mainLocation: 'Response Kit #1',
            equipment: 'Heavy Duty Organizer Bag',
            condition: 'Not Good',
          }),
        ]),
      }),
    )
  })

  it('updates SCBA grouped checks from segmented controls', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'SCBA Inspection',
          photos: [],
          scbaInspectedBy: '',
          scbaInspectionDate: '',
          scbaBackPlateChecks: [],
          scbaCylinderChecks: [],
          scbaFaceMaskChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Not Good')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        scbaBackPlateChecks: expect.arrayContaining([
          expect.objectContaining({
            sectionKey: 'backPlate',
            brand: 'MSA',
            serialNo: '06',
            backPlateHarnessCondition: 'Not Good',
          }),
        ]),
      }),
    )
  })

  it('updates FRT daily and one-off rows through the structured controls', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FIRE TRUCK',
          selectedLocation: 'FIRE TRUCK',
          inspectionType: 'FRT Daily Inspection',
          photos: [],
          frtInspectedBy: '',
          frtInspectionDate: '',
          frtShift: '',
          frtTruckReference: {
            plateNo: 'AJG9555',
            roadTaxExpiry: '13/02/2026',
            insuranceExpiry: '13/02/2026',
            puspakomExpiry: '19/02/2026',
          },
          frtDailyChecks: [],
          frtDailyRemarks: '',
          frtOneOffChecks: [],
          frtOneOffRemarks: '',
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Issue')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frtDailyChecks: expect.arrayContaining([
          expect.objectContaining({
            equipment: 'FIRE HOSE 2.5"',
            location: 'LOCKER 01',
            status: 'Issue',
          }),
        ]),
      }),
    )

    fireEvent.click(screen.getAllByText('Not Good')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frtOneOffChecks: expect.arrayContaining([
          expect.objectContaining({
            equipment: 'POWER WINDOW',
            location: 'TRUCK CHECKLIST',
            condition: 'Not Good',
          }),
        ]),
      }),
    )
  })

  it('updates hydraulic check values from segmented controls', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Defect')[0])

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        hydraulicChecks: [
          expect.objectContaining({
            equipment: 'Hydraulic Pump Motor 1',
            physicalCondition: 'Defect',
          }),
        ],
      }),
    )
  })

  it('marks all visible hydraulic equipment checks OK in one action', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Mark all OK'))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.hydraulicChecks).toHaveLength(6)
    expect(latestForm.hydraulicChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
        }),
        expect.objectContaining({
          equipment: 'Hydraulic Cylinder Ramp 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
        }),
      ]),
    )
  })

  it('marks one hydraulic equipment card OK without clearing hidden defect evidence', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              functionTest: 'Defect',
              functionTestRemarks: 'Slow response captured earlier.',
              functionTestPhotos: [
                {
                  id: 'defect-photo-1',
                  fileName: 'defect.jpg',
                  description: 'Function defect',
                  url: 'data:image/png;base64,abc123',
                },
              ],
            },
          }),
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Mark OK')[0])

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.hydraulicChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'OK',
          functionTestRemarks: 'Slow response captured earlier.',
          functionTestPhotos: [expect.objectContaining({ id: 'defect-photo-1' })],
        }),
      ]),
    )
  })

  it('requires a reason when a hydraulic check is marked N/A', () => {
    const onRequestReview = vi.fn()
    const pushToast = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        pushToast={pushToast}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              functionTest: 'N/A',
              functionTestRemarks: '',
            },
          }),
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Function Test N/A reason')).toBeTruthy()
    fireEvent.click(screen.getAllByText('Save & Review')[0])
    expect(onRequestReview).not.toHaveBeenCalled()
    expect(screen.getByText('Function Test N/A reason is required.')).toBeTruthy()

    rerender(
      <InspectionForm
        {...baseProps}
        pushToast={pushToast}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              functionTest: 'N/A',
              functionTestRemarks: 'Equipment temporarily unavailable.',
            },
          }),
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Save & Review')[0])
    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        hydraulicChecks: expect.arrayContaining([
          expect.objectContaining({
            equipment: 'Hydraulic Pump Motor 1',
            functionTest: 'N/A',
            functionTestRemarks: 'Equipment temporarily unavailable.',
          }),
        ]),
      }),
    )
  })

  it('cancels empty optional equipment remarks and clears filled optional remarks', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT'),
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Add general remark')[0])
    expect(screen.getByPlaceholderText('General equipment remarks')).toBeTruthy()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByPlaceholderText('General equipment remarks')).toBeNull()

    rerender(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              remarks: 'General note to clear.',
            },
          }),
        }}
      />,
    )

    fireEvent.click(screen.getByText('Clear'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        hydraulicChecks: expect.arrayContaining([
          expect.objectContaining({
            equipment: 'Hydraulic Pump Motor 1',
            remarks: '',
          }),
        ]),
      }),
    )
  })

  it('opens per-defect evidence blocks and blocks review until each defect has remarks and photos', () => {
    const onRequestReview = vi.fn()
    const pushToast = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        pushToast={pushToast}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              physicalCondition: 'Defect',
              noLeakage: 'Defect',
            },
          }),
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Physical Condition defect remarks')).toBeTruthy()
    expect(screen.getByPlaceholderText('No Leakage defect remarks')).toBeTruthy()
    expect(screen.getAllByText('Add defect photo').length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getAllByText('Save & Review')[0])
    expect(onRequestReview).not.toHaveBeenCalled()
    expect(screen.getByText('Add defect evidence and N/A reasons before review.')).toBeTruthy()
    expect(screen.getByText('Physical Condition defect remarks are required.')).toBeTruthy()
    expect(screen.getByText('Physical Condition defect photo is required.')).toBeTruthy()
    expect(screen.queryByText('Upload at least one inspection photo.')).toBeNull()

    rerender(
      <InspectionForm
        {...baseProps}
        pushToast={pushToast}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: makeHydraulicChecks('FRT', {
            'Hydraulic Pump Motor 1': {
              physicalCondition: 'Defect',
              physicalConditionRemarks: 'Damaged coupling.',
              physicalConditionPhotos: [
                {
                  id: 'defect-photo-1',
                  fileName: 'defect.jpg',
                  description: 'Defect evidence',
                  url: 'data:image/png;base64,abc123',
                },
              ],
            },
          }),
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Save & Review')[0])
    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionType: 'Hydraulic Rescue Tools Inspection',
        hydraulicChecks: expect.arrayContaining([
          expect.objectContaining({
            equipment: 'Hydraulic Pump Motor 1',
            physicalCondition: 'Defect',
            physicalConditionRemarks: 'Damaged coupling.',
            physicalConditionPhotos: expect.arrayContaining([
              expect.objectContaining({ id: 'defect-photo-1' }),
            ]),
          }),
        ]),
      }),
    )
  })

  it('restores the full form after switching from HSE to General Inspection', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByText('HSE Observation')).toBeTruthy()

    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('General Inspection'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionType: 'General Inspection',
      }),
    )

    rerender(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'General Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.queryByText('HSE Observation')).toBeNull()
    expect(screen.getByText('Quick Checks')).toBeTruthy()
    expect(screen.getByText('Describe')).toBeTruthy()
    expect(screen.getByText('Upload Photos and Describe')).toBeTruthy()
    expect(screen.getAllByText('Save & Review').length).toBeGreaterThan(0)
  })

  it('keeps the environment camera input available for take photo', () => {
    const { container } = render(
      <InspectionForm
        {...baseProps}
        value={{
          selectedLocation: '',
          inspectionType: '',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(container.querySelector('input[type="file"][capture="environment"]')).toBeTruthy()
  })
})
