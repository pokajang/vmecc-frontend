// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import InspectionForm from '../InspectionForm'
import { ErAuxEquipmentChecks } from '../form/components/InspectionFormDisplaySections'
import { buildInspectionPayloadSnapshot, normalizeInspectionForm } from '../inspectionFormHelpers'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'

const typeManagerModalMock = vi.hoisted(() => ({
  props: [],
}))

const reportMediaApiMock = vi.hoisted(() => ({
  deleteReportMedia: vi.fn(async () => true),
  getReportPhotoBytes: vi.fn((photo = {}) => Number(photo.sizeBytes || photo.size || 1)),
  reportPhotoFailureMessage: vi.fn(
    (code, fileName = '') => `${fileName || 'Selected photo'} could not be processed (${code}).`,
  ),
  uploadReportPhotosSequentially: vi.fn(async ({ files = [] } = {}) =>
    (Array.isArray(files) ? files : []).map((file, index) => ({
      id: `uploaded-photo-${index + 1}`,
      mediaId: `media-${index + 1}`,
      url: `https://example.test/report-media/media-${index + 1}`,
      thumbnailUrl: `https://example.test/report-media/media-${index + 1}/thumbnail`,
      fileName: file?.name || `photo-${index + 1}.png`,
      mimeType: file?.type || 'image/png',
      sizeBytes: Number(file?.size || 1),
      width: 1,
      height: 1,
    })),
  ),
}))

const inspectionSessionApiMock = vi.hoisted(() => ({
  createOrResumeInspectionSession: vi.fn(async () => ({
    sessionUid: 'workflow-session-1',
    status: 'active',
    version: 1,
    results: [],
    progress: { sessionUid: 'workflow-session-1', sessionVersion: 1 },
  })),
  fetchInspectionSession: vi.fn(async () => null),
  fetchInspectionSessionProgress: vi.fn(async () => ({
    sessionUid: 'workflow-session-1',
    sessionVersion: 1,
  })),
  fetchInspectionSessionResults: vi.fn(async () => ({ rows: [], meta: null })),
  completeInspectionSessionExtinguisher: vi.fn(async ({ row }) => ({ row, meta: null })),
  resetInspectionSessionExtinguisher: vi.fn(async () => ({ row: null, meta: null })),
  getFireExtinguisherAssetKey: vi.fn((row = {}) =>
    String(row.canonicalAssetKey || row.catalogId || row.id || ''),
  ),
}))

const createStorageMock = () => {
  const rows = new Map()
  return {
    get length() {
      return rows.size
    },
    key: (index) => [...rows.keys()][index] || null,
    getItem: (key) => (rows.has(key) ? rows.get(key) : null),
    setItem: (key, value) => rows.set(key, String(value)),
    removeItem: (key) => rows.delete(key),
    clear: () => rows.clear(),
  }
}

vi.mock('../domain/api/inspectionSessionApi', () => inspectionSessionApiMock)

vi.mock('src/services/api/reportMediaApi', () => ({
  CAMERA_SOURCE_MAX_BYTES: 30 * 1024 * 1024,
  deleteReportMedia: reportMediaApiMock.deleteReportMedia,
  getReportPhotoBytes: reportMediaApiMock.getReportPhotoBytes,
  reportPhotoFailureMessage: reportMediaApiMock.reportPhotoFailureMessage,
  uploadReportPhotosSequentially: reportMediaApiMock.uploadReportPhotosSequentially,
}))

const fireTruckApiMock = vi.hoisted(() => {
  const normalizeRows = (rows = []) =>
    (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const truckId = row?.truckId ?? row?.truck_id ?? row?.id ?? ''
        const plateNo = String(row?.plateNo || row?.plate_no || row?.value || row?.title || '')
          .trim()
          .toUpperCase()
        if (!plateNo) return null
        const name = String(row?.name || row?.description || '').trim()
        const source = String(row?.source || 'custom').trim()
        return {
          ...row,
          id: String(truckId || plateNo),
          truckId,
          plateNo,
          value: plateNo,
          title: plateNo,
          name,
          description: name,
          roadTaxExpiry: String(row?.roadTaxExpiry || row?.road_tax_expiry || ''),
          insuranceExpiry: String(row?.insuranceExpiry || row?.insurance_expiry || ''),
          puspakomExpiry: String(row?.puspakomExpiry || row?.puspakom_expiry || ''),
          source,
          canEdit: row?.canEdit === true || (row?.canEdit !== false && source !== 'seed'),
          canDelete: row?.canDelete === true || (row?.canDelete !== false && source !== 'seed'),
        }
      })
      .filter(Boolean)

  return {
    rows: normalizeRows([
      {
        id: 'truck-1',
        truckId: 'truck-1',
        plateNo: 'AJG9555',
        name: 'Fire Truck',
        roadTaxExpiry: '2026-02-13',
        insuranceExpiry: '2026-02-13',
        puspakomExpiry: '2026-02-19',
        source: 'custom',
      },
    ]),
    normalizeRows,
    fetchFireTruckOptions: vi.fn(async () => ({
      data: fireTruckApiMock.rows,
      meta: {},
    })),
    createFireTruckOption: vi.fn(
      async (payload) =>
        normalizeRows([{ id: 'truck-new', truckId: 'truck-new', source: 'custom', ...payload }])[0],
    ),
    updateFireTruckOption: vi.fn(
      async (id, payload) => normalizeRows([{ id, truckId: id, source: 'custom', ...payload }])[0],
    ),
    deleteFireTruckOption: vi.fn(async () => true),
    loadCachedFireTruckCatalog: vi.fn(() => fireTruckApiMock.rows),
    saveCachedFireTruckCatalog: vi.fn((rows) => {
      fireTruckApiMock.rows = normalizeRows(rows)
    }),
  }
})

const scbaCatalogApiMock = vi.hoisted(() => {
  const normalizeFields = (fields = []) =>
    (Array.isArray(fields) ? fields : []).map((field) => ({
      key: String(field?.key || field?.label || 'check')
        .trim()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, character) => character.toUpperCase())
        .replace(/^[A-Z]/, (character) => character.toLowerCase()),
      label: String(field?.label || field?.name || field || '').trim(),
      kind: 'status',
    }))
  const normalizeSections = (sections = []) =>
    (Array.isArray(sections) ? sections : []).map((section, index) => ({
      ...section,
      id: String(section?.id || section?.catalogSectionId || `scba-section-${index + 1}`),
      catalogSectionId: section?.catalogSectionId || section?.id || `scba-section-${index + 1}`,
      key:
        section?.key ||
        `customScba-${String(section?.title || 'section')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`,
      title: String(section?.title || '').trim(),
      shortLabel: String(section?.shortLabel || section?.title || '').trim(),
      fields: normalizeFields(section?.fields),
      rows: Array.isArray(section?.rows) ? section.rows : [],
      isCustomSection: true,
      source: 'custom',
      canEdit: true,
      canDelete: true,
    }))

  return {
    sections: [],
    normalizeSections,
    fetchScbaCatalog: vi.fn(async () => ({ data: scbaCatalogApiMock.sections, meta: {} })),
    loadCachedScbaCatalog: vi.fn(() => scbaCatalogApiMock.sections),
    saveCachedScbaCatalog: vi.fn((sections) => {
      scbaCatalogApiMock.sections = normalizeSections(sections)
    }),
    createScbaCatalogSection: vi.fn(async (payload) => {
      const saved = normalizeSections([
        {
          id: `scba-section-${scbaCatalogApiMock.sections.length + 1}`,
          catalogSectionId: `scba-section-${scbaCatalogApiMock.sections.length + 1}`,
          ...payload,
        },
      ])[0]
      scbaCatalogApiMock.sections = [...scbaCatalogApiMock.sections, saved]
      return saved
    }),
    updateScbaCatalogSection: vi.fn(
      async (id, payload) => normalizeSections([{ id, catalogSectionId: id, ...payload }])[0],
    ),
    archiveScbaCatalogSection: vi.fn(async () => true),
    createScbaCatalogItem: vi.fn(async (sectionId, payload) => ({
      id: `scba-item-${Date.now()}`,
      catalogItemId: `scba-item-${Date.now()}`,
      catalogSectionId: sectionId,
      sectionKey: '',
      location: payload.mainLocation || payload.location || '',
      mainLocation: payload.mainLocation || payload.location || '',
      brand: payload.brand || '',
      serialNo: payload.serialNo || '',
      equipmentDescription: payload.equipmentDescription || '',
      equipmentSource: 'custom',
      isCustomEquipment: true,
    })),
    updateScbaCatalogItem: vi.fn(async (id, payload) => ({ id, catalogItemId: id, ...payload })),
    archiveScbaCatalogItem: vi.fn(async () => true),
  }
})

vi.mock('../inspectionFireTruckApi', () => ({
  fetchFireTruckOptions: fireTruckApiMock.fetchFireTruckOptions,
  createFireTruckOption: fireTruckApiMock.createFireTruckOption,
  updateFireTruckOption: fireTruckApiMock.updateFireTruckOption,
  deleteFireTruckOption: fireTruckApiMock.deleteFireTruckOption,
  loadCachedFireTruckCatalog: fireTruckApiMock.loadCachedFireTruckCatalog,
  saveCachedFireTruckCatalog: fireTruckApiMock.saveCachedFireTruckCatalog,
  normalizeFireTruckCatalogRows: fireTruckApiMock.normalizeRows,
}))

vi.mock('../inspectionScbaCatalogApi', () => ({
  fetchScbaCatalog: scbaCatalogApiMock.fetchScbaCatalog,
  loadCachedScbaCatalog: scbaCatalogApiMock.loadCachedScbaCatalog,
  saveCachedScbaCatalog: scbaCatalogApiMock.saveCachedScbaCatalog,
  createScbaCatalogSection: scbaCatalogApiMock.createScbaCatalogSection,
  updateScbaCatalogSection: scbaCatalogApiMock.updateScbaCatalogSection,
  archiveScbaCatalogSection: scbaCatalogApiMock.archiveScbaCatalogSection,
  createScbaCatalogItem: scbaCatalogApiMock.createScbaCatalogItem,
  updateScbaCatalogItem: scbaCatalogApiMock.updateScbaCatalogItem,
  archiveScbaCatalogItem: scbaCatalogApiMock.archiveScbaCatalogItem,
  normalizeScbaCatalogSections: scbaCatalogApiMock.normalizeSections,
}))

vi.mock('src/components/report-workflow/TypeManagerModal', () => ({
  default: (props) => {
    typeManagerModalMock.props.push(props)
    return null
  },
}))

vi.mock('../useLocationTypeManager', () => ({
  LOCATION_TOGGLE_VALUE: '__inspection_location_types_toggle__',
  default: ({
    inspectionType = '',
    zone = '',
    mainLocation = '',
    subLocation = '',
    updateSetupField,
  }) => {
    const defaultMainLocationOptions = [
      { value: 'Zone A', title: 'Zone A', description: 'Zone A' },
      { value: 'FRT', title: 'FRT', description: 'FRT' },
      { value: 'Store', title: 'Store', description: 'Store' },
      { value: 'FIRE TRUCK', title: 'FIRE TRUCK', description: 'FIRE TRUCK' },
      { value: 'Response Kit #1', title: 'Response Kit #1', description: 'Response Kit #1' },
      { value: 'Rescue Rope', title: 'Rescue Rope', description: 'Rescue Rope' },
    ]
    const fireZoneOptions = [
      { value: '1', title: 'Zone 1', description: 'Zone 1' },
      { value: '2', title: 'Zone 2', description: 'Zone 2' },
    ]
    const fireAreaOptions = [
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
    const mainLocationOptions = isFireExtinguisher ? fireZoneOptions : defaultMainLocationOptions
    const areaOptions = isFireExtinguisher && zone ? fireAreaOptions : []
    const subLocationOptions = isFireExtinguisher
      ? fireSubLocationOptions
      : mainLocation
        ? [{ value: 'Dock', title: 'Dock', description: 'Dock' }]
        : []
    const visibleMainLocationOptions = isFireExtinguisher
      ? mainLocationOptions
      : mainLocationOptions
    const visibleAreaOptions =
      isFireExtinguisher && areaOptions.length > 0
        ? [
            ...areaOptions.slice(0, 4),
            { value: '__inspection_location_types_toggle__', title: 'Show more' },
          ]
        : areaOptions
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
      zoneOptions: fireZoneOptions,
      visibleZoneOptions: fireZoneOptions,
      areaOptions,
      visibleAreaOptions,
      subLocationOptions,
      visibleSubLocationOptions,
      editLocationOptions: mainLocationOptions,
      setShowAllLocationTypes: () => {},
      setShowAllMainLocationTypes: () => {},
      setShowAllSubLocationTypes: () => {},
      openAddModal: () => {},
      openAddZoneModal: () => {},
      openAddMainLocationModal: () => {},
      openAddSubLocationModal: () => {},
      removeType: () => {},
      setShowAllZoneTypes: () => {},
      setZone: (value) =>
        updateSetupField('locationSelection', {
          zone: value,
          mainLocation: '',
          subLocation: '',
        }),
      setMainLocation: (value) =>
        updateSetupField('locationSelection', { zone, mainLocation: value, subLocation: '' }),
      setSubLocation: (value) =>
        updateSetupField('locationSelection', {
          zone,
          mainLocation,
          subLocation: subLocation === value ? '' : value,
        }),
      selectedZoneTitle: zone,
      selectedMainLocationTitle: mainLocation,
      isEditingZone: false,
      isEditingMainArea: false,
      isEditingLocation: false,
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

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
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

const makeCompletedFrtLockerOneRows = () => ({
  dailyChecks: Array.from({ length: 6 }, (_, index) => {
    const rowNumber = String(index + 1)
    return {
      id: `daily:fire-truck:${rowNumber}`,
      rowNumber,
      location: 'LOCKER 01',
      compartment: 'LOCKER 01',
      status: 'Checked',
    }
  }),
  oneOffChecks: ['24', '25'].map((rowNumber) => ({
    id: `one-off:fire-truck:${rowNumber}`,
    rowNumber,
    location: 'LOCKER NO 01',
    compartment: 'LOCKER 01',
    condition: 'Good',
  })),
})

const openScbaGroup = async (groupName) => {
  const groupLabel = await screen.findByText(groupName)
  const groupButton = groupLabel.closest('button')
  if (!groupButton) {
    throw new Error(`Unable to find SCBA group button for ${groupName}`)
  }
  fireEvent.click(groupButton)
}

describe('InspectionForm workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
    typeManagerModalMock.props.length = 0
    window.localStorage?.clear?.()
    window.sessionStorage?.clear?.()
    fireTruckApiMock.rows = fireTruckApiMock.normalizeRows([
      {
        id: 'truck-1',
        truckId: 'truck-1',
        plateNo: 'AJG9555',
        name: 'Fire Truck',
        roadTaxExpiry: '2026-02-13',
        insuranceExpiry: '2026-02-13',
        puspakomExpiry: '2026-02-19',
        source: 'custom',
      },
    ])
    scbaCatalogApiMock.sections = []
  })
  afterEach(() => {
    cleanup()
    delete window.matchMedia
  })

  it('loads Fire Extinguisher main areas after selecting a zone', async () => {
    const ControlledFireForm = () => {
      const [form, setForm] = React.useState({
        inspectionType: 'Fire Extinguisher Inspection',
        description: '',
        photos: [],
      })

      return (
        <InspectionForm
          {...baseProps}
          value={form}
          onChange={(nextForm) =>
            setForm((current) => ({
              ...current,
              ...(typeof nextForm === 'function' ? nextForm(current) : nextForm),
            }))
          }
        />
      )
    }

    render(<ControlledFireForm />)

    expect(screen.queryByText('Choose Main Area')).toBeNull()

    fireEvent.click(screen.getByText('By Area'))
    fireEvent.click(screen.getAllByText('Zone 1')[0].closest('[role="radio"]'))

    expect(await screen.findByText('Choose Main Area')).toBeTruthy()
    expect(screen.getAllByText('Fire Location 1').length).toBeGreaterThan(0)
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
          inspectionIssues: [{ id: 'issue-1', description: 'Pump inspection completed.' }],
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
    fireEvent.click(screen.getAllByText('Continue to Review')[0])

    expect(onRequestReview).toHaveBeenCalledTimes(1)
    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedLocation: 'Zone A',
        inspectionType: 'General Inspection',
      }),
    )
  })

  it('hides Continue to Review when the current form has no completed items', () => {
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

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
    expect(pushToast).not.toHaveBeenCalled()
  })

  it('does not show General Inspection review actions before findings are recorded', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          selectedLocation: '',
          inspectionType: 'General Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
    expect(screen.queryByText('Choose a zone and main area.')).toBeNull()
    expect(screen.queryByText('Describe the inspection before review.')).toBeNull()
    expect(screen.queryByText('Upload at least one inspection photo.')).toBeNull()
  })

  it('does not expose General Inspection checklist chips in the top-level flow', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: 'Zone A',
          mainLocation: 'Area A',
          subLocation: 'Site Office',
          selectedLocation: 'Zone A > Area A > Site Office',
          inspectionType: 'General Inspection',
          description: 'Existing note',
          inspectionIssues: [{ id: 'issue-1', description: 'Existing note' }],
          photos: [],
        }}
      />,
    )

    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByText('Housekeeping checked')).toBeNull()
    expect(screen.queryByText('Follow-up required')).toBeNull()
    expect(screen.getAllByText('Continue to Review').length).toBeGreaterThan(0)
  })

  it('does not expose General Inspection checklist chips', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: 'Zone A',
          mainLocation: 'Area A',
          subLocation: 'Site Office',
          selectedLocation: 'Zone A > Area A > Site Office',
          inspectionType: 'General Inspection',
          description: 'Existing note',
          photos: [],
        }}
      />,
    )

    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByText('Housekeeping checked')).toBeNull()
    expect(screen.queryByText('Access/egress clear')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add finding' })).toBeTruthy()
  })

  it('updates the selected photo description', () => {
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

    fireEvent.change(screen.getByPlaceholderText('Describe this photo'), {
      target: { value: 'Updated caption' },
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [
          expect.objectContaining({
            id: 'photo-1',
            description: 'Updated caption',
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
          zone: '1',
          mainLocation: 'Fire Location 1',
          subLocation: '',
          selectedLocation: 'Zone 1 > Fire Location 1',
          inspectionType: 'Fire Extinguisher Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Search main area...')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Search main area'), {
      target: { value: 'manjung' },
    })
    fireEvent.click(screen.getByText('Manjung Hub'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: '',
        selectedLocation: 'Zone 1 > Manjung Hub',
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
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: '',
          selectedLocation: 'Zone 1 > Manjung Hub',
          inspectionType: 'Fire Extinguisher Inspection',
          description: '',
          photos: [],
        }}
      />,
    )

    expect(screen.getByPlaceholderText('Search location...')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('Search location...'), {
      target: { value: 'front desk' },
    })
    fireEvent.click(screen.getByText('Reception'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        selectedLocation: 'Zone 1 > Manjung Hub > Reception',
      }),
    )
  })

  it('shows the Fire Extinguisher full list without the removed on-site route view', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
            {
              id: 'fe:2',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-002',
              barcodeNo: 'EE042021Y544839',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Extinguishers')).toBeTruthy()
    expect(screen.getByLabelText('Search fire extinguisher rows')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'On-site run' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Full list' })).toBeNull()
    expect(screen.queryByText('On-site Fire Extinguisher Run')).toBeNull()
    expect(screen.queryByText('Route queue')).toBeNull()
    expect(screen.queryByText('Current unit')).toBeNull()
  })

  it('keeps Fire Extinguisher defect rows prominent when evidence is required', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
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

    expect(screen.getByText('Defect (1)')).toBeTruthy()
    expect(screen.getByPlaceholderText('FE Physical Condition defect remarks')).toBeTruthy()
  })

  it('uses an app confirmation instead of the browser confirm before rescanning an incomplete FE', async () => {
    const browserConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherEntryMode: 'scan',
          fireExtinguisherScannedLocator: 'EE042021Y544896',
          fireExtinguisherFocusedAssetKey: 'catalog:fe:scan-1',
          fireExtinguisherCatalogRows: [
            {
              id: 'fe:scan-1',
              catalogId: 'fe:scan-1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              certificationValidity: '2026-12-01',
            },
          ],
          fireExtinguisherChecks: [
            {
              id: 'fe:scan-1',
              catalogId: 'fe:scan-1',
              canonicalAssetKey: 'catalog:fe:scan-1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
            },
          ],
        }}
      />,
    )

    expect(await screen.findByText('ADO-001')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Inspect More FE'))

    expect(browserConfirm).not.toHaveBeenCalled()
    expect(
      await screen.findByText('Current FE is not complete. Inspect More FE anyway?'),
    ).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Inspect More FE' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }))
    await waitFor(() => {
      expect(screen.queryByText('Current FE is not complete. Inspect More FE anyway?')).toBeNull()
    })

    browserConfirm.mockRestore()
  })

  it('reopens the FE serial search scanner when Inspect More FE is confirmed', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          photos: [],
          fireExtinguisherEntryMode: 'scan',
          fireExtinguisherScannedLocator: 'EE042021Y544896',
          fireExtinguisherFocusedAssetKey: 'barcode:ee042021y544896',
          fireExtinguisherChecks: [
            {
              key: 'fe:barcode:ee042021y544896',
              canonicalAssetKey: 'barcode:ee042021y544896',
              identityKey: 'barcode:ee042021y544896',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              location: 'Reception',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              zone: '1',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByLabelText('Inspect More FE'))
    expect(
      await screen.findByText('Current FE is not complete. Inspect More FE anyway?'),
    ).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: 'Inspect More FE' }).at(-1))

    expect(await screen.findByText('Search FE by Serial Number')).toBeTruthy()
  })

  it('keeps saved fire extinguisher rows visible when the catalog result is partial', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          photos: [],
          fireExtinguisherCatalogRows: [
            {
              id: 'fe:1',
              catalogId: 'fe:1',
              sourceRowNumber: '1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              certificationValidity: '2026-12-01',
            },
          ],
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              catalogId: 'fe:1',
              sourceRowNumber: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
            {
              id: 'fe:999',
              zone: '1',
              sourceRowNumber: '999',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-999',
              barcodeNo: 'EE042021Y999999',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('ADO-001')).toBeTruthy()
    expect(screen.getByText('ADO-999')).toBeTruthy()
    expect(screen.getByDisplayValue('Cylinder body dented.')).toBeTruthy()
  })

  it('renders completed Fire Extinguisher units as compact summaries until opened', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('ADO-001')).toBeTruthy()
    expect(screen.queryByText('FE Physical Condition')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByText('FE Physical Condition')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.queryByText('FE Physical Condition')).toBeNull()
  })

  it('opens and collapses a Fire Extinguisher card from the card header interaction', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    const card = document.querySelector('[data-fire-extinguisher-row-id="fe:1"]')
    const headerToggle = within(card).getAllByRole('button', { name: /ADO-001/i })[0]

    expect(screen.queryByText('FE Physical Condition')).toBeNull()

    fireEvent.click(headerToggle)
    expect(screen.getByText('FE Physical Condition')).toBeTruthy()

    fireEvent.click(headerToggle)
    expect(screen.queryByText('FE Physical Condition')).toBeNull()
  })

  it('keeps only one Fire Extinguisher checklist body open at a time', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: '',
            },
            {
              id: 'fe:2',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-002',
              barcodeNo: 'EE042021Y544839',
              physicalCondition: '',
            },
          ],
        }}
      />,
    )

    expect(screen.getAllByText('FE Physical Condition')).toHaveLength(1)

    const secondRow = document.querySelector('[data-fire-extinguisher-row-id="fe:2"]')
    fireEvent.click(within(secondRow).getByRole('button', { name: 'Open' }))

    expect(screen.getAllByText('FE Physical Condition')).toHaveLength(1)
    expect(within(secondRow).getByText('FE Physical Condition')).toBeTruthy()
  })

  it('shows shared extinguisher edit warning copy for seeded catalog rows', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              catalogId: '1',
              equipmentSource: 'seed',
              canEdit: true,
              canDelete: true,
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              feType: 'DP 6KG',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Extinguisher actions for ADO-001' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' }).at(-1))

    await waitFor(() => {
      expect(
        screen.getByText(
          'This item is shared across inspections. Changes will affect future inspections.',
        ),
      ).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Save global change' })).toBeTruthy()
  })

  it('confirms shared extinguisher delete with future-inspection warning copy', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              catalogId: '1',
              equipmentSource: 'seed',
              canEdit: true,
              canDelete: true,
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              feType: 'DP 6KG',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Extinguisher actions for ADO-001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Delete Extinguisher')).toBeTruthy()
    })
    expect(
      screen.getByText(
        'Delete this shared extinguisher? This will remove it from all future inspections. Past inspection records will not be changed.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('sends Fire Extinguisher defect rows to the Continue to Review flow', async () => {
    const onRequestReview = vi.fn()
    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          photos: [],
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    expect(screen.getAllByText('Continue to Review').length).toBeGreaterThan(0)
    expect(onRequestReview).not.toHaveBeenCalled()
    onRequestReview.mockClear()

    rerender(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          selectedLocation: 'Zone 1 > Manjung Hub > Reception',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-06-29',
          photos: [],
          fireExtinguisherChecks: [
            {
              id: 'fe:1',
              zone: '1',
              mainLocation: 'Manjung Hub',
              subLocation: 'Reception',
              idLocNo: 'ADO-001',
              barcodeNo: 'EE042021Y544896',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
              physicalConditionPhotos: [
                {
                  id: 'fe-photo-1',
                  fileName: 'dent.jpg',
                  description: 'Cylinder defect',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    const reviewButton = screen.getAllByText('Continue to Review')[0].closest('button')
    await waitFor(() => expect(reviewButton.disabled).toBe(false))
    fireEvent.click(reviewButton)

    await waitFor(() =>
      expect(onRequestReview).toHaveBeenCalledWith(
        expect.objectContaining({
          fireExtinguisherInspectedBy: 'Inspector',
          fireExtinguisherInspectionDate: '2026-06-29',
          fireExtinguisherChecks: expect.arrayContaining([
            expect.objectContaining({
              id: 'fe:1',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder body dented.',
              physicalConditionPhotos: [
                expect.objectContaining({
                  id: 'fe-photo-1',
                  description: 'Cylinder defect',
                }),
              ],
            }),
          ]),
        }),
      ),
    )
  })

  it('allows Fire Extinguisher review for completed subset rows without requiring untouched catalog rows', async () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          zone: '1',
          mainLocation: 'Canteen',
          subLocation: 'Canteen',
          selectedLocation: 'Zone 1 > Canteen > Canteen',
          inspectionType: 'Fire Extinguisher Inspection',
          fireExtinguisherEntryMode: 'area',
          fireExtinguisherInspectedBy: 'Inspector Fire',
          fireExtinguisherInspectionDate: '2026-07-08',
          photos: [],
          fireExtinguisherCatalogRows: [
            {
              id: 'catalog:1',
              catalogId: '1',
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Canteen',
              idLocNo: 'CAN-001',
              barcodeNo: 'CAN-001-BC',
              feType: 'DP 9KG',
              certificationValidity: '2026-12-31',
            },
            {
              id: 'catalog:2',
              catalogId: '2',
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Canteen',
              idLocNo: 'CAN-002',
              barcodeNo: 'CAN-002-BC',
              feType: 'DP 9KG',
              certificationValidity: '2026-12-31',
            },
            {
              id: 'catalog:3',
              catalogId: '3',
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Canteen',
              idLocNo: 'CAN-003',
              barcodeNo: 'CAN-003-BC',
              feType: 'DP 9KG',
              certificationValidity: '2026-12-31',
              sessionStatus: 'completed',
              sessionCheckedBy: 'Previous Inspector',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
          fireExtinguisherChecks: [
            {
              id: 'catalog:1',
              catalogId: '1',
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Canteen',
              idLocNo: 'CAN-001',
              barcodeNo: 'CAN-001-BC',
              feType: 'DP 9KG',
              certificationValidity: '2026-12-31',
              physicalCondition: 'Good',
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
            {
              id: 'catalog:2',
              catalogId: '2',
              zone: '1',
              mainLocation: 'Canteen',
              subLocation: 'Canteen',
              idLocNo: 'CAN-002',
              barcodeNo: 'CAN-002-BC',
              feType: 'DP 9KG',
              certificationValidity: '2026-12-31',
              physicalCondition: 'Not Good',
              physicalConditionRemarks: 'Cylinder dented.',
              physicalConditionPhotos: [
                {
                  id: 'fe-photo-subset',
                  fileName: 'dent.jpg',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              signageCondition: 'Good',
              boxKeyAvailability: 'Yes',
              boxGlassAvailability: 'Yes',
              operationalCondition: 'Good',
            },
          ],
        }}
      />,
    )

    const reviewButton = screen.getAllByText('Continue to Review')[0].closest('button')
    await waitFor(() => expect(reviewButton.disabled).toBe(false))
    fireEvent.click(reviewButton)

    await waitFor(() =>
      expect(onRequestReview).toHaveBeenCalledWith(
        expect.objectContaining({
          fireExtinguisherChecks: [
            expect.objectContaining({ idLocNo: 'CAN-001' }),
            expect.objectContaining({ idLocNo: 'CAN-002' }),
          ],
        }),
      ),
    )
    expect(
      onRequestReview.mock.calls[0][0].fireExtinguisherChecks.some(
        (row) => row.idLocNo === 'CAN-003',
      ),
    ).toBe(false)
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
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle)).toBeTruthy()

    fireEvent.click(screen.getAllByText('Continue to Review')[0])

    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        hseInspectedBy: 'Inspector',
        hseInspectionDate: '2026-06-29',
        hseSelections: ['areaSatisfactory'],
        hseAreaConditionRemarks: 'Area is clear and housekeeping is acceptable.',
        photos: [],
      }),
    )
  })

  it('uses the direct submit action for a complete HSE v2 observation', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Zone A',
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          inspectedAt: '2026-07-14T09:30',
          hsePayloadVersion: 2,
          hseSelections: ['unsafeAct'],
          hseUnsafeActDetails: 'Worker crossed an active barricade.',
          photos: [
            {
              id: 'hse-v2-photo',
              fileName: 'hse-v2.png',
              url: 'data:image/png;base64,QUFB',
            },
          ],
        }}
      />,
    )

    expect(screen.queryByText('Continue to Review')).toBeNull()
    fireEvent.click(screen.getAllByText('Submit Report')[0])

    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        hsePayloadVersion: 2,
        hseSelections: ['unsafeAct'],
        hseUnsafeActDetails: 'Worker crossed an active barricade.',
        photos: [expect.objectContaining({ id: 'hse-v2-photo' })],
      }),
    )
  })

  it('preserves spaces while the inspector types an HSE v2 description', () => {
    const onChange = vi.fn()
    const Harness = () => {
      const [value, setValue] = React.useState({
        mainLocation: 'Zone A',
        selectedLocation: 'Zone A',
        inspectionType: 'Health Safety Environment Inspection',
        inspectedAt: '2026-07-14T09:30',
        hsePayloadVersion: 2,
        hseSelections: ['unsafeAct'],
        hseUnsafeActDetails: 'Worker',
        photos: [],
      })

      return (
        <InspectionForm
          {...baseProps}
          onChange={(nextValue) => {
            onChange(nextValue)
            setValue(nextValue)
          }}
          value={value}
        />
      )
    }
    render(<Harness />)

    const description = screen.getByRole('textbox', { name: 'Observation description' })
    fireEvent.change(description, { target: { value: 'Worker ' } })

    expect(description.value).toBe('Worker ')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ hseUnsafeActDetails: 'Worker ' }),
    )
  })

  it('keeps the direct-submit lock until the async submission callback settles', async () => {
    let resolveSubmission
    const onRequestReview = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve
        }),
    )
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Zone A',
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          inspectedAt: '2026-07-14T09:30',
          hsePayloadVersion: 2,
          hseSelections: ['unsafeAct'],
          hseUnsafeActDetails: 'Worker crossed an active barricade.',
          photos: [{ id: 'hse-v2-photo', fileName: 'hse.png', url: 'data:image/png;base64,QUFB' }],
        }}
      />,
    )

    const submit = screen.getAllByText('Submit Report')[0]
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(onRequestReview).toHaveBeenCalledTimes(1)

    resolveSubmission()
    await waitFor(() => expect(onRequestReview).toHaveBeenCalledTimes(1))
  })

  it('hides Continue to Review for incomplete HSE observations', () => {
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

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
    expect(screen.getAllByText('Take HSE photo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Upload HSE photo').length).toBeGreaterThan(0)
  })

  it('applies the HSE outcome caption to uploaded evidence photos', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Zone A',
          selectedLocation: 'Zone A',
          inspectionType: 'Health Safety Environment Inspection',
          hseInspectedBy: 'Inspector A',
          hseInspectionDate: '2026-06-29',
          hseSelections: ['unsafeAct'],
          hseUnsafeActDetails: 'Unsafe lifting observed.',
          hseSeverity: 'High',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Upload HSE photo' }))

    const uploadInput = container.querySelector('input[type="file"]:not([capture])')
    expect(uploadInput).toBeTruthy()

    fireEvent.change(uploadInput, {
      target: { files: [new File(['hse'], 'hse-evidence.png', { type: 'image/png' })] },
    })

    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.photos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: 'hse-evidence.png',
            description: 'Unsafe Act',
          }),
        ]),
      )
    })
  })

  it('shows ER Aux equipment cards for the selected Store location', () => {
    const { container } = render(
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

    expect(screen.getByText('Date and time of inspection')).toBeTruthy()
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByText('Fire Jacket')).toBeTruthy()
    expect(screen.getByText('Animal catcher net')).toBeTruthy()
    expect(
      within(
        container.querySelector('[data-inspection-er-aux-row-id="store:fire-jacket"]'),
      ).getByPlaceholderText('Quantity').value,
    ).toBe('15')
    expect(
      within(
        container.querySelector('[data-inspection-er-aux-row-id="store:fire-helmet"]'),
      ).getByPlaceholderText('Quantity').value,
    ).toBe('2')
    expect(
      within(
        container.querySelector('[data-inspection-er-aux-row-id="store:animal-catcher-net"]'),
      ).getByPlaceholderText('Quantity').value,
    ).toBe('3')
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Continue to Review' })[0].disabled).toBe(true)
    expect(screen.getAllByText(/Cannot continue to review:.*ER Aux/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Save Draft').length).toBeGreaterThan(0)
  })

  it('sends completed ER Aux subset rows to the Continue to Review flow', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Store',
          inspectedAt: '2026-07-03T07:10',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxInspectedBy: '',
          erAuxInspectionDate: '',
          erAuxChecks: [
            {
              id: 'store:fire-jacket',
              location: 'Store',
              equipment: 'Fire Jacket',
              quantity: '15',
              condition: 'OK',
            },
          ],
        }}
      />,
    )

    const reviewButton = screen
      .getAllByRole('button', { name: 'Continue to Review' })
      .find((button) => !button.disabled)

    expect(reviewButton).toBeTruthy()
    fireEvent.click(reviewButton)
    expect(onRequestReview).toHaveBeenCalledTimes(1)
  })

  it('uses Continue to Review Updates for completed ER Aux subset rows in edit mode', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        isUpdateMode
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Store',
          inspectedAt: '2026-07-03T07:10',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [
            {
              id: 'store:fire-jacket',
              location: 'Store',
              equipment: 'Fire Jacket',
              quantity: '15',
              condition: 'OK',
            },
          ],
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()

    const reviewButton = screen
      .getAllByRole('button', { name: 'Continue to Review Updates' })
      .find((button) => !button.disabled)

    expect(reviewButton).toBeTruthy()
    fireEvent.click(reviewButton)
    expect(onRequestReview).toHaveBeenCalledTimes(1)
  })

  it('shows Fire Truck Daily Readiness structured cards for a selected truck compartment', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'AJG9555',
          selectedLocation: 'AJG9555',
          mainLocationId: 'truck-1',
          inspectionType: 'FRT Daily Inspection',
          subLocation: 'LOCKER 01',
          photos: [],
          frtInspectedBy: '',
          frtInspectionDate: '',
          frtShift: '',
          frtTruckId: 'truck-1',
          frtTruckPlateNo: 'AJG9555',
          frtTruckReference: {
            truckId: 'truck-1',
            name: 'Fire Truck',
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

    expect(screen.getByText('Date and time of inspection')).toBeTruthy()
    expect(screen.getByText('Choose Truck')).toBeTruthy()
    expect(screen.queryByText('Shift')).toBeNull()
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.getByText('Truck Readiness')).toBeTruthy()
    expect(screen.getByText('LOCKER 01')).toBeTruthy()
    expect(screen.getAllByText('LOCKER 01').length).toBeGreaterThan(0)
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(screen.getAllByText('Save Draft').length).toBeGreaterThan(0)
  })

  it('continues a completed FRT compartment by updating only the sub-location', async () => {
    const onChange = vi.fn()
    const completedLocker = makeCompletedFrtLockerOneRows()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'AJG9555',
          selectedLocation: 'AJG9555 > LOCKER 01',
          mainLocationId: 'truck-1',
          inspectionType: 'FRT Daily Inspection',
          subLocation: 'LOCKER 01',
          photos: [],
          frtTruckId: 'truck-1',
          frtTruckPlateNo: 'AJG9555',
          frtTruckReference: {
            truckId: 'truck-1',
            name: 'Fire Truck',
            plateNo: 'AJG9555',
          },
          frtDailyChecks: completedLocker.dailyChecks,
          frtDailyRemarks: '',
          frtOneOffChecks: completedLocker.oneOffChecks,
          frtOneOffRemarks: '',
        }}
      />,
    )

    expect(await screen.findByText('Next compartment')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'LOCKER 02' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'AJG9555',
        subLocation: 'LOCKER 02',
        selectedLocation: 'AJG9555 > LOCKER 02',
      }),
    )
  })

  it('continues a completed equipment location by updating main location and clearing sub-location', async () => {
    const onChange = vi.fn()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
          subLocation: 'Dock',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          hydraulicChecks: makeHydraulicChecks('FRT'),
          photos: [],
        }}
      />,
    )

    expect(await screen.findByText('Next location')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Store' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: 'Store',
        subLocation: '',
        selectedLocation: 'Store',
      }),
    )
  })

  it('resets stale setup and checklist data when switching inspection type', async () => {
    setMobileViewport()
    const onChange = vi.fn()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          inspectionType: 'FRT Daily Inspection',
          inspectedAt: '2026-07-05T20:24',
          selectedLocation: 'AJG9555',
          mainLocation: 'AJG9555',
          mainLocationId: 'truck-1',
          frtTruckId: 'truck-1',
          frtTruckPlateNo: 'AJG9555',
          frtTruckReference: {
            truckId: 'truck-1',
            plateNo: 'AJG9555',
            name: 'Fire Truck',
          },
          frtDailyChecks: [{ id: 'locker-01', status: 'OK' }],
          frtOneOffChecks: [{ id: 'one-off-01', status: 'OK' }],
          photos: [{ id: 'photo-1', fileName: 'truck.png', url: 'data:image/png;base64,abc' }],
        }}
      />,
    )

    fireEvent.click(screen.getByLabelText('Edit Type'))
    fireEvent.click(await screen.findByText('ER Aux Equipment Inspection'))

    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm).toEqual(
        expect.objectContaining({
          inspectionType: 'ER Aux Equipment Inspection',
          selectedLocation: '',
          zone: '',
          mainLocation: '',
          subLocation: '',
          mainLocationId: '',
          subLocationId: '',
          frtTruckId: '',
          frtTruckPlateNo: '',
          frtDailyChecks: [],
          frtOneOffChecks: [],
          erAuxChecks: [],
          erAuxEquipmentRows: [],
          photos: [],
          description: '',
        }),
      )
    })
  })

  it('clears the active type draft when the type reset icon is clicked', async () => {
    setMobileViewport()
    const onChange = vi.fn()
    const onClearInspectionTypeDraft = vi.fn()

    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        onClearInspectionTypeDraft={onClearInspectionTypeDraft}
        value={{
          inspectionType: 'ER Aux Equipment Inspection',
          inspectedAt: '2026-07-03T07:10',
          selectedLocation: 'Office',
          mainLocation: 'Office',
          erAuxEquipmentRows: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
            },
          ],
          erAuxChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              quantity: '7',
              condition: 'OK',
            },
          ],
          inspectionTypeDrafts: {
            'er aux equipment inspection': {
              inspectionType: 'ER Aux Equipment Inspection',
              mainLocation: 'Office',
              erAuxChecks: [{ id: 'office:radio-tetra', condition: 'OK' }],
            },
            'hydraulic rescue tools inspection': {
              inspectionType: 'Hydraulic Rescue Tools Inspection',
              mainLocation: 'Store',
              hydraulicChecks: [{ id: 'store:pump', functionTest: 'OK' }],
            },
          },
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset type' }))

    const resetForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
    expect(resetForm).toEqual(
      expect.objectContaining({
        inspectionType: '',
        selectedLocation: '',
        mainLocation: '',
        erAuxChecks: [],
        erAuxEquipmentRows: [],
      }),
    )
    expect(resetForm.inspectionTypeDrafts).not.toHaveProperty('er aux equipment inspection')
    expect(resetForm.inspectionTypeDrafts).toHaveProperty('hydraulic rescue tools inspection')
    expect(onClearInspectionTypeDraft).toHaveBeenCalledWith('ER Aux Equipment Inspection')

    rerender(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        onClearInspectionTypeDraft={onClearInspectionTypeDraft}
        value={resetForm}
      />,
    )
    fireEvent.click(screen.getByText('ER Aux Equipment Inspection'))

    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm).toEqual(
        expect.objectContaining({
          inspectionType: 'ER Aux Equipment Inspection',
          mainLocation: '',
          erAuxChecks: [],
          erAuxEquipmentRows: [],
        }),
      )
    })
  })

  it('preserves type drafts when switching types without using reset', async () => {
    setMobileViewport()
    const onChange = vi.fn()
    const erAuxCheck = {
      id: 'office:radio-tetra',
      location: 'Office',
      equipment: 'Radio Tetra',
      quantity: '7',
      condition: 'OK',
    }

    const { rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          inspectionType: 'ER Aux Equipment Inspection',
          inspectedAt: '2026-07-03T07:10',
          selectedLocation: 'Office',
          mainLocation: 'Office',
          erAuxEquipmentRows: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
            },
          ],
          erAuxChecks: [erAuxCheck],
        }}
      />,
    )

    fireEvent.click(screen.getByLabelText('Edit Type'))
    fireEvent.click(await screen.findByText('Hydraulic Rescue Tools Inspection'))

    const hydraulicForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
    expect(hydraulicForm.inspectionTypeDrafts['er aux equipment inspection']).toEqual(
      expect.objectContaining({
        mainLocation: 'Office',
        erAuxChecks: [expect.objectContaining(erAuxCheck)],
      }),
    )

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={hydraulicForm} />)
    fireEvent.click(screen.getByLabelText('Edit Type'))
    fireEvent.click(await screen.findByText('ER Aux Equipment Inspection'))

    await waitFor(() => {
      const restoredForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(restoredForm).toEqual(
        expect.objectContaining({
          inspectionType: 'ER Aux Equipment Inspection',
          mainLocation: 'Office',
          erAuxChecks: [expect.objectContaining(erAuxCheck)],
        }),
      )
    })
  })

  it('clears inspectedAt and derived type-specific dates from date reset', () => {
    setMobileViewport()
    const onChange = vi.fn()
    const onCommitDraftSnapshot = vi.fn()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        onCommitDraftSnapshot={onCommitDraftSnapshot}
        value={{
          inspectionType: 'ER Aux Equipment Inspection',
          inspectedAt: '2026-07-03T07:10',
          erAuxInspectionDate: '2026-07-03',
          selectedLocation: 'Office',
          mainLocation: 'Office',
          erAuxChecks: [],
          erAuxEquipmentRows: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset date and time' }))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
    expect(latestForm).toEqual(
      expect.objectContaining({
        inspectedAt: '',
        erAuxInspectionDate: '',
      }),
    )
    expect(latestForm.inspectionTypeDrafts['er aux equipment inspection']).toEqual(
      expect.objectContaining({
        inspectedAt: '',
        erAuxInspectionDate: '',
      }),
    )
    expect(onCommitDraftSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectedAt: '',
        erAuxInspectionDate: '',
      }),
      expect.objectContaining({
        source: 'setup-reset',
        reason: 'setup-date-reset',
      }),
    )
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

    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Cylinder Ramp 1')).toBeTruthy()
    expect(screen.queryByText('Hydraulic Pump Motor 2')).toBeNull()
    expect(screen.getAllByText('FRT').length).toBeGreaterThan(0)
    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(screen.getAllByText('Save Draft').length).toBeGreaterThan(0)
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

  it('keeps all hydraulic workbook cards visible when catalog rows are partial', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicEquipmentRows: [
            {
              id: 'frt:hydraulic-pump-motor-1',
              location: 'FRT',
              mainLocation: 'FRT',
              equipment: 'Hydraulic Pump Motor 1',
              equipmentId: 1,
              equipmentDescription: 'Primary power unit',
              equipmentSource: 'custom',
              canEdit: true,
              canDelete: true,
            },
          ],
          hydraulicChecks: [],
        }}
      />,
    )

    expect(screen.getByText('Hydraulic Pump Motor 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Hose 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Spreader 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Cutter 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Combi 1')).toBeTruthy()
    expect(screen.getByText('Hydraulic Cylinder Ramp 1')).toBeTruthy()
  })

  it('shows SCBA section cards for the selected FRT location', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
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

    expect(screen.getByText('Date and time of inspection')).toBeTruthy()
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.getByText('Choose Group')).toBeTruthy()
    expect(await screen.findByText('Back Plate')).toBeTruthy()
    expect(screen.getByText('Cylinder')).toBeTruthy()
    expect(screen.getByText('Face Mask')).toBeTruthy()

    await openScbaGroup('Back Plate')
    expect(screen.getByText('Back Plate Items')).toBeTruthy()
    expect(screen.getByText('MSA 06')).toBeTruthy()

    await openScbaGroup('Face Mask')
    expect(screen.getByText('Drager 02')).toBeTruthy()
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(screen.getAllByText('Save Draft').length).toBeGreaterThan(0)
  })

  it('shows custom SCBA section check labels after adding a section without items', async () => {
    const Harness = () => {
      const [value, setValue] = React.useState({
        mainLocation: 'FRT',
        selectedLocation: 'FRT',
        inspectionType: 'SCBA Inspection',
        photos: [],
        scbaInspectedBy: '',
        scbaInspectionDate: '',
        scbaBackPlateChecks: [],
        scbaCylinderChecks: [],
        scbaFaceMaskChecks: [],
        scbaCustomSections: [],
      })
      return <InspectionForm {...baseProps} value={value} onChange={setValue} />
    }

    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Add section' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Regulator'), {
      target: { value: 'Regulator' },
    })
    fireEvent.change(screen.getByPlaceholderText(/One check per line/), {
      target: { value: 'Purge Valve\nLeak Test' },
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add section' }))

    expect(await screen.findByText('Regulator')).toBeTruthy()
    await openScbaGroup('Regulator')
    expect(await screen.findByText('Checks: Purge Valve, Leak Test')).toBeTruthy()
    expect(screen.getByText(/No items in this section yet/)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Section actions for Regulator'))
    expect(await screen.findByRole('button', { name: 'Edit section' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Remove from this inspection' })).toBeTruthy()
    expect(
      await screen.findByRole('button', { name: 'Archive from future inspections' }),
    ).toBeTruthy()
  })

  it('shows custom SCBA item action menu for editing and deleting custom items', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
          inspectionType: 'SCBA Inspection',
          photos: [],
          scbaInspectedBy: '',
          scbaInspectionDate: '',
          scbaBackPlateChecks: [],
          scbaCylinderChecks: [],
          scbaFaceMaskChecks: [],
          scbaCustomSections: [
            {
              id: 'customScba-regulator',
              key: 'customScba-regulator',
              title: 'Regulator',
              shortLabel: 'Regulator',
              fields: [{ key: 'purgeValve', label: 'Purge Valve', kind: 'status' }],
              rows: [
                {
                  id: 'customScba-regulator:frt:msa:r-01',
                  location: 'FRT',
                  brand: 'MSA',
                  serialNo: 'R-01',
                  isCustomEquipment: true,
                  purgeValve: '',
                },
              ],
            },
          ],
        }}
      />,
    )

    await openScbaGroup('Regulator')
    fireEvent.click(screen.getByLabelText('Item actions for MSA R-01'))
    expect((await screen.findAllByRole('button', { name: 'Edit' })).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeTruthy()
  })

  it('collapses and expands SCBA sections from the search toolbar', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
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

    await openScbaGroup('Back Plate')
    expect(screen.getByText('MSA 06')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryByText('MSA 06')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next incomplete' }))
    expect(screen.getByText('MSA 06')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryByText('MSA 06')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.getByText('MSA 06')).toBeTruthy()
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

    expect(screen.getByText('Date and time of inspection')).toBeTruthy()
    expect(screen.queryByText('Inspection Session')).toBeNull()
    expect(screen.queryByText('Progress')).toBeNull()
    expect(screen.getAllByText('Response Kit #1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('General Kit Items').length).toBeGreaterThan(0)
    expect(screen.getByText('Heavy Duty Organizer Bag - Main Compartment')).toBeTruthy()
    fireEvent.click(screen.getByText('General Kit Items'))
    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByText('Heavy Duty Organizer Bag')).toBeTruthy()
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes('Qty 1') ?? false).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Actual field coming soon')).toBeNull()
  })

  it('resets the selected High Angle main location from the collapsed card', () => {
    setMobileViewport()
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'Response Kit #1',
          mainLocation: 'Response Kit #1',
          inspectionType: 'High Angle Rescue Equipment Inspection',
          inspectedAt: '2026-07-06T12:52',
          photos: [],
          highAngleInspectedBy: '',
          highAngleInspectionDate: '',
          highAngleChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset Main Location' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedLocation: '',
        mainLocation: '',
        subLocation: '',
      }),
    )
  })

  it('clears ER Aux location-scoped rows when the main location reset icon is clicked', () => {
    setMobileViewport()
    const onChange = vi.fn()
    const onCommitDraftSnapshot = vi.fn()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        onCommitDraftSnapshot={onCommitDraftSnapshot}
        value={{
          selectedLocation: 'Office',
          mainLocation: 'Office',
          mainLocationId: 'loc-office',
          inspectionType: 'ER Aux Equipment Inspection',
          inspectedAt: '2026-07-03T07:10',
          photos: [],
          erAuxEquipmentRows: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
            },
          ],
          erAuxChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              quantity: '7',
              condition: 'OK',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset Main Location' }))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
    expect(latestForm).toEqual(
      expect.objectContaining({
        selectedLocation: '',
        mainLocation: '',
        mainLocationId: '',
        subLocation: '',
        subLocationId: '',
        erAuxChecks: [],
        erAuxEquipmentRows: [],
      }),
    )
    expect(latestForm.inspectionTypeDrafts['er aux equipment inspection']).toEqual(
      expect.objectContaining({
        mainLocation: '',
        erAuxChecks: [],
        erAuxEquipmentRows: [],
      }),
    )
    expect(onCommitDraftSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        mainLocation: '',
        erAuxChecks: [],
        erAuxEquipmentRows: [],
      }),
      expect.objectContaining({
        source: 'setup-reset',
        reason: 'setup-primary-location-reset',
      }),
    )
  })

  it('clears SCBA grouped rows when the main location reset icon is clicked', () => {
    setMobileViewport()
    const onChange = vi.fn()

    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          selectedLocation: 'FRT',
          mainLocation: 'FRT',
          inspectionType: 'SCBA Inspection',
          inspectedAt: '2026-07-03T07:10',
          photos: [],
          scbaBackPlateChecks: [{ id: 'back-plate-1', status: 'OK' }],
          scbaCylinderChecks: [{ id: 'cylinder-1', status: 'OK' }],
          scbaFaceMaskChecks: [{ id: 'face-mask-1', status: 'OK' }],
          scbaCustomSections: [
            {
              key: 'custom',
              title: 'Custom SCBA',
              fields: [{ key: 'condition', label: 'Condition', kind: 'status' }],
              rows: [{ id: 'custom-1', condition: 'OK' }],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset Main Location' }))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
    expect(latestForm).toEqual(
      expect.objectContaining({
        selectedLocation: '',
        mainLocation: '',
        scbaBackPlateChecks: [],
        scbaCylinderChecks: [],
        scbaFaceMaskChecks: [],
        scbaCustomSections: [],
      }),
    )
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

    fireEvent.click(screen.getByText('General Kit Items'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Not Good' })[0])

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

  it('updates SCBA grouped checks from segmented controls', async () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
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

    await openScbaGroup('Back Plate')
    fireEvent.click(screen.getAllByRole('button', { name: 'Not Good' })[0])

    return waitFor(() =>
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
      ),
    )
  })

  it('keeps SCBA field evidence scoped to the selected issue field', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'FRT',
          selectedLocation: 'FRT',
          inspectionType: 'SCBA Inspection',
          photos: [],
          scbaInspectedBy: '',
          scbaInspectionDate: '',
          scbaBackPlateChecks: [
            {
              id: 'backPlate:frt:msa:06',
              sectionKey: 'backPlate',
              location: 'FRT',
              mainLocation: 'FRT',
              brand: 'MSA',
              serialNo: '06',
              remarks: 'Legacy row note',
              backPlateHarnessCondition: 'Good',
              highPressureHose: 'Not Good',
              highPressureHoseRemarks: 'Scoped hose note',
              highPressureHosePhotos: [],
              pressureGauge: 'Good',
              alarmDevice: 'Good',
              demandValve: 'Good',
              sealing: 'Good',
              cleanliness: 'Good',
            },
          ],
          scbaCylinderChecks: [],
          scbaFaceMaskChecks: [],
        }}
      />,
    )

    await openScbaGroup('Back Plate')
    expect(screen.getByDisplayValue('Scoped hose note')).toBeTruthy()
    expect(
      screen.queryByText('Back Plate & Harness retained evidence from earlier status'),
    ).toBeNull()
    expect(screen.queryByText('Pressure Gauge retained evidence from earlier status')).toBeNull()
    expect(screen.queryByText('Alarm Device retained evidence from earlier status')).toBeNull()
  })

  it('updates FRT daily and one-off rows through the structured controls', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'AJG9555',
          selectedLocation: 'AJG9555',
          mainLocationId: 'truck-1',
          inspectionType: 'FRT Daily Inspection',
          subLocation: 'LOCKER 01',
          photos: [],
          frtInspectedBy: '',
          frtInspectionDate: '',
          frtShift: '',
          frtTruckId: 'truck-1',
          frtTruckPlateNo: 'AJG9555',
          frtTruckReference: {
            truckId: 'truck-1',
            name: 'Fire Truck',
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

    expect(screen.queryByText('Not Good')).toBeNull()
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

  it('keeps existing hydraulic Defect and N/A values when marking all OK', () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'FRT',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicChecks: [
            {
              id: 'frt:hydraulic-pump-motor-1',
              location: 'FRT',
              equipment: 'Hydraulic Pump Motor 1',
              physicalCondition: 'Defect',
              physicalConditionRemarks: 'Cracked handle.',
              physicalConditionPhotos: [
                {
                  id: 'physical-photo-1',
                  fileName: 'crack.jpg',
                  description: 'Cracked handle',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              noLeakage: 'N/A',
              noLeakageRemarks: 'Tool isolated.',
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Mark all OK'))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.hydraulicChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'Defect',
          physicalConditionRemarks: 'Cracked handle.',
          physicalConditionPhotos: [expect.objectContaining({ id: 'physical-photo-1' })],
          mechanicalCondition: 'OK',
          noLeakage: 'N/A',
          noLeakageRemarks: 'Tool isolated.',
          functionTest: 'OK',
        }),
      ]),
    )
  })

  it('fills blank hydraulic fields from one card OK without overwriting Defect or N/A values', () => {
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
              physicalCondition: '',
              mechanicalCondition: 'N/A',
              mechanicalConditionRemarks: 'Temporarily unavailable.',
              noLeakage: '',
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

    fireEvent.click(screen.getAllByText('All OK')[0])

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.hydraulicChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'N/A',
          mechanicalConditionRemarks: 'Temporarily unavailable.',
          noLeakage: 'OK',
          functionTest: 'Defect',
          functionTestRemarks: 'Slow response captured earlier.',
          functionTestPhotos: [expect.objectContaining({ id: 'defect-photo-1' })],
        }),
      ]),
    )
  })

  it('shows and clears retained hydraulic evidence without changing current status', () => {
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
              functionTest: 'OK',
              functionTestRemarks: 'Old defect note retained.',
              functionTestPhotos: [
                {
                  id: 'retained-photo-1',
                  fileName: 'retained.jpg',
                  description: 'Old defect evidence',
                  url: 'data:image/png;base64,abc123',
                },
              ],
            },
          }),
        }}
      />,
    )

    expect(screen.getByText('Retained evidence')).toBeTruthy()
    expect(screen.getByText('Function Test retained evidence from earlier status')).toBeTruthy()
    expect(screen.getByText('Old defect note retained.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear retained evidence' }))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.hydraulicChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'Hydraulic Pump Motor 1',
          functionTest: 'OK',
          functionTestRemarks: '',
          functionTestPhotos: [],
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
        }),
      ]),
    )
  })

  it('shows hydraulic defect photos without quick caption helper chips', () => {
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
                  description: 'Existing caption',
                  url: 'data:image/png;base64,abc123',
                },
              ],
            },
          }),
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View photos' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByPlaceholderText('Describe this photo')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Defect' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('hides redundant ER Aux card-level OK shortcuts for single-check cards', () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Office',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [],
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Mark all OK' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'All OK' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Equipment actions for Radio Tetra' })).toBeTruthy()
  })

  it('passes ER Aux fallback equipment rows into the shared equipment manager options', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Store',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxEquipmentRows: [],
          erAuxChecks: [],
        }}
      />,
    )

    await waitFor(() => {
      const modalTitles = typeManagerModalMock.props.map((props) => props.addTitle)
      expect(modalTitles).toContain('Add Equipment')
    })

    const equipmentModalProps = typeManagerModalMock.props
      .slice()
      .reverse()
      .find((props) => props.addTitle === 'Add Equipment' && Array.isArray(props.options))

    expect(equipmentModalProps.options).toHaveLength(26)
    expect(equipmentModalProps.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Fire Jacket',
          canEdit: true,
          canDelete: true,
        }),
        expect.objectContaining({
          title: 'Animal catcher net',
          canEdit: true,
          canDelete: true,
        }),
      ]),
    )
  })

  it('passes Hydraulic fallback equipment rows into the shared equipment manager options', async () => {
    render(
      <InspectionForm
        {...baseProps}
        value={{
          mainLocation: 'Store',
          inspectionType: 'Hydraulic Rescue Tools Inspection',
          photos: [],
          hydraulicEquipmentRows: [],
          hydraulicChecks: [],
        }}
      />,
    )

    await waitFor(() => {
      const modalTitles = typeManagerModalMock.props.map((props) => props.addTitle)
      expect(modalTitles).toContain('Add Equipment')
    })

    const equipmentModalProps = typeManagerModalMock.props
      .slice()
      .reverse()
      .find((props) => props.addTitle === 'Add Equipment' && Array.isArray(props.options))

    expect(equipmentModalProps.options).toHaveLength(6)
    expect(equipmentModalProps.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Hydraulic Pump Motor 2',
        }),
        expect.objectContaining({
          title: 'Hydraulic Cylinder Ramp 2',
        }),
      ]),
    )
  })

  it('shows ER Aux equipment edit/delete kebab for editable catalog rows', async () => {
    const onEditEquipment = vi.fn()
    const onDeleteEquipment = vi.fn()
    const row = {
      id: 'office:radio-tetra-custom',
      equipmentId: 'er-aux-equipment-1',
      location: 'Office',
      mainLocation: 'Office',
      equipment: 'Radio Tetra',
      equipmentSource: 'custom',
      isCustomEquipment: true,
      quantity: '7',
      defaultQuantity: '7',
      condition: 'OK',
      canEdit: true,
      canDelete: true,
      photos: [],
      defectPhotos: [],
    }

    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        summary={{
          visibleChecks: [row],
          totalCount: 1,
        }}
        onEditEquipment={onEditEquipment}
        onDeleteEquipment={onDeleteEquipment}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Equipment actions for Radio Tetra' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    await waitFor(() => expect(onEditEquipment).toHaveBeenCalledWith(row))

    fireEvent.click(screen.getByRole('button', { name: 'Equipment actions for Radio Tetra' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(onDeleteEquipment).toHaveBeenCalledWith(row))
  })

  it('hides ER Aux equipment kebab for protected seed rows', () => {
    render(
      <ErAuxEquipmentChecks
        mainLocation="Office"
        summary={{
          visibleChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              mainLocation: 'Office',
              equipment: 'Radio Tetra',
              equipmentSource: 'seed',
              quantity: '7',
              defaultQuantity: '7',
              condition: 'OK',
              canEdit: false,
              canDelete: false,
              photos: [],
              defectPhotos: [],
            },
          ],
          totalCount: 1,
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Equipment actions for Radio Tetra' })).toBeNull()
  })

  it('deletes an ER Aux fallback equipment row from the card kebab', async () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Office',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Equipment actions for Radio Tetra' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.erAuxEquipmentRows).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            equipment: 'Radio Tetra',
          }),
        ]),
      )
      expect(latestForm?.erAuxEquipmentRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            equipment: 'Radio VHF',
          }),
        ]),
      )
    })
  })

  it('allows seeded ER Aux quantities to be cleared and edited', () => {
    const onChange = vi.fn()
    const initialValue = {
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      photos: [],
      erAuxChecks: [],
    }
    const { container, rerender } = render(
      <InspectionForm {...baseProps} onChange={onChange} value={initialValue} />,
    )
    const getRadioTetraCard = () => {
      const card = container.querySelector('[data-inspection-er-aux-row-id="office:radio-tetra"]')
      expect(card).toBeTruthy()
      return card
    }
    const getQuantityInput = () => within(getRadioTetraCard()).getByPlaceholderText('Quantity')

    expect(getQuantityInput().value).toBe('7')

    fireEvent.change(getQuantityInput(), { target: { value: '' } })
    let latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          quantity: '',
        }),
      ]),
    )

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={latestForm} />)
    expect(getQuantityInput().value).toBe('')

    fireEvent.change(getQuantityInput(), { target: { value: '8' } })
    latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          quantity: '8',
        }),
      ]),
    )

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={latestForm} />)
    expect(getQuantityInput().value).toBe('8')

    fireEvent.click(within(getRadioTetraCard()).getByRole('button', { name: 'OK' }))
    latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          quantity: '8',
          condition: 'OK',
        }),
      ]),
    )

    const payload = buildInspectionPayloadSnapshot(normalizeInspectionForm(latestForm))
    expect(payload.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          quantity: '8',
        }),
      ]),
    )
    expect(payload.checklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Radio Tetra - Qty 8: OK',
        }),
      ]),
    )
  })

  it('shows disabled Continue to Review for incomplete ER Aux rows', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Office',
          inspectedAt: '2026-07-03T07:10',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxEquipmentRows: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              defaultQuantity: '7',
            },
          ],
          erAuxChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              quantity: '',
              condition: 'Missing',
            },
          ],
        }}
      />,
    )

    expect(screen.getAllByRole('button', { name: 'Continue to Review' })[0].disabled).toBe(true)
    expect(screen.getAllByText(/Cannot continue to review:.*ER Aux/i).length).toBeGreaterThan(0)
    expect(onRequestReview).not.toHaveBeenCalled()
  })

  it('shows disabled Continue to Review Updates for incomplete ER Aux rows in edit mode', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        isUpdateMode
        onRequestReview={onRequestReview}
        value={{
          mainLocation: 'Office',
          inspectedAt: '2026-07-03T07:10',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxEquipmentRows: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              defaultQuantity: '7',
            },
          ],
          erAuxChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              quantity: '',
              condition: 'Missing',
            },
          ],
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Continue to Review Updates' })[0].disabled).toBe(
      true,
    )
    expect(screen.getAllByText(/Cannot continue to review:.*ER Aux/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Save Update Draft').length).toBeGreaterThan(0)
    expect(onRequestReview).not.toHaveBeenCalled()
  })

  it('keeps ER Aux defect evidence separate from optional additional notes', () => {
    const onChange = vi.fn()
    const initialValue = {
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      photos: [],
      erAuxChecks: [],
    }
    const { container, rerender } = render(
      <InspectionForm {...baseProps} onChange={onChange} value={initialValue} />,
    )

    const getRadioTetraCard = () => {
      const radioTetraCard = container.querySelector(
        '[data-inspection-er-aux-row-id="office:radio-tetra"]',
      )
      expect(radioTetraCard).toBeTruthy()
      return radioTetraCard
    }
    const getRadioTetraRow = () => within(getRadioTetraCard())

    let row = getRadioTetraRow()
    fireEvent.click(row.getByRole('button', { name: 'Defect' }))
    const defectValue = onChange.mock.calls[onChange.mock.calls.length - 1][0]

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={defectValue} />)
    row = getRadioTetraRow()

    expect(row.getAllByText('Additional Info (optional)').length).toBeGreaterThan(0)
    expect(row.queryByText('Issue details')).toBeNull()
    expect(row.getByText('Defect remarks')).toBeTruthy()
    expect(row.queryByText('General equipment remarks')).toBeNull()
    const cardText = getRadioTetraCard().textContent
    expect(cardText.indexOf('Defect remarks')).toBeLessThan(
      cardText.indexOf('Additional Info (optional)'),
    )

    fireEvent.click(row.getByRole('button', { name: 'Remark' }))
    expect(row.getByText('General equipment remarks')).toBeTruthy()

    fireEvent.click(row.getByRole('button', { name: 'Cancel' }))
    expect(row.getByText('Defect remarks')).toBeTruthy()
    expect(row.queryByText('General equipment remarks')).toBeNull()
  })

  it('attaches a photo to an ER Aux equipment row from the row photo action', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Office',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [],
        }}
      />,
    )

    fireEvent.click(screen.getAllByText('Photo')[0])

    const cameraInput = container.querySelector('input[type="file"]')
    expect(cameraInput).toBeTruthy()

    const file = new File(['photo'], 'er-aux-photo.png', { type: 'image/png' })
    fireEvent.change(cameraInput, { target: { files: [file] } })

    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.erAuxChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'office:radio-tetra',
            equipment: 'Radio Tetra',
            photos: [
              expect.objectContaining({
                fileName: 'er-aux-photo.png',
              }),
            ],
          }),
        ]),
      )
    })
  })

  it('clears ER Aux additional notes without repopulating from legacy remarks', () => {
    const onChange = vi.fn()
    const value = {
      mainLocation: 'Office',
      inspectionType: 'ER Aux Equipment Inspection',
      photos: [],
      erAuxChecks: [
        {
          id: 'office:radio-tetra',
          location: 'Office',
          equipment: 'Radio Tetra',
          quantity: '7',
          condition: 'OK',
          remarks: 'asdf',
          additionalNotes: 'asdf',
          photos: [],
        },
      ],
    }
    const { container, rerender } = render(
      <InspectionForm {...baseProps} onChange={onChange} value={value} />,
    )
    const getRow = () =>
      within(container.querySelector('[data-inspection-er-aux-row-id="office:radio-tetra"]'))

    expect(getRow().getByText('General equipment remarks')).toBeTruthy()
    fireEvent.click(getRow().getByRole('button', { name: 'Clear' }))

    const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(latestForm.erAuxChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'office:radio-tetra',
          remarks: 'asdf',
          additionalNotes: '',
        }),
      ]),
    )

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={latestForm} />)
    expect(getRow().queryByText('General equipment remarks')).toBeNull()
  })

  it('keeps ER Aux defect photos separate from additional photos', async () => {
    const onChange = vi.fn()
    const { container, rerender } = render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Office',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [],
        }}
      />,
    )
    const getRow = () =>
      within(container.querySelector('[data-inspection-er-aux-row-id="office:radio-tetra"]'))
    const cameraInput = container.querySelectorAll('input[type="file"]')[0]
    expect(cameraInput).toBeTruthy()

    fireEvent.click(getRow().getByRole('button', { name: 'Defect' }))
    let latestForm = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    rerender(<InspectionForm {...baseProps} onChange={onChange} value={latestForm} />)

    fireEvent.click(getRow().getByRole('button', { name: 'Add photo (optional)' }))
    fireEvent.change(cameraInput, {
      target: { files: [new File(['defect'], 'er-aux-defect.png', { type: 'image/png' })] },
    })

    expect(await screen.findByText('Radio Tetra - defect photos')).toBeTruthy()
    expect(screen.getByText('er-aux-defect.png')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.erAuxChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'office:radio-tetra',
            defectPhotos: [expect.objectContaining({ fileName: 'er-aux-defect.png' })],
            photos: [],
          }),
        ]),
      )
    })

    rerender(<InspectionForm {...baseProps} onChange={onChange} value={latestForm} />)
    fireEvent.click(getRow().getByRole('button', { name: 'Photo' }))
    fireEvent.change(cameraInput, {
      target: { files: [new File(['additional'], 'er-aux-additional.png', { type: 'image/png' })] },
    })

    await waitFor(() => {
      latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.erAuxChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'office:radio-tetra',
            defectPhotos: [expect.objectContaining({ fileName: 'er-aux-defect.png' })],
            photos: [expect.objectContaining({ fileName: 'er-aux-additional.png' })],
          }),
        ]),
      )
    })
  })

  it('removes ER Aux defect photos from the open viewer immediately', async () => {
    const onChange = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onChange={onChange}
        value={{
          mainLocation: 'Office',
          inspectionType: 'ER Aux Equipment Inspection',
          photos: [],
          erAuxChecks: [
            {
              id: 'office:radio-tetra',
              location: 'Office',
              equipment: 'Radio Tetra',
              quantity: '7',
              condition: 'Defect',
              defectRemarks: 'Broken casing.',
              defectPhotos: [
                {
                  id: 'defect-photo-1',
                  fileName: 'defect-photo.png',
                  url: 'data:image/png;base64,abc123',
                },
              ],
              photos: [],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View photos' }))
    expect(await screen.findByText('Radio Tetra - defect photos')).toBeTruthy()
    expect(screen.getByText('1 photo')).toBeTruthy()
    expect(screen.getByText('defect-photo.png')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(screen.getByText('0 photos')).toBeTruthy()
      expect(screen.queryByText('defect-photo.png')).toBeNull()
    })
    await waitFor(() => {
      const latestForm = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0]
      expect(latestForm?.erAuxChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'office:radio-tetra',
            defectPhotos: [],
          }),
        ]),
      )
    })
  })

  it('sends hydraulic N/A rows to the Continue to Review flow', () => {
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
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
    onRequestReview.mockClear()

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

    fireEvent.click(screen.getAllByText('Continue to Review')[0])
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

    fireEvent.click(screen.getAllByText('Remark')[0])
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

  it('opens per-defect evidence blocks and sends hydraulic defects to Continue to Review', () => {
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
    expect(screen.getAllByText('Add photo (optional)').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
    onRequestReview.mockClear()
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

    fireEvent.click(screen.getAllByText('Continue to Review')[0])
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
          zone: 'Zone A',
          mainLocation: 'Area A',
          subLocation: 'Site Office',
          selectedLocation: 'Zone A > Area A > Site Office',
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
          zone: 'Zone A',
          mainLocation: 'Area A',
          subLocation: 'Site Office',
          selectedLocation: 'Zone A > Area A > Site Office',
          inspectionType: 'General Inspection',
          description: '',
          inspectionIssues: [],
          photos: [],
        }}
      />,
    )

    expect(screen.queryByText('HSE Observation')).toBeNull()
    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
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

    expect(container.querySelector('input[type="file"]')).toBeTruthy()
  })
})
