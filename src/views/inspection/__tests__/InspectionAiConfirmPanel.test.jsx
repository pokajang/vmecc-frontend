// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionAiConfirmPanel from '../ui/InspectionAiConfirmPanel'

vi.mock('src/hooks/useMediaQuery', () => ({ default: () => false }))

vi.mock('../useIncidentTypeManager', () => ({
  INCIDENT_TYPE_TOGGLE_VALUE: '__manage__',
  default: () => ({
    addTypeError: '',
    closeAddModal: vi.fn(),
    editingIncidentTypeKey: '',
    iconOptions: [],
    incidentEditMode: false,
    newTypeDescription: '',
    newTypeIconKey: '',
    newTypeName: '',
    openAddModal: vi.fn(),
    removeType: vi.fn(),
    saveType: vi.fn(),
    setAddTypeError: vi.fn(),
    setIncidentEditMode: vi.fn(),
    setNewTypeDescription: vi.fn(),
    setNewTypeIconKey: vi.fn(),
    setNewTypeName: vi.fn(),
    setShowAllIncidentTypes: vi.fn(),
    showAddTypeModal: false,
    startEditType: vi.fn(),
    typeOptions: [],
    visibleTypeOptions: [],
  }),
}))

afterEach(cleanup)

describe('InspectionAiConfirmPanel media presentation', () => {
  it('uses a contextual image label without exposing the device filename', () => {
    const privateName = 'DEVICE_PRIVATE_AI_CONFIRM_987654.jpg'
    render(
      <InspectionAiConfirmPanel
        userId="uat-user"
        photo={{
          id: 'photo-1',
          fileName: privateName,
          url: 'data:image/png;base64,a',
          description: 'Unsafe condition near the pump',
        }}
        aiResult={{
          detectedType: 'Unsafe Condition',
          descriptions: [],
          confidence: 'medium',
          secondaryFindings: [],
        }}
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
        onReset={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Unsafe condition near the pump' })).toBeTruthy()
    expect(screen.queryByText(privateName)).toBeNull()
    expect(screen.queryByRole('img', { name: privateName })).toBeNull()
  })
})
