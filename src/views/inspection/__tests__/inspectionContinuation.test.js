import { describe, expect, it } from 'vitest'
import {
  buildInspectionContinuationForm,
  buildInspectionContinuationPrompt,
  makeInspectionContinuationKey,
} from '../inspectionContinuation'

describe('inspectionContinuation', () => {
  it('offers the remaining hydraulic seeded location after a new report submit', () => {
    const prompt = buildInspectionContinuationPrompt({
      record: {
        incidentType: 'Hydraulic Rescue Tools Inspection',
        mainLocation: 'FRT',
      },
    })

    expect(prompt).toEqual(
      expect.objectContaining({
        title: 'Inspect next location?',
        inspectionType: 'Hydraulic Rescue Tools Inspection',
        currentLocation: 'FRT',
        completedKey: makeInspectionContinuationKey('Hydraulic Rescue Tools Inspection', 'FRT'),
      }),
    )
    expect(prompt.options).toEqual([
      expect.objectContaining({
        value: 'Store',
        title: 'Store',
      }),
    ])
  })

  it('does not offer a previously completed hydraulic sibling in the same continuation session', () => {
    const prompt = buildInspectionContinuationPrompt({
      record: {
        incidentType: 'Hydraulic Rescue Tools Inspection',
        mainLocation: 'Store',
      },
      completedKeys: [makeInspectionContinuationKey('Hydraulic Rescue Tools Inspection', 'FRT')],
    })

    expect(prompt).toBeNull()
  })

  it('does not prompt for edits or inactive large worklist types', () => {
    expect(
      buildInspectionContinuationPrompt({
        record: {
          incidentType: 'Hydraulic Rescue Tools Inspection',
          mainLocation: 'FRT',
          version: 2,
        },
        isNewReport: false,
      }),
    ).toBeNull()

    expect(
      buildInspectionContinuationPrompt({
        record: {
          incidentType: 'Fire Extinguisher Inspection',
          mainLocation: 'Manjung Hub',
        },
      }),
    ).toBeNull()
  })

  it('does not prompt from custom hydraulic locations outside seeded defaults', () => {
    expect(
      buildInspectionContinuationPrompt({
        record: {
          incidentType: 'Hydraulic Rescue Tools Inspection',
          mainLocation: 'Custom Pump Room',
        },
      }),
    ).toBeNull()
  })

  it('builds a clean continuation form for the selected next location', () => {
    expect(
      buildInspectionContinuationForm({
        inspectionType: 'Hydraulic Rescue Tools Inspection',
        mainLocation: 'Store',
      }),
    ).toEqual({
      selectedLocation: 'Store',
      mainLocation: 'Store',
      subLocation: '',
      mainLocationId: '',
      subLocationId: '',
      inspectionType: 'Hydraulic Rescue Tools Inspection',
      inspectedAt: '',
      description: '',
      photos: [],
      checklist: [],
      hydraulicChecks: [],
    })
  })
})
