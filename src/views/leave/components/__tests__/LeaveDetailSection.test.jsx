// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ApplicantLeaveDetailSection from '../LeaveDetailSection'
import StaffLeaveDetailSection from 'src/views/staff/leave-management/components/LeaveDetailSection'

afterEach(cleanup)

const renderWithRouter = (component) => render(<MemoryRouter>{component}</MemoryRouter>)

const longReason =
  'Operational coverage requires a deliberately long explanation that must remain readable on narrow screens.'
const record = {
  id: 'leave-1',
  leaveType: 'Annual Leave',
  days: 0,
  status: 'Submitted',
  nextActionRole: 'Supervisor',
  workflowTeamName: 'Response Team Alpha',
  workflowApplicantRole: 'Responder',
  appliedAt: '2026-08-01',
  coverBy: '',
  reason: longReason,
  attachmentAvailable: true,
  attachmentId: 'attachment-1',
  attachmentName: 'supporting-evidence.pdf',
  rosterImpactSnapshot: {
    observed_at: '2026-08-01 09:30',
    items: [
      {
        shift_label: 'EXCEPTIONALLY-LONG-UNBROKEN-SHIFT-NAME-1234567890',
        team_name: 'Response Team Alpha',
        date: '2026-08-02',
      },
    ],
  },
  approvalHistory: [],
  workflowSnapshot: { requireRecommendation: true },
}

const sharedProps = {
  selectedRecord: record,
  selectedRecordPendingActionHint: 'Supervisor review required',
  selectedRecordHistoryEntries: [],
  onBack: vi.fn(),
  getDisplayLeaveId: () => 'LEV-2026-001',
  getScheduleLabel: () => '1 Aug 2026 – 2 Aug 2026',
  getStatusBadge: (status) => <span data-testid="leave-status-badge">{status}</span>,
  formatDate: () => '1 Aug 2026',
  formatDateTime: () => '1 Aug 2026, 9:30 AM',
}

const expectCommonDetailContract = ({ staff = false } = {}) => {
  const detail = screen.getByTestId(staff ? 'leave-management-detail' : 'leave-detail-section')
  expect(detail.className).toContain('inspection-detail-section')
  expect(screen.getByRole('heading', { level: 2, name: 'Annual Leave' })).toBeTruthy()
  expect(detail.textContent).toContain('LEV-2026-001')
  expect(detail.textContent).toContain('1 Aug 2026 – 2 Aug 2026')
  expect(screen.getByText('0')).toBeTruthy()
  expect(screen.getByText(longReason)).toBeTruthy()
  expect(screen.getByTestId('leave-status-badge').closest('.record-detail-summary')).toBeTruthy()
  expect(detail.querySelector('.responsive-key-value-list--compact')).toBeTruthy()
  expect(screen.getByText('Request information').closest('details')).toBeTruthy()
  expect(detail.textContent).toContain('Next action: Supervisor')

  const evidence = screen.getByRole('link', { name: 'supporting-evidence.pdf' })
  expect(evidence.closest('dd')).toBeTruthy()
  expect(evidence.getAttribute('href')).toContain('/leave/attachments/attachment-1')
  expect(evidence.getAttribute('target')).toBe('_blank')

  const list = detail.querySelector('dl.responsive-key-value-list')
  expect(list).toBeTruthy()
}

describe('Leave detail read-only presentation', () => {
  it('keeps the applicant detail values, embedded link, actions, and semantic order', () => {
    renderWithRouter(
      <ApplicantLeaveDetailSection
        {...sharedProps}
        canEdit
        canCancel
        canDelete
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expectCommonDetailContract()
    expect(screen.getAllByRole('button', { name: 'Edit' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Cancel' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0)
  })

  it('keeps staff-only roster capture context and its detail anchor', () => {
    renderWithRouter(<StaffLeaveDetailSection {...sharedProps} />)

    expectCommonDetailContract({ staff: true })
    expect(screen.getByTestId('leave-management-detail')).toBeTruthy()
    expect(screen.getByText(/captured 2026-08-01 09:30/)).toBeTruthy()
  })

  it('keeps an authoritative server action denial above local fallback permissions', () => {
    renderWithRouter(
      <ApplicantLeaveDetailSection
        {...sharedProps}
        selectedRecord={{
          ...record,
          recordActionsVersion: 1,
          recordActions: {
            edit: { applicable: true, allowed: false },
          },
        }}
        canEdit
        onEdit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it.each([
    ['applicant', ApplicantLeaveDetailSection],
    ['staff', StaffLeaveDetailSection],
  ])('retains the missing-record state for the %s view', (_name, Component) => {
    renderWithRouter(<Component {...sharedProps} selectedRecord={null} />)
    expect(screen.getByRole('alert').textContent).toContain('Leave record not found.')
    expect(screen.getByRole('button', { name: /^Back(?: to leave)?$/ })).toBeTruthy()
  })

  it('shows loading rather than a false missing-record alert during applicant hydration', () => {
    renderWithRouter(
      <ApplicantLeaveDetailSection {...sharedProps} selectedRecord={null} isLoading />,
    )

    expect(screen.getByRole('status').textContent).toContain('Loading leave record...')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
