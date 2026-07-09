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
  details: 'Entry drill',
  summary: 'Crew completed the drill.',
  chronology: [{ time: '09:05', action: 'Briefing started.' }],
}

describe('ReportReviewSection', () => {
  it('uses inspection review shell and action layout', () => {
    const onBackToEdit = vi.fn()
    const onSaveDraft = vi.fn()
    const onConfirm = vi.fn()

    const { container } = render(
      <ReportReviewSection
        selectedRecord={record}
        reviewActions={{
          onBackToEdit,
          onSaveDraft,
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
    expect(within(reviewPage).getByText('Summary')).toBeTruthy()
    expect(within(reviewPage).getByText('Chronology')).toBeTruthy()
    expect(within(reviewPage).getAllByText('Save Draft').length).toBeGreaterThan(0)
    expect(within(reviewPage).getAllByText('Confirm Submit').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('Save Draft')[0])
    expect(onSaveDraft).toHaveBeenCalledTimes(1)
  })
})
