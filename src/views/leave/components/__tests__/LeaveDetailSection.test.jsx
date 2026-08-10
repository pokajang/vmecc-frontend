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
  const labels = [
    'Leave ID',
    'Leave Type',
    'Schedule',
    'Days',
    'Current Status',
    'Current Action Owner',
    ...(staff ? [] : ['Workflow Scope', 'Applicant Role']),
    'Next Action',
    'Applied On',
    'Coverage By',
    'Roster Impact',
    'Evidence',
    'Reason',
  ]
  const card = screen.getByText('Leave Details').closest('.card')
  const content = card.textContent
  let previousIndex = -1
  labels.forEach((label) => {
    const nextIndex = content.indexOf(label)
    expect(nextIndex).toBeGreaterThan(previousIndex)
    previousIndex = nextIndex
  })

  expect(screen.getByText('Leave ID').tagName).toBe('DT')
  expect(screen.getByText('LEV-2026-001').tagName).toBe('DD')
  expect(screen.getByText('0')).toBeTruthy()
  expect(screen.getByText(longReason)).toBeTruthy()
  expect(screen.getByTestId('leave-status-badge').closest('dd')).toBeTruthy()
  expect(screen.getByText('Supervisor review required').closest('dd')).toBeTruthy()

  const evidence = screen.getByRole('link', { name: 'supporting-evidence.pdf' })
  expect(evidence.closest('dd')).toBeTruthy()
  expect(evidence.getAttribute('href')).toContain('/leave/attachments/attachment-1')
  expect(evidence.getAttribute('target')).toBe('_blank')

  const list = card.querySelector('dl.responsive-key-value-list')
  expect(list).toBeTruthy()
  expect(screen.getAllByText('Status').at(-1).closest('dl')).toBeNull()
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
    expect(screen.getByRole('button', { name: 'Edit' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Delete' }).hasAttribute('disabled')).toBe(false)
  })

  it('keeps staff-only roster capture context and its detail anchor', () => {
    renderWithRouter(<StaffLeaveDetailSection {...sharedProps} />)

    expectCommonDetailContract({ staff: true })
    expect(screen.getByTestId('leave-management-detail')).toBeTruthy()
    expect(screen.getByText(/captured 2026-08-01 09:30/)).toBeTruthy()
  })

  it.each([
    ['applicant', ApplicantLeaveDetailSection],
    ['staff', StaffLeaveDetailSection],
  ])('retains the missing-record state for the %s view', (_name, Component) => {
    renderWithRouter(<Component {...sharedProps} selectedRecord={null} />)
    expect(screen.getByRole('alert').textContent).toContain('Leave record not found.')
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
  })
})
