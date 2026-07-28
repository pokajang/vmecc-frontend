// @vitest-environment jsdom
import React, { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'

const { streamAiHelperMessage } = vi.hoisted(() => ({
  streamAiHelperMessage: vi.fn(),
}))

vi.mock('src/services/api/aiHelperApi', () => ({
  streamAiHelperMessage,
}))

import InspectionFormBodySections from '../form/components/InspectionFormBodySections'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../inspectionReportEvidenceCopy'
import { HseEditSection } from '../types/hse/section'
import {
  CONTINUATION_LABELS,
  CONTINUATION_SCAN_LABEL,
  PARTIAL_STATE_PROMPTS,
} from '../inspectionFormUiTokens'

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

afterEach(() => {
  cleanup()
  streamAiHelperMessage.mockReset()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('InspectionFormBodySections mobile generic details drawer', () => {
  const renderBodySections = (overrides = {}) =>
    render(
      <InspectionFormBodySections
        appendDescription={vi.fn()}
        checklistChips={[]}
        currentStructuredSummary={null}
        descriptionRef={createRef()}
        draftStatus=""
        fieldErrors={{}}
        form={{ photos: [] }}
        getLatestForm={vi.fn()}
        isFireExtinguisherCatalogInspectionForm={false}
        isLoadingEquipmentRows={false}
        isLoadingFireExtinguisherRows={false}
        isLoadingScbaCatalogSections={false}
        isFireTruckCatalogInspectionForm={false}
        isFullInspectionForm={false}
        isStructuredInspectionForm={false}
        location={{ selectedMainLocationTitle: '' }}
        mainLocation=""
        onRequestReview={vi.fn()}
        onSaveDraft={vi.fn()}
        photosRef={createRef()}
        removePhoto={vi.fn()}
        requestRootPhotoUpload={vi.fn()}
        selectedFireTruckPlate=""
        selectedType=""
        selectedTypeDefinition={null}
        showComingSoonNotice={false}
        structuredDisplayForm={{}}
        structuredSectionHandlers={{}}
        structuredSectionRef={createRef()}
        StructuredEditSection={null}
        toggleChecklistChip={vi.fn()}
        updateForm={vi.fn()}
        updatePhotoDescription={vi.fn()}
        uploadInputRef={createRef()}
        cameraInputRef={createRef()}
        validationState={null}
        validationStatusMessage=""
        zone=""
        {...overrides}
      />,
    )

  it('renders General Inspection findings without the removed standalone Describe field', () => {
    setMobileViewport()

    renderBodySections({
      checklistChips: ['Housekeeping'],
      form: {
        inspectionType: 'General Inspection',
        checklist: [
          {
            id: 'general-inspection:housekeeping',
            label: 'Housekeeping',
            selected: true,
          },
        ],
        description: 'Walkway clear.',
        zone: '1',
        mainLocation: 'Office',
        subLocation: 'Reception',
        photos: [],
      },
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Office',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Office',
      selectedFireTruckPlate: '',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      selectedType: 'General Inspection',
      zone: '1',
    })

    expect(screen.getByText('Findings')).toBeTruthy()
    expect(screen.getByText('Add finding')).toBeTruthy()
    expect(screen.queryByText('Description')).toBeNull()
    expect(screen.queryByText('Checks')).toBeNull()
    expect(screen.queryByText('Describe')).toBeNull()
  })

  it('shows the exact blocked-save reason in the mobile action area', () => {
    setMobileViewport()

    renderBodySections({
      form: {
        inspectionType: 'General Inspection',
        inspectedAt: '2026-07-11T08:30',
        zone: '1',
        mainLocation: 'Office',
        subLocation: 'Reception',
        inspectionIssues: [],
        photos: [],
      },
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Office',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Office',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      selectedType: 'General Inspection',
      zone: '1',
    })

    expect(
      screen.getAllByText('Cannot continue to review: add and complete at least one finding.')
        .length,
    ).toBeGreaterThan(0)
  })

  it('hides fallback actions for fire extinguisher before a mode is usable', () => {
    setMobileViewport()

    renderBodySections({
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        fireExtinguisherEntryMode: '',
        photos: [],
      },
      isFireExtinguisherCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      selectedType: 'Fire Extinguisher Inspection',
      selectedTypeDefinition: {
        key: 'fire-extinguisher-inspection',
        supportsFireExtinguisherCatalog: true,
        usesZoneLocationFlow: true,
      },
    })

    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
  })

  it('hides General Inspection body sections until zone, main area, and location are selected', () => {
    const baseForm = {
      inspectionType: 'General Inspection',
      description: '',
      inspectionIssues: [],
      photos: [],
    }

    const { rerender } = renderBodySections({
      form: baseForm,
      isFullInspectionForm: true,
      location: { selectedMainLocationTitle: '', subLocationOptions: [] },
      mainLocation: '',
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      zone: '',
    })

    expect(screen.queryByText('Describe')).toBeNull()
    expect(screen.queryByText('Findings')).toBeNull()

    rerender(
      <InspectionFormBodySections
        appendDescription={vi.fn()}
        checklistChips={[]}
        currentStructuredSummary={null}
        descriptionRef={createRef()}
        draftStatus=""
        fieldErrors={{}}
        form={{ ...baseForm, zone: '1', mainLocation: 'Manjung Hub', subLocation: '' }}
        getLatestForm={vi.fn()}
        isFireExtinguisherCatalogInspectionForm={false}
        isLoadingEquipmentRows={false}
        isLoadingFireExtinguisherRows={false}
        isLoadingScbaCatalogSections={false}
        isFireTruckCatalogInspectionForm={false}
        isFullInspectionForm
        isStructuredInspectionForm={false}
        location={{
          selectedMainLocationTitle: 'Manjung Hub',
          subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
        }}
        mainLocation="Manjung Hub"
        onRequestReview={vi.fn()}
        onSaveDraft={vi.fn()}
        photosRef={createRef()}
        removePhoto={vi.fn()}
        requestRootPhotoUpload={vi.fn()}
        selectedFireTruckPlate=""
        selectedType="General Inspection"
        selectedTypeDefinition={{ usesZoneLocationFlow: true }}
        showComingSoonNotice={false}
        structuredDisplayForm={{}}
        structuredSectionHandlers={{}}
        structuredSectionRef={createRef()}
        StructuredEditSection={null}
        toggleChecklistChip={vi.fn()}
        updateForm={vi.fn()}
        updatePhotoDescription={vi.fn()}
        uploadInputRef={createRef()}
        cameraInputRef={createRef()}
        validationState={null}
        validationStatusMessage=""
        zone="1"
      />,
    )

    expect(screen.queryByText('Findings')).toBeNull()
    expect(screen.getByText(PARTIAL_STATE_PROMPTS.locationFlow)).toBeTruthy()
  })

  it('hides Continue to Review while waiting for required location details', () => {
    const onRequestReview = vi.fn()

    renderBodySections({
      form: {
        inspectionType: 'General Inspection',
        inspectionIssues: [],
        photos: [],
      },
      isFullInspectionForm: true,
      location: { selectedMainLocationTitle: '', subLocationOptions: [] },
      mainLocation: '',
      onRequestReview,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      zone: '',
    })

    expect(screen.queryByText('Findings')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue to Review' })).toBeNull()
    expect(onRequestReview).not.toHaveBeenCalled()
  })

  it('does not render Fire Extinguisher checks before a location is selected', () => {
    const StructuredEditSection = vi.fn(() => <div>Fire extinguisher rows mounted</div>)
    const baseProps = {
      isFireExtinguisherCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      location: { selectedMainLocationTitle: 'Manjung Hub' },
      mainLocation: 'Manjung Hub',
      selectedType: 'Fire Extinguisher Inspection',
      StructuredEditSection,
      zone: '1',
    }

    const { rerender } = renderBodySections({
      ...baseProps,
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: '',
        photos: [],
      },
    })

    expect(screen.queryByText('Fire extinguisher rows mounted')).toBeNull()
    expect(screen.getByText(PARTIAL_STATE_PROMPTS.fireExtinguisherFlow)).toBeTruthy()

    rerender(
      <InspectionFormBodySections
        {...baseProps}
        appendDescription={vi.fn()}
        checklistChips={[]}
        currentStructuredSummary={null}
        descriptionRef={createRef()}
        draftStatus=""
        fieldErrors={{}}
        form={{
          inspectionType: 'Fire Extinguisher Inspection',
          zone: '1',
          mainLocation: 'Manjung Hub',
          subLocation: 'Reception',
          photos: [],
        }}
        getLatestForm={vi.fn()}
        isLoadingEquipmentRows={false}
        isLoadingFireExtinguisherRows={false}
        isLoadingScbaCatalogSections={false}
        isFireTruckCatalogInspectionForm={false}
        isFullInspectionForm={false}
        onRequestReview={vi.fn()}
        onSaveDraft={vi.fn()}
        photosRef={createRef()}
        removePhoto={vi.fn()}
        requestRootPhotoUpload={vi.fn()}
        selectedFireTruckPlate=""
        selectedTypeDefinition={null}
        showComingSoonNotice={false}
        structuredDisplayForm={{}}
        structuredSectionHandlers={{}}
        structuredSectionRef={createRef()}
        toggleChecklistChip={vi.fn()}
        updateForm={vi.fn()}
        updatePhotoDescription={vi.fn()}
        uploadInputRef={createRef()}
        cameraInputRef={createRef()}
        validationState={null}
        validationStatusMessage=""
      />,
    )

    expect(screen.getByText('Fire extinguisher rows mounted')).toBeTruthy()
  })

  it('uses clearer structured general evidence helper copy', () => {
    setMobileViewport()

    renderBodySections({
      isStructuredInspectionForm: true,
      isFireExtinguisherCatalogInspectionForm: true,
      hasFireExtinguisherLocationSelection: true,
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        photos: [],
      },
      location: { selectedMainLocationTitle: 'Manjung Hub' },
      mainLocation: 'Manjung Hub',
      selectedType: 'Fire Extinguisher Inspection',
      selectedTypeDefinition: { photoEvidenceTitle: INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle },
      StructuredEditSection: () => <div>Fire extinguisher rows mounted</div>,
      zone: '1',
    })

    fireEvent.click(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel))

    expect(screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.helperText)).toBeTruthy()
  })

  it('shows next location shortcuts and refreshes before opening more location options', async () => {
    setMobileViewport()
    const onBeforeOpen = vi.fn(async () => undefined)
    const onSelectNextFireExtinguisherLocation = vi.fn()

    renderBodySections({
      currentStructuredSummary: {
        totalCount: 1,
        completedCount: 1,
        visibleChecks: [{ id: 'fe:1', sessionStatus: 'completed' }],
      },
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Infront Auditorium',
        selectedLocation: 'Zone 1 > Manjung Hub > Infront Auditorium',
        inspectedAt: '2026-07-03T07:10',
        fireExtinguisherInspectedBy: 'Inspector A',
        fireExtinguisherInspectionDate: '2026-07-03',
        photos: [],
        fireExtinguisherChecks: [
          {
            id: 'fe:1',
            zone: '1',
            mainLocation: 'Manjung Hub',
            subLocation: 'Infront Auditorium',
            sessionStatus: 'completed',
            physicalCondition: 'Good',
            signageCondition: 'Good',
            boxKeyAvailability: 'Yes',
            boxGlassAvailability: 'Yes',
            operationalCondition: 'Good',
          },
        ],
      },
      isFireExtinguisherCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [
          { value: 'Reception', title: 'Reception', metaLabel: 'Completed', metaIconKey: 'check' },
          { value: 'Infront Auditorium', title: 'Infront Auditorium' },
          { value: 'Cafeteria', title: 'Cafeteria' },
          { value: 'Admin', title: 'Admin' },
          { value: 'Training Utility', title: 'Training Utility' },
          { value: 'Operation LAB', title: 'Operation LAB' },
          { value: 'Relaxing Area', title: 'Relaxing Area' },
          { value: 'Pantry', title: 'Pantry' },
          { value: 'Store', title: 'Store' },
        ],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'Fire Extinguisher Inspection',
      StructuredEditSection: () => <div>Fire extinguisher rows mounted</div>,
      structuredSectionHandlers: {
        fireExtinguisherLocationContinuation: {
          mainLocation: 'Manjung Hub',
          value: 'Infront Auditorium',
          locationOptions: [
            {
              value: 'Reception',
              title: 'Reception',
              metaLabel: 'Completed',
              metaIconKey: 'check',
              metaTone: 'success',
            },
            { value: 'Infront Auditorium', title: 'Infront Auditorium' },
            { value: 'Cafeteria', title: 'Cafeteria' },
            { value: 'Admin', title: 'Admin' },
            { value: 'Training Utility', title: 'Training Utility' },
            { value: 'Operation LAB', title: 'Operation LAB' },
            { value: 'Relaxing Area', title: 'Relaxing Area' },
            { value: 'Pantry', title: 'Pantry' },
            { value: 'Store', title: 'Store' },
          ],
          onBeforeOpen,
        },
        onSelectNextFireExtinguisherLocation,
      },
      zone: '1',
    })

    expect(screen.getByText(CONTINUATION_LABELS.location)).toBeTruthy()
    const mountedRows = screen.getByText('Fire extinguisher rows mounted')
    const addPhotos = screen.getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel)
    const nextLocation = screen.getByText(CONTINUATION_LABELS.location)
    const saveReview = screen.getAllByText('Continue to Review')[0]
    expect(mountedRows.compareDocumentPosition(addPhotos)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(addPhotos.compareDocumentPosition(nextLocation)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(nextLocation.compareDocumentPosition(saveReview)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByRole('button', { name: 'Cafeteria' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Admin' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Training Utility' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Operation LAB' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Relaxing Area' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pantry' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Store' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cafeteria' }))
    expect(onSelectNextFireExtinguisherLocation).toHaveBeenCalledWith({
      value: 'Cafeteria',
      title: 'Cafeteria',
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'More' }))
    })

    expect(onBeforeOpen).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Continue in Manjung Hub')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()
    expect(screen.queryByText('Completed')).toBeNull()
  })

  it('shows scan-another FE in scan mode instead of shared continuation', () => {
    setMobileViewport()
    const onOpenScanner = vi.fn()
    const onSelectNextFireExtinguisherLocation = vi.fn()

    renderBodySections({
      currentStructuredSummary: {
        totalCount: 2,
        completedCount: 2,
        visibleChecks: [{ id: 'fe:1' }, { id: 'fe:2' }],
      },
      form: {
        inspectionType: 'Fire Extinguisher Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Infront Auditorium',
        selectedLocation: 'Zone 1 > Manjung Hub > Infront Auditorium',
        fireExtinguisherEntryMode: 'scan',
        fireExtinguisherFocusedAssetKey: 'FE-1000',
        photos: [],
      },
      isFireExtinguisherCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Infront Auditorium', title: 'Infront Auditorium' }],
      },
      mainLocation: 'Manjung Hub',
      fireExtinguisherScan: {
        onOpenScanner,
      },
      selectedType: 'Fire Extinguisher Inspection',
      structuredSectionHandlers: {
        onSelectNextFireExtinguisherLocation,
        fireExtinguisherLocationContinuation: {
          mainLocation: 'Manjung Hub',
          value: 'Infront Auditorium',
          currentValue: 'Infront Auditorium',
          locationOptions: [
            {
              value: 'Infront Auditorium',
              title: 'Infront Auditorium',
            },
            {
              value: 'Reception',
              title: 'Reception',
              metaLabel: 'Completed',
              metaIconKey: 'check',
              metaTone: 'success',
            },
          ],
        },
      },
      zone: '1',
      selectedTypeDefinition: {
        key: 'fire-extinguisher-inspection',
        supportsFireExtinguisherCatalog: true,
      },
      StructuredEditSection: () => <div>Fire extinguisher rows mounted</div>,
    })

    expect(screen.getAllByText(CONTINUATION_SCAN_LABEL).length).toBeGreaterThan(0)
    expect(screen.queryByText(CONTINUATION_LABELS.location)).toBeNull()
    expect(screen.getAllByText("What's Next").length).toBeGreaterThan(0)

    const scanCards = screen
      .getAllByText(CONTINUATION_SCAN_LABEL)
      .map((node) => node.closest('.inspection-next-location-card'))
      .filter(Boolean)
    expect(scanCards).toHaveLength(0)

    fireEvent.click(screen.getAllByRole('button', { name: CONTINUATION_SCAN_LABEL })[0])
    expect(onOpenScanner).toHaveBeenCalledTimes(1)
    expect(onSelectNextFireExtinguisherLocation).not.toHaveBeenCalled()
  })

  it('shows shared continuation for a completed FRT compartment', () => {
    setMobileViewport()
    const onSelectNextScope = vi.fn()

    renderBodySections({
      form: {
        inspectionType: 'Fire Truck Daily Readiness',
        mainLocation: 'FIRE TRUCK',
        subLocation: 'LOCKER 01',
        photos: [],
      },
      isFireTruckCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      location: { selectedMainLocationTitle: 'FIRE TRUCK', subLocationOptions: [] },
      mainLocation: 'FIRE TRUCK',
      selectedFireTruckPlate: 'WGG 01',
      selectedTypeDefinition: { key: 'frt-daily-inspection' },
      StructuredEditSection: () => <div>FRT rows mounted</div>,
      structuredSectionHandlers: {
        onSelectNextScope,
        scopeContinuation: {
          scope: 'subLocation',
          label: 'compartment',
          parentLabel: 'WGG 01',
          currentValue: 'LOCKER 01',
          options: [
            {
              value: 'LOCKER 01',
              title: 'LOCKER 01',
              progress: { isDone: true, inspectedCount: 2, totalCount: 2 },
              metaLabel: 'Completed',
              metaIconKey: 'check',
            },
            {
              value: 'LOCKER 02',
              title: 'LOCKER 02',
              progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
              metaLabel: '0/2 checks',
            },
          ],
        },
      },
    })

    expect(screen.getByText(CONTINUATION_LABELS.compartment)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'LOCKER 02' }))
    expect(onSelectNextScope).toHaveBeenCalledWith({
      value: 'LOCKER 02',
      title: 'LOCKER 02',
      progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
      metaLabel: '2 checks',
      metaIconKey: '',
      metaTone: 'muted',
    })
  })

  it('hides shared continuation for an incomplete FRT compartment', () => {
    renderBodySections({
      form: {
        inspectionType: 'Fire Truck Daily Readiness',
        mainLocation: 'FIRE TRUCK',
        subLocation: 'LOCKER 01',
        photos: [],
      },
      isFireTruckCatalogInspectionForm: true,
      isStructuredInspectionForm: true,
      location: { selectedMainLocationTitle: 'FIRE TRUCK', subLocationOptions: [] },
      mainLocation: 'FIRE TRUCK',
      selectedFireTruckPlate: 'WGG 01',
      selectedTypeDefinition: { key: 'frt-daily-inspection' },
      StructuredEditSection: () => <div>FRT rows mounted</div>,
      structuredSectionHandlers: {
        scopeContinuation: {
          scope: 'subLocation',
          label: 'compartment',
          currentValue: 'LOCKER 01',
          options: [
            {
              value: 'LOCKER 01',
              title: 'LOCKER 01',
              progress: { isDone: false, inspectedCount: 1, totalCount: 2 },
              metaLabel: '1/2 checks',
            },
            { value: 'LOCKER 02', title: 'LOCKER 02' },
          ],
        },
      },
    })

    expect(screen.queryByText(CONTINUATION_LABELS.compartment)).toBeNull()
  })

  it('shows shared continuation for completed main-location equipment inspections', () => {
    const onSelectNextScope = vi.fn()

    renderBodySections({
      form: {
        inspectionType: 'ER Aux Equipment Inspection',
        mainLocation: 'Store',
        photos: [],
      },
      isStructuredInspectionForm: true,
      location: { selectedMainLocationTitle: 'Store', subLocationOptions: [] },
      mainLocation: 'Store',
      selectedTypeDefinition: { key: 'er-aux-equipment-inspection' },
      StructuredEditSection: () => <div>ER Aux rows mounted</div>,
      structuredSectionHandlers: {
        onSelectNextScope,
        scopeContinuation: {
          scope: 'mainLocation',
          label: 'location',
          currentValue: 'Store',
          options: [
            {
              value: 'Store',
              title: 'Store',
              progress: { isDone: true, inspectedCount: 2, totalCount: 2 },
              metaLabel: 'Completed',
            },
            {
              value: 'Office',
              title: 'Office',
              progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
              metaLabel: '0/2 checks',
            },
          ],
        },
      },
    })

    expect(screen.getByText(CONTINUATION_LABELS.location)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Office' }))
    expect(onSelectNextScope).toHaveBeenCalledWith({
      value: 'Office',
      title: 'Office',
      progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
      metaLabel: '2 checks',
      metaIconKey: '',
      metaTone: 'muted',
    })
  })

  it('shows shared continuation for completed High Angle kits', () => {
    renderBodySections({
      form: {
        inspectionType: 'High Angle Rescue Equipment Inspection',
        mainLocation: 'Response Kit #1',
        photos: [],
      },
      isStructuredInspectionForm: true,
      location: { selectedMainLocationTitle: 'Response Kit #1', subLocationOptions: [] },
      mainLocation: 'Response Kit #1',
      selectedTypeDefinition: { key: 'high-angle-rescue-equipment-inspection' },
      StructuredEditSection: () => <div>High Angle rows mounted</div>,
      structuredSectionHandlers: {
        onSelectNextScope: vi.fn(),
        scopeContinuation: {
          scope: 'mainLocation',
          label: 'kit',
          currentValue: 'Response Kit #1',
          options: [
            {
              value: 'Response Kit #1',
              title: 'Response Kit #1',
              progress: { isDone: true, inspectedCount: 2, totalCount: 2 },
              metaLabel: 'Completed',
            },
            {
              value: 'Response Kit #2',
              title: 'Response Kit #2',
              progress: { isDone: false, inspectedCount: 0, totalCount: 2 },
              metaLabel: '0/2 checks',
            },
          ],
        },
      },
    })

    expect(screen.getByText(CONTINUATION_LABELS.kit)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Response Kit #2' })).toBeTruthy()
  })

  it('does not render shared continuation for General or HSE inspection bodies', () => {
    renderBodySections({
      form: {
        inspectionType: 'General Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        inspectionIssues: [],
        photos: [],
      },
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedTypeDefinition: { key: 'general-inspection', usesZoneLocationFlow: true },
      zone: '1',
    })

    expect(screen.queryByText(/Next /)).toBeNull()

    cleanup()

    renderBodySections({
      form: {
        inspectionType: 'Health Safety Environment Inspection',
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
        photos: [],
      },
      isStructuredInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedTypeDefinition: {
        key: 'health-safety-environment-inspection',
        usesZoneLocationFlow: true,
      },
      StructuredEditSection: () => <div>HSE fields</div>,
      zone: '1',
    })

    expect(screen.queryByText(/Next /)).toBeNull()
  })

  it('translates mixed-language finding text only after user confirmation', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => ({ saved: true, synced: true }))
    const initialForm = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    streamAiHelperMessage.mockImplementation(async (payload, handlers) => {
      const text = payload.message.includes('tolong clear barang')
        ? 'Remove the stored items and keep the emergency exit route clear.'
        : 'The emergency exit route was obstructed by stored items.'
      handlers.onDone?.({
        embedded_result: { text },
        message: {
          content: JSON.stringify({
            text,
          }),
          embedded_result: { text },
        },
      })
    })

    renderBodySections({
      form: initialForm,
      getLatestForm: vi.fn(() => initialForm),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    expect(
      screen.getByText(
        'You can write in Bahasa Melayu, English, or mixed language. AI will prepare English text for your review before it is used.',
      ),
    ).toBeTruthy()
    expect(
      screen.getAllByRole('button', { name: 'AI translate' }).map((button) => button.disabled),
    ).toEqual([true, true])

    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'laluan emergency exit kena block barang' },
    })
    fireEvent.change(screen.getByLabelText('Finding action required'), {
      target: { value: 'tolong clear barang' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    expect(streamAiHelperMessage).toHaveBeenCalledTimes(1)
    expect(streamAiHelperMessage.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        response_language: 'en',
        embedded_task: 'inspection_translate_finding',
        page_context: expect.objectContaining({
          module_key: 'inspection',
          route_key: 'inspection.form.finding',
        }),
      }),
    )
    expect(JSON.parse(streamAiHelperMessage.mock.calls[0][0].message)).toEqual({
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      field: 'description',
      sourceText: 'laluan emergency exit kena block barang',
    })
    expect(streamAiHelperMessage.mock.calls[0][0].page_context.params).toEqual({
      inspection_type: 'General Inspection',
      zone: '1',
      main_area: 'Manjung Hub',
      location: 'Reception',
    })
    expect(streamAiHelperMessage.mock.calls[0][0].page_context).not.toHaveProperty(
      'assistant_surface',
    )
    expect(streamAiHelperMessage.mock.calls[0][0].page_context).not.toHaveProperty(
      'conversation_purpose',
    )
    expect(streamAiHelperMessage.mock.calls[0][0].page_context).not.toHaveProperty(
      'inspection_type',
    )
    expect(streamAiHelperMessage.mock.calls[0][0].page_context).not.toHaveProperty('location')
    expect(screen.getByText('AI suggested English')).toBeTruthy()
    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('laluan emergency exit kena block barang')).toBeTruthy()

    fireEvent.click(
      within(screen.getByTestId('ai-translate-description-panel')).getByText('Accept'),
    )

    expect(
      screen.getByDisplayValue('The emergency exit route was obstructed by stored items.'),
    ).toBeTruthy()
    expect(onSaveDraft).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[1])
    })

    expect(streamAiHelperMessage).toHaveBeenCalledTimes(2)
    expect(JSON.parse(streamAiHelperMessage.mock.calls[1][0].message)).toEqual({
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      field: 'actionRequired',
      sourceText: 'tolong clear barang',
    })

    fireEvent.click(
      within(screen.getByTestId('ai-translate-actionRequired-panel')).getByText('Accept'),
    )

    expect(
      screen.getByDisplayValue('Remove the stored items and keep the emergency exit route clear.'),
    ).toBeTruthy()
    expect(onSaveDraft).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    expect(onSaveDraft).toHaveBeenCalledTimes(1)
    expect(onSaveDraft.mock.calls[0][0].inspectionIssues[0]).toEqual(
      expect.objectContaining({
        description: 'The emergency exit route was obstructed by stored items.',
        actionRequired: 'Remove the stored items and keep the emergency exit route clear.',
      }),
    )
  })

  it('does not apply AI translation when preview is cancelled', async () => {
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      location: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      handlers.onDone?.({
        message: {
          content: JSON.stringify({
            text: 'The walkway was affected by an oil spill.',
          }),
        },
      })
    })

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'General Inspection',
      selectedTypeDefinition: {},
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat walkway' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    expect(streamAiHelperMessage.mock.calls[0][0].page_context.params.location).toBe('Reception')
    expect(screen.getByText('AI suggested English')).toBeTruthy()

    fireEvent.click(
      within(screen.getByTestId('ai-translate-description-panel')).getByText('Cancel'),
    )

    expect(screen.getByDisplayValue('ada minyak dekat walkway')).toBeTruthy()
    expect(screen.queryByText('The walkway was affected by an oil spill.')).toBeNull()
  })

  it('shows request validation failures without offering an unchanged retry', async () => {
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }
    const validationError = new Error('The given data was invalid.')
    validationError.status = 422
    validationError.payload = { code: 'AI_HELPER_VALIDATION_FAILED' }
    streamAiHelperMessage.mockRejectedValueOnce(validationError)

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'General Inspection',
      selectedTypeDefinition: {},
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'makan nasi' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    const panel = screen.getByTestId('ai-translate-description-panel')
    expect(
      within(panel).getByText(
        'The AI request could not be sent because some information was invalid. Refresh the page and try again.',
      ),
    ).toBeTruthy()
    expect(within(panel).queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(within(panel).getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('uses the canonical translator contract for legacy HSE generic findings', async () => {
    const form = {
      inspectionType: 'Health Safety Environment Inspection',
      hsePayloadVersion: 0,
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }
    streamAiHelperMessage.mockImplementationOnce(async (_payload, handlers) => {
      handlers.onDone?.({ embedded_result: { text: 'The access route was obstructed.' } })
    })

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isStructuredInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'Health Safety Environment Inspection',
      selectedTypeDefinition: {
        key: 'health-safety-environment-inspection',
        payloadVersion: 2,
        supportsGenericFindings: false,
        usesZoneLocationFlow: true,
      },
      StructuredEditSection: () => <div>Legacy HSE fields</div>,
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'laluan masuk kena block' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    expect(streamAiHelperMessage).toHaveBeenCalledTimes(1)
    expect(streamAiHelperMessage.mock.calls[0][0].page_context.params).toEqual({
      inspection_type: 'Health Safety Environment Inspection',
      zone: '1',
      main_area: 'Manjung Hub',
      location: 'Reception',
    })
    expect(screen.getByText('The access route was obstructed.')).toBeTruthy()
  })

  it('hides stale AI suggestions when the translated field is edited', async () => {
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      handlers.onDone?.({
        message: {
          content: JSON.stringify({
            text: 'The walkway was affected by an oil spill.',
          }),
        },
      })
    })

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat walkway' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    expect(screen.getByText('The walkway was affected by an oil spill.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat main walkway' },
    })

    expect(screen.queryByText('The walkway was affected by an oil spill.')).toBeNull()
  })

  it('does not render a late AI suggestion after the field edit aborts translation', async () => {
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }
    let resolveStream
    const streamDone = new Promise((resolve) => {
      resolveStream = resolve
    })

    streamAiHelperMessage.mockImplementation(async (_payload, handlers, options) => {
      await streamDone
      if (options?.signal?.aborted) return
      handlers.onDone?.({
        message: {
          content: JSON.stringify({
            text: 'The walkway was affected by an oil spill.',
          }),
        },
      })
    })

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat walkway' },
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    expect(screen.getByText('Translating...')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat main walkway' },
    })

    await act(async () => {
      resolveStream()
      await streamDone
    })

    expect(screen.queryByText('The walkway was affected by an oil spill.')).toBeNull()
    expect(screen.queryByText('AI suggested English')).toBeNull()
  })

  it('shows an error when AI returns an invalid finding translation', async () => {
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    streamAiHelperMessage.mockImplementation(async (_payload, handlers) => {
      handlers.onDone?.({ message: { content: 'not json' } })
    })

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm: vi.fn(),
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'ada minyak dekat walkway' },
    })

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'AI translate' })[0])
    })

    expect(
      screen.getByText('Unable to translate finding right now. Please try again.'),
    ).toBeTruthy()
  })

  it('lets General Inspection persist findings as compact numbered cards', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => ({ saved: true, synced: true }))
    const initialForm = {
      inspectionType: 'General Inspection',
      description: 'Area walkdown completed.',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    const { rerender } = renderBodySections({
      form: initialForm,
      getLatestForm: vi.fn(() => initialForm),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))

    expect(updateForm).not.toHaveBeenCalled()
    expect(screen.getAllByText('Add finding').length).toBeGreaterThan(1)
    expect(screen.getByText('No findings added.')).toBeTruthy()
    expect(screen.getByLabelText('Describe finding')).toBeTruthy()

    fireEvent.click(screen.getByText('Save'))

    expect(screen.getByText('Describe the finding before saving.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Blocked emergency exit.' },
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    const savedForm = updateForm.mock.calls.at(-1)?.[0]
    expect(onSaveDraft).toHaveBeenCalledTimes(1)
    expect(onSaveDraft.mock.calls[0][0].inspectionIssues).toHaveLength(1)
    expect(savedForm.inspectionIssues).toHaveLength(1)
    expect(savedForm.inspectionIssues[0]).toEqual(
      expect.objectContaining({
        description: 'Blocked emergency exit.',
        actionRequired: '',
        photos: [],
      }),
    )

    rerender(
      <InspectionFormBodySections
        appendDescription={vi.fn()}
        checklistChips={[]}
        currentStructuredSummary={null}
        descriptionRef={createRef()}
        draftStatus=""
        fieldErrors={{}}
        form={savedForm}
        getLatestForm={vi.fn(() => savedForm)}
        isFireExtinguisherCatalogInspectionForm={false}
        isLoadingEquipmentRows={false}
        isLoadingFireExtinguisherRows={false}
        isLoadingScbaCatalogSections={false}
        isFireTruckCatalogInspectionForm={false}
        isFullInspectionForm
        isStructuredInspectionForm={false}
        location={{
          selectedMainLocationTitle: 'Manjung Hub',
          subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
        }}
        mainLocation="Manjung Hub"
        onRequestReview={vi.fn()}
        onSaveDraft={onSaveDraft}
        photosRef={createRef()}
        removePhoto={vi.fn()}
        requestRootPhotoUpload={vi.fn()}
        selectedFireTruckPlate=""
        selectedType="General Inspection"
        selectedTypeDefinition={{ usesZoneLocationFlow: true }}
        showComingSoonNotice={false}
        structuredDisplayForm={{}}
        structuredSectionHandlers={{}}
        structuredSectionRef={createRef()}
        StructuredEditSection={null}
        toggleChecklistChip={vi.fn()}
        updateForm={updateForm}
        updatePhotoDescription={vi.fn()}
        uploadInputRef={createRef()}
        cameraInputRef={createRef()}
        validationState={null}
        validationStatusMessage=""
        zone="1"
      />,
    )

    expect(screen.getByText('1. Blocked emergency exit.')).toBeTruthy()
    expect(screen.queryByText('Finding 1')).toBeNull()

    fireEvent.click(screen.getByLabelText('Finding 1 actions'))
    fireEvent.click(screen.getByText('Edit'))

    expect(screen.getByText('Edit finding')).toBeTruthy()
    expect(screen.getByDisplayValue('Blocked emergency exit.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Blocked emergency exit near workshop door.' },
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    expect(onSaveDraft).toHaveBeenCalledTimes(2)
    expect(updateForm.mock.calls.at(-1)?.[0].inspectionIssues[0]).toEqual(
      expect.objectContaining({
        id: savedForm.inspectionIssues[0].id,
        description: 'Blocked emergency exit near workshop door.',
      }),
    )
  })

  it('commits General Inspection findings locally without waiting for backend draft sync', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(() => new Promise(() => {}))
    const onSaveInspectionFindingDraft = vi.fn(() => ({
      saved: true,
      local: true,
      pending: true,
    }))
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      structuredSectionHandlers: {
        onSaveInspectionFindingDraft,
      },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Blocked emergency exit.' },
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    expect(onSaveInspectionFindingDraft).toHaveBeenCalledWith([
      expect.objectContaining({
        description: 'Blocked emergency exit.',
        actionRequired: '',
        photos: [],
        zone: '1',
        mainLocation: 'Manjung Hub',
        subLocation: 'Reception',
      }),
    ])
    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(updateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionIssues: [
          expect.objectContaining({
            description: 'Blocked emergency exit.',
          }),
        ],
      }),
    )
    expect(screen.queryByLabelText('Describe finding')).toBeNull()
  })

  it('deletes General Inspection findings locally without waiting for backend draft sync', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(() => new Promise(() => {}))
    const onSaveInspectionFindingDraft = vi.fn(() => ({
      saved: true,
      local: true,
      pending: true,
    }))
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [
        {
          id: 'issue-1',
          description: 'Blocked emergency exit.',
          actionRequired: '',
          photos: [],
        },
      ],
      photos: [],
    }

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      structuredSectionHandlers: {
        onSaveInspectionFindingDraft,
      },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByLabelText('Finding 1 actions'))
    fireEvent.click(screen.getByText('Delete'))

    expect(onSaveInspectionFindingDraft).toHaveBeenCalledWith([])
    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(updateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionIssues: [],
      }),
    )
  })

  it('discards unsaved finding editor changes and persists deleted finding cards', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => ({ saved: true, synced: true }))
    const initialForm = {
      inspectionType: 'General Inspection',
      description: 'Area walkdown completed.',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    const { rerender } = renderBodySections({
      form: initialForm,
      getLatestForm: vi.fn(() => initialForm),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    expect(screen.getAllByText('Add finding').length).toBeGreaterThan(1)
    expect(screen.getByText('No findings added.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Unsaved finding.' },
    })
    fireEvent.click(screen.getByText('Cancel'))

    expect(updateForm).not.toHaveBeenCalled()
    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(screen.getByText('No findings added.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    expect(screen.getAllByText('Add finding').length).toBeGreaterThan(1)
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Saved finding.' },
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    const savedForm = updateForm.mock.calls.at(-1)?.[0]
    rerender(
      <InspectionFormBodySections
        appendDescription={vi.fn()}
        checklistChips={[]}
        currentStructuredSummary={null}
        descriptionRef={createRef()}
        draftStatus=""
        fieldErrors={{}}
        form={savedForm}
        getLatestForm={vi.fn(() => savedForm)}
        isFireExtinguisherCatalogInspectionForm={false}
        isLoadingEquipmentRows={false}
        isLoadingFireExtinguisherRows={false}
        isLoadingScbaCatalogSections={false}
        isFireTruckCatalogInspectionForm={false}
        isFullInspectionForm
        isStructuredInspectionForm={false}
        location={{
          selectedMainLocationTitle: 'Manjung Hub',
          subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
        }}
        mainLocation="Manjung Hub"
        onRequestReview={vi.fn()}
        onSaveDraft={onSaveDraft}
        photosRef={createRef()}
        removePhoto={vi.fn()}
        requestRootPhotoUpload={vi.fn()}
        selectedFireTruckPlate=""
        selectedType="General Inspection"
        selectedTypeDefinition={{ usesZoneLocationFlow: true }}
        showComingSoonNotice={false}
        structuredDisplayForm={{}}
        structuredSectionHandlers={{}}
        structuredSectionRef={createRef()}
        StructuredEditSection={null}
        toggleChecklistChip={vi.fn()}
        updateForm={updateForm}
        updatePhotoDescription={vi.fn()}
        uploadInputRef={createRef()}
        cameraInputRef={createRef()}
        validationState={null}
        validationStatusMessage=""
        zone="1"
      />,
    )

    fireEvent.click(screen.getByLabelText('Finding 1 actions'))
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'))
    })

    expect(onSaveDraft).toHaveBeenCalledTimes(2)
    expect(onSaveDraft.mock.calls.at(-1)?.[0].inspectionIssues).toEqual([])
    expect(updateForm.mock.calls.at(-1)?.[0].inspectionIssues).toEqual([])
  })

  it('discards unsaved finding photos when the editor is cancelled', async () => {
    setMobileViewport()
    const requestInspectionIssuePhotoUpload = vi.fn()
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => ({ saved: true, synced: true }))
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      requestInspectionIssuePhotoUpload,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Temporary finding with photo.' },
    })
    fireEvent.click(screen.getByText('Add finding photos'))
    fireEvent.click(screen.getByText('Take photo'))

    await act(async () => {
      requestInspectionIssuePhotoUpload.mock.calls[0][0].onAddPhotos([
        {
          id: 'unsaved-finding-photo',
          url: 'data:image/png;base64,QUFB',
          description: 'Unsaved finding photo.',
        },
      ])
    })

    expect(screen.getByText('Add finding photos (1)')).toBeTruthy()

    fireEvent.click(screen.getByText('Cancel'))

    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(updateForm).not.toHaveBeenCalled()
    expect(screen.getByText('No findings added.')).toBeTruthy()
    expect(screen.queryByText('Unsaved finding photo.')).toBeNull()
  })

  it('keeps the finding editor open when draft persistence fails', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => false)
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [],
      photos: [],
    }

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Add finding' }))
    expect(screen.getAllByText('Add finding').length).toBeGreaterThan(1)
    fireEvent.change(screen.getByLabelText('Describe finding'), {
      target: { value: 'Blocked emergency exit.' },
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save'))
    })

    expect(onSaveDraft).toHaveBeenCalledTimes(1)
    expect(updateForm).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Describe finding')).toBeTruthy()
    expect(screen.getByText('Unable to save finding. Please try again.')).toBeTruthy()
  })

  it('keeps saved finding cards when delete draft persistence fails', async () => {
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => false)
    const form = {
      inspectionType: 'General Inspection',
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [
        {
          id: 'issue-1',
          description: 'Blocked emergency exit.',
          actionRequired: '',
          photos: [],
        },
      ],
      photos: [],
    }

    renderBodySections({
      form,
      getLatestForm: vi.fn(() => form),
      isFullInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      selectedType: 'General Inspection',
      selectedTypeDefinition: { usesZoneLocationFlow: true },
      updateForm,
      zone: '1',
    })

    fireEvent.click(screen.getByLabelText('Finding 1 actions'))
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'))
    })

    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        inspectionIssues: [],
      }),
    )
    expect(updateForm).not.toHaveBeenCalled()
    expect(screen.getByText('1. Blocked emergency exit.')).toBeTruthy()
    expect(screen.getByText('Unable to delete finding. Please try again.')).toBeTruthy()
  })

  it('does not render duplicate generic findings or evidence for lean HSE inspections', () => {
    setMobileViewport()
    const requestInspectionIssuePhotoUpload = vi.fn()
    const updateForm = vi.fn()
    const onSaveDraft = vi.fn(async () => ({ saved: true, synced: false }))
    const issue = {
      id: 'issue-1',
      description: 'Oil spill near walkway.',
      actionRequired: 'Barricade and clean.',
      photos: [],
    }
    const hseForm = {
      inspectionType: 'Health Safety Environment Inspection',
      hsePayloadVersion: 2,
      zone: '1',
      mainLocation: 'Manjung Hub',
      subLocation: 'Reception',
      inspectionIssues: [issue],
      photos: [],
    }

    renderBodySections({
      form: hseForm,
      getLatestForm: vi.fn(() => hseForm),
      isStructuredInspectionForm: true,
      location: {
        selectedMainLocationTitle: 'Manjung Hub',
        subLocationOptions: [{ value: 'Reception', title: 'Reception' }],
      },
      mainLocation: 'Manjung Hub',
      onSaveDraft,
      requestInspectionIssuePhotoUpload,
      selectedType: 'Health Safety Environment Inspection',
      selectedTypeDefinition: {
        key: 'health-safety-environment-inspection',
        usesZoneLocationFlow: true,
        supportsGenericFindings: false,
        ownsRootEvidence: true,
        payloadVersion: 2,
      },
      StructuredEditSection: () => <div>HSE fields</div>,
      updateForm,
      zone: '1',
    })

    expect(screen.getByText('HSE fields')).toBeTruthy()
    expect(screen.queryByText('1. Oil spill near walkway.')).toBeNull()
    expect(screen.queryByText('Add report evidence')).toBeNull()
    expect(requestInspectionIssuePhotoUpload).not.toHaveBeenCalled()
    expect(onSaveDraft).not.toHaveBeenCalled()
    expect(updateForm).not.toHaveBeenCalled()
  })

  it('discards staged HSE evidence photos when the mobile observation drawer is cancelled', async () => {
    setMobileViewport()
    const onSaveHseObservationDraft = vi.fn()
    const onUploadGeneralPhoto = vi.fn()
    const form = {
      hseSelections: ['unsafeAct'],
      hseSeverity: 'High',
      hseUnsafeActDetails: 'Unsafe work at height.',
      photos: [],
    }

    render(
      <HseEditSection
        form={form}
        handlers={{
          onSaveHseObservationDraft,
          onUploadGeneralPhoto,
        }}
      />,
    )

    fireEvent.click(screen.getByText('Unsafe Act - High'))
    fireEvent.click(screen.getByText('Upload HSE photo'))

    expect(onUploadGeneralPhoto).toHaveBeenCalledWith('Unsafe Act', {
      rootPhotos: [],
      onAddPhotos: expect.any(Function),
    })

    await act(async () => {
      onUploadGeneralPhoto.mock.calls[0][1].onAddPhotos([
        {
          id: 'hse-photo-1',
          fileName: 'hse.jpg',
          url: 'data:image/png;base64,QUFB',
          description: 'Unsafe act evidence.',
        },
      ])
    })

    expect(screen.getByText('1 HSE photo ready to save')).toBeTruthy()

    fireEvent.click(screen.getByText('Cancel'))

    expect(onSaveHseObservationDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Unsafe Act - High'))

    expect(screen.getByText('0 HSE photos attached')).toBeTruthy()
    expect(screen.queryByText('1 HSE photo ready to save')).toBeNull()
  })

  it('commits staged HSE evidence photos with the mobile observation drawer save', async () => {
    setMobileViewport()
    const onSaveHseObservationDraft = vi.fn(() => ({ saved: true }))
    const onTakeGeneralPhoto = vi.fn()
    const existingPhoto = {
      id: 'existing-hse-photo',
      fileName: 'existing.jpg',
      url: 'data:image/png;base64,QUFB',
    }
    const addedPhoto = {
      id: 'hse-photo-2',
      fileName: 'hse-2.jpg',
      url: 'data:image/png;base64,QkJC',
      description: 'Saved HSE evidence.',
    }
    const form = {
      hseSelections: ['unsafeAct'],
      hseSeverity: 'High',
      hseUnsafeActDetails: 'Unsafe work at height.',
      photos: [existingPhoto],
    }

    render(
      <HseEditSection
        form={form}
        handlers={{
          onSaveHseObservationDraft,
          onTakeGeneralPhoto,
        }}
      />,
    )

    fireEvent.click(screen.getByText('Unsafe Act - High'))
    expect(screen.getByText('1 HSE photo attached')).toBeTruthy()

    fireEvent.click(screen.getByText('Take HSE photo'))

    expect(onTakeGeneralPhoto).toHaveBeenCalledWith('Unsafe Act', {
      rootPhotos: [existingPhoto],
      onAddPhotos: expect.any(Function),
    })

    await act(async () => {
      onTakeGeneralPhoto.mock.calls[0][1].onAddPhotos([addedPhoto])
    })

    expect(screen.getByText('2 HSE photos ready to save')).toBeTruthy()

    fireEvent.click(screen.getByText('Save'))

    expect(onSaveHseObservationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        hseSelections: ['unsafeAct'],
        hseSeverity: 'High',
        hseUnsafeActDetails: 'Unsafe work at height.',
        photos: [
          expect.objectContaining({ id: 'existing-hse-photo' }),
          expect.objectContaining({ id: 'hse-photo-2', description: 'Saved HSE evidence.' }),
        ],
      }),
    )
  })
})
