// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ReportDetailSection from '../ReportDetailSection'

afterEach(() => {
  cleanup()
})

const record = {
  id: 'erco-001',
  displayId: 'ERCO-001',
  reportType: 'erco',
  incidentType: 'Hazmat',
  weather: 'Clear',
  location: 'Zone 1',
  incidentDate: '2026-07-07',
  incidentTime: '16:47',
  details: 'Hazmat containment',
  summary: 'Spill isolated and monitored.',
  submittedBy: 'Codex User',
  submittedAt: '2026-07-07T16:55:00.000Z',
  status: 'Submitted',
  chronology: [{ time: '16:47', action: 'Initial notification received.' }],
  timeline: [{ action: 'Submitted', by: 'Codex User', at: '2026-07-07T16:55:00.000Z' }],
}

const buildProps = (overrides = {}) => ({
  selectedRecord: record,
  onBack: vi.fn(),
  formatDateTime: (date, time) => [date, time].filter(Boolean).join(' '),
  renderStatusBadge: (status) => <span>{status}</span>,
  onEditRecord: vi.fn(),
  onReviewRecord: vi.fn(),
  onApproveRecord: vi.fn(),
  onRejectRecord: vi.fn(),
  onDownloadRecord: vi.fn(),
  onDeleteRecord: vi.fn(),
  canEditRecord: () => true,
  canDeleteRecord: () => true,
  testAnchorPrefix: 'erco-report',
  workFirstMobileDetail: true,
  ...overrides,
})

describe('ReportDetailSection work-first mobile detail', () => {
  it('renders inspection-style detail sections with primary action and More drawer', () => {
    const { container } = render(<ReportDetailSection {...buildProps()} />)
    const detail = container.querySelector('.inspection-detail-section')

    expect(detail).toBeTruthy()
    expect(within(detail).getAllByText('ERCO-001').length).toBeGreaterThan(0)
    expect(within(detail).getByText('Report Metadata')).toBeTruthy()
    expect(within(detail).getByText('Report Context')).toBeTruthy()
    expect(within(detail).getByText('Report Details')).toBeTruthy()
    expect(within(detail).getByText('Hazmat containment')).toBeTruthy()
    expect(within(detail).getByText('Spill isolated and monitored.')).toBeTruthy()
    expect(within(detail).getAllByText('Review').length).toBeGreaterThan(0)
    expect(within(detail).getByRole('button', { name: 'More' })).toBeTruthy()

    fireEvent.click(within(detail).getByRole('button', { name: 'More' }))

    const moreDrawer = screen.getByRole('dialog')
    expect(within(moreDrawer).getByText('Download')).toBeTruthy()
    expect(within(moreDrawer).getByText('Edit')).toBeTruthy()
    expect(within(moreDrawer).getByText('Delete')).toBeTruthy()
    expect(within(moreDrawer).getByTestId('erco-report-download-action')).toBeTruthy()
  })
})
