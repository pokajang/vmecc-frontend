import { describe, expect, it } from 'vitest'
import { buildInspectionAiHelperUiState } from '../form/useInspectionAiHelperUiState'

describe('inspection Ask AI UI state', () => {
  it('publishes only canonical Fire Truck workflow hints', () => {
    const state = buildInspectionAiHelperUiState({
      canReview: false,
      canSaveDraft: true,
      draftStatus: 'Draft belonging to Alice',
      selectedType: 'Fire Truck Daily Readiness',
      form: {
        inspectionType: 'Fire Truck Daily Readiness',
        inspectedAt: '2026-07-22T10:00',
        frtTruckPlate: 'AJG9555',
        frtCompartment: '',
        frtDailyChecks: [],
      },
    })

    expect(state).toMatchObject({
      record_kind: 'inspection',
      record_status: 'draft',
      selected_type: 'fire_truck_daily',
      current_step: 'complete_checklist',
      available_actions: ['save_draft'],
    })
    expect(state.missing_fields).toContain('compartment')
    expect(state.missing_fields).toContain('daily_readiness')
    expect(JSON.stringify(state)).not.toContain('Alice')
    expect(JSON.stringify(state)).not.toContain('AJG9555')
  })

  it('does not suggest draft or review actions for a submitted inspection', () => {
    const state = buildInspectionAiHelperUiState({
      canReview: true,
      canSaveDraft: true,
      draftStatus: 'Submitted',
      selectedType: 'Health Safety Environment',
      form: { inspectionType: 'Health Safety Environment' },
    })

    expect(state.record_status).toBe('submitted')
    expect(state.available_actions).toEqual([])
    expect(state.missing_fields).toEqual([])
    expect(state.current_step).toBe('review')
  })
})
