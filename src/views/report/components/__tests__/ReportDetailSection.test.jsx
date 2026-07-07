// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, within } from '@testing-library/react'
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
  it('renders compact mobile detail cards without duplicating the top back action', () => {
    const { container } = render(<ReportDetailSection {...buildProps()} />)
    const mobileDetail = container.querySelector('.report-workfirst-detail')

    expect(mobileDetail).toBeTruthy()
    expect(within(mobileDetail).getByText('ERCO-001')).toBeTruthy()
    expect(within(mobileDetail).getAllByText('Hazmat containment')).toHaveLength(2)
    expect(within(mobileDetail).getByText('Spill isolated and monitored.')).toBeTruthy()
    expect(within(mobileDetail).queryByText('Back to records')).toBeNull()
    expect(within(mobileDetail).getByText('Download')).toBeTruthy()
    expect(within(mobileDetail).getByText('Edit')).toBeTruthy()
    expect(within(mobileDetail).getByText('Delete')).toBeTruthy()
    expect(within(mobileDetail).getByText('Review')).toBeTruthy()
    expect(within(mobileDetail).getByTestId('erco-report-download-action')).toBeTruthy()
  })
})
