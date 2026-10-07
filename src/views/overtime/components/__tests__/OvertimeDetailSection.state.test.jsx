// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OvertimeDetailSection from '../OvertimeDetailSection'

afterEach(cleanup)

describe('OvertimeDetailSection state presentation', () => {
  it('keeps Back available and presents a missing record as a terminal alert', () => {
    render(
      <MemoryRouter>
        <OvertimeDetailSection selectedRecord={null} onBack={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Overtime record not found.')
  })

  it('shows loading rather than a false missing-record alert during hydration', () => {
    render(
      <MemoryRouter>
        <OvertimeDetailSection selectedRecord={null} onBack={vi.fn()} isLoading />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status').textContent).toContain('Loading overtime record...')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('uses the module status presentation and renders one responsive action set per mode', () => {
    render(
      <MemoryRouter>
        <OvertimeDetailSection
          selectedRecord={{
            id: 'OT-1',
            overtimeType: 'weekday',
            status: 'Pending',
            appliedAt: '2026-09-03',
            approvalHistory: [],
          }}
          onBack={vi.fn()}
          getDisplayOvertimeId={() => 'OT-1'}
          getScheduleLabel={() => '3 Sep 2026, 6:00 PM – 8:00 PM'}
          getStatusBadge={(status) => <span data-testid="overtime-status">{status}</span>}
          formatDate={(value) => value || '-'}
          formatDateTime={(value) => value || '-'}
          canEdit
          onEdit={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('overtime-status').textContent).toBe('Pending')
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  })
})
