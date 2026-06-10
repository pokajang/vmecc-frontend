// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import InspectionForm from '../InspectionForm'

vi.mock('../TypeManagerModal', () => ({
  default: () => null,
}))

vi.mock('../useLocationTypeManager', () => ({
  LOCATION_TOGGLE_VALUE: '__inspection_location_types_toggle__',
  default: () => ({
    showAddLocationModal: false,
    closeAddModal: () => {},
    locationEditMode: false,
    setLocationEditMode: () => {},
    typeOptions: [{ value: 'Zone A', title: 'Zone A', description: 'Zone A' }],
    visibleTypeOptions: [{ value: 'Zone A', title: 'Zone A', description: 'Zone A' }],
    setShowAllLocationTypes: () => {},
    openAddModal: () => {},
    removeType: () => {},
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
  }),
}))

vi.mock('../useIncidentTypeManager', () => ({
  INCIDENT_TYPE_TOGGLE_VALUE: '__inspection_incident_types_toggle__',
  default: () => ({
    showAddTypeModal: false,
    closeAddModal: () => {},
    incidentEditMode: false,
    setIncidentEditMode: () => {},
    typeOptions: [{ value: 'Pump House Inspection', title: 'Pump House Inspection' }],
    visibleTypeOptions: [{ value: 'Pump House Inspection', title: 'Pump House Inspection' }],
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

describe('InspectionForm workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  it('submits review request when form is valid', () => {
    const onRequestReview = vi.fn()
    render(
      <InspectionForm
        {...baseProps}
        onRequestReview={onRequestReview}
        value={{
          selectedLocation: 'Zone A',
          inspectionType: 'Pump House Inspection',
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

    fireEvent.click(screen.getByText('Save & Review'))

    expect(onRequestReview).toHaveBeenCalledTimes(1)
    expect(onRequestReview).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedLocation: 'Zone A',
        inspectionType: 'Pump House Inspection',
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
          inspectionType: '',
          description: '',
          photos: [],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Save & Review'))

    expect(onRequestReview).not.toHaveBeenCalled()
    expect(pushToast).toHaveBeenCalledWith('Complete the inspection form before review.', {
      title: 'Incomplete form',
      color: 'warning',
    })
  })
})
