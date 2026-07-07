// @vitest-environment jsdom
import React, { createRef } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionFormShell from '../form/components/InspectionFormShell'

vi.mock('../form/components/InspectionFormModals', () => ({
  default: () => null,
}))

vi.mock('../form/components/InspectionFormManagerModals', () => ({
  default: () => null,
}))

vi.mock('../form/components/InspectionFormSetupSections', () => ({
  default: () => <div data-testid="inspection-setup-sections">Setup sections</div>,
}))

vi.mock('../form/components/InspectionFormBodySections', () => ({
  default: () => <div data-testid="inspection-body-sections">Body sections</div>,
}))

afterEach(() => {
  cleanup()
})

const noop = vi.fn()

const renderShell = () =>
  render(
    <InspectionFormShell
      catalogManagers={{
        openAddFireTruckModal: noop,
        setFireTruckDeleteTarget: noop,
        startEditFireTruck: noop,
        showFireTruckModal: false,
      }}
      checkActions={{
        appendDescription: noop,
        toggleChecklistChip: noop,
      }}
      draftStatus=""
      fieldErrors={{}}
      fireExtinguisherAreaRows={[]}
      fireTruckOptions={[]}
      form={{ photos: [] }}
      getLatestForm={noop}
      incident={{}}
      incidentDeleteTarget={null}
      isEditingType={false}
      isLoadingEquipmentRows={false}
      isLoadingFireExtinguisherAreaRows={false}
      isLoadingFireExtinguisherRows={false}
      isLoadingScbaCatalogSections={false}
      location={{}}
      locationDeleteTarget={null}
      onSaveDraft={noop}
      photoRuntime={{
        cameraInputRef: createRef(),
        handlePhotoSelect: noop,
        removePhoto: noop,
        requestInspectionIssuePhotoUpload: noop,
        requestRootPhotoUpload: noop,
        updatePhotoDescription: noop,
        uploadInputRef: createRef(),
      }}
      refs={{
        descriptionRef: createRef(),
        inspectedAtRef: createRef(),
        inspectionTypeRef: createRef(),
        photosRef: createRef(),
        selectedLocationRef: createRef(),
        structuredSectionRef: createRef(),
      }}
      reviewRequest={{
        requestReview: noop,
        validationStatusMessage: '',
      }}
      scbaRuntime={{}}
      selectedFireTruckPlate=""
      selectedTypeIcon={null}
      setIncidentDeleteTarget={noop}
      setIsEditingType={noop}
      setLocationDeleteTarget={noop}
      setup={{
        isFireExtinguisherCatalogInspectionForm: false,
        isFireTruckCatalogInspectionForm: false,
        mainLocation: '',
        selectFireTruck: noop,
        selectedType: 'General Inspection',
        selectedTypeDefinition: null,
        selectedTypeOption: null,
        subLocation: '',
        supportsCustomLocations: false,
        supportsSubLocations: false,
        updateForm: noop,
        updateInspectedAt: noop,
        updateInspectionType: noop,
        usesZoneLocationFlow: false,
        zone: '',
      }}
      structured={{
        checklistChips: [],
        currentStructuredSummary: null,
        isFullInspectionForm: true,
        isStructuredInspectionForm: false,
        showComingSoonNotice: false,
        structuredDisplayForm: {},
        structuredSectionHandlers: {},
        StructuredEditSection: null,
      }}
      validationState={null}
    />,
  )

describe('InspectionFormShell', () => {
  it('separates setup and body sections with the shared setup-to-form gap wrapper', () => {
    const { container } = renderShell()

    const formWrapper = container.querySelector('.inspection-form-sections')
    const setupWrapper = container.querySelector('.inspection-form-setup-sections')
    const bodyWrapper = container.querySelector('.inspection-form-body-sections')

    expect(formWrapper.classList.contains('inspection-form-edit-sections')).toBe(true)
    expect(setupWrapper).toBeTruthy()
    expect(bodyWrapper).toBeTruthy()
    expect(bodyWrapper.classList.contains('inspection-form-setup-body-gap')).toBe(true)
    expect(
      setupWrapper.compareDocumentPosition(bodyWrapper) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByTestId('inspection-setup-sections')).toBeTruthy()
    expect(screen.getByTestId('inspection-body-sections')).toBeTruthy()
  })
})
