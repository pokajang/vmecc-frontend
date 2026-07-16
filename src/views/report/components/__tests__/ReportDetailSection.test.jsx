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
  canDownloadPdf: true,
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
  canReviewRecord: () => true,
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
    expect(within(detail).getByRole('button', { name: 'More actions' })).toBeTruthy()

    fireEvent.click(within(detail).getByRole('button', { name: 'More actions' }))

    const moreDrawer = screen.getByRole('dialog')
    expect(within(moreDrawer).getByText('Download report')).toBeTruthy()
    expect(within(moreDrawer).getByText('Edit')).toBeTruthy()
    expect(within(moreDrawer).getByText('Delete')).toBeTruthy()
    expect(within(moreDrawer).getByTestId('erco-report-download-action')).toBeTruthy()
  })

  it('renders Drill V2 content and Drill workflow labels', () => {
    const drill = {
      ...record,
      id: 'drill-001',
      displayId: 'DRILL-001',
      reportType: 'drill',
      incidentType: 'Fire Drill',
      exerciseTitle: 'Major fire exercise',
      exerciseCategories: ['Fire', 'Rescue'],
      reportIssuanceDate: '2026-07-08',
      exerciseObjectives: [{ text: 'Test evacuation' }],
      erpReferences: [{ annexNumber: 'ERP-01', title: 'Major Fire' }],
      respondingTeam: {
        name: 'A Team',
        attendance: [{ memberId: '1', name: 'Alex', role: 'Responder', exerciseRole: 'SC' }],
      },
      postIncidentAnalysis: { strengths: ['Clear command'], photos: [] },
      timeline: [
        { action: 'Submitted', by: 'Reporter', at: '2026-07-07T16:55:00.000Z' },
        { action: 'Reviewed', by: 'Commander', at: '2026-07-07T17:00:00.000Z' },
        { action: 'Approved', by: 'Manager', at: '2026-07-07T17:05:00.000Z' },
      ],
    }
    render(<ReportDetailSection {...buildProps({ selectedRecord: drill })} />)

    expect(screen.getByText('Fire, Rescue')).toBeTruthy()
    expect(screen.getByText('Test evacuation')).toBeTruthy()
    expect(screen.getByText('ERP-01 - Major Fire')).toBeTruthy()
    expect(screen.getByText('Exercise Personnel')).toBeTruthy()
    expect(screen.getByText('Alex - Responder (SC)')).toBeTruthy()
    expect(screen.getByText('Post-Exercise Analysis')).toBeTruthy()
    expect(screen.getByText('Prepared By')).toBeTruthy()
    expect(screen.getByText('Station Commander Review')).toBeTruthy()
    expect(screen.getByText('VMM Review')).toBeTruthy()
  })

  it('hides PDF download when the server capability is false', () => {
    render(
      <ReportDetailSection
        {...buildProps({ selectedRecord: { ...record, canDownloadPdf: false } })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))

    expect(screen.queryByTestId('erco-report-download-action')).toBeNull()
  })
})
