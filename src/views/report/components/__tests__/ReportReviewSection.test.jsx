// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ReportReviewSection from '../ReportReviewSection'

afterEach(() => {
  cleanup()
})

const record = {
  id: 'drill-001',
  displayId: 'DRILL-001',
  reportType: 'drill',
  incidentType: 'Confined Space Drill',
  weather: 'Clear',
  location: 'Plant 1',
  reportDate: '2026-07-07',
  reportTime: '09:00',
  reportIssuanceDate: '2026-07-08',
  exerciseCategories: ['Rescue', 'Special Assistance'],
  exerciseTitle: 'Confined space response exercise',
  details: 'Entry drill',
  summary: 'Crew completed the drill.',
  exerciseObjectives: [{ text: 'Test rescue readiness' }],
  erpReferences: [{ annexNumber: 'ERP-03', title: 'Confined Space Rescue' }],
  respondingTeam: {
    name: 'A Team',
    attendance: [{ memberId: '1', name: 'Alex', role: 'Responder', exerciseRole: 'SC' }],
  },
  chronology: [{ time: '09:05', action: 'Briefing started.' }],
  postIncidentAnalysis: { strengths: ['Clear command'], photos: [] },
}

describe('ReportReviewSection', () => {
  it('uses inspection review shell and action layout', () => {
    const onBackToEdit = vi.fn()
    const onConfirm = vi.fn()

    const { container } = render(
      <ReportReviewSection
        selectedRecord={record}
        reviewActions={{
          onBackToEdit,
          onConfirm,
          confirmLabel: 'Confirm Submit',
        }}
        formatDateTime={(date, time) => [date, time].filter(Boolean).join(' ')}
        renderStatusBadge={(status) => <span>{status}</span>}
        typeLabel="Drill Type"
        detailsLabel="Drill Scenario"
        summaryLabel="Outcome Summary"
      />,
    )

    const reviewPage = container.querySelector('.inspection-review-page')
    expect(reviewPage).toBeTruthy()
    expect(container.querySelector('.inspection-review-hero')).toBeTruthy()
    expect(within(reviewPage).getByText('Report Details')).toBeTruthy()
    expect(within(reviewPage).getByText('Exercise Details')).toBeTruthy()
    expect(within(reviewPage).getByText('Rescue, Special Assistance')).toBeTruthy()
    expect(within(reviewPage).getByText('Test rescue readiness')).toBeTruthy()
    expect(within(reviewPage).getByText('ERP-03 - Confined Space Rescue')).toBeTruthy()
    expect(within(reviewPage).getByText('Exercise Personnel')).toBeTruthy()
    expect(within(reviewPage).getByText('Alex - Responder (SC)')).toBeTruthy()
    expect(within(reviewPage).getByText('Post-Exercise Analysis')).toBeTruthy()
    expect(within(reviewPage).getByText('Chronology')).toBeTruthy()
    expect(within(reviewPage).queryByText('Save Draft')).toBeNull()
    expect(within(reviewPage).getAllByText('Confirm Submit').length).toBeGreaterThan(0)

    const chronologySection = within(reviewPage).getByText('Chronology').closest('section')
    fireEvent.click(within(chronologySection).getByRole('button', { name: 'Edit' }))
    expect(onBackToEdit).toHaveBeenCalledWith('chronology')
  })
})
