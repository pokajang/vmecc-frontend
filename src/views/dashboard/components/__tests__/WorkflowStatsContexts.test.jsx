// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import WorkflowStatsContexts from '../WorkflowStatsContexts'

describe('WorkflowStatsContexts', () => {
  it('shows role-aware team context and links to matching records', () => {
    render(
      <MemoryRouter>
        <WorkflowStatsContexts
          ariaLabel="Overtime actions"
          contexts={[
            {
              action: 'review',
              count: 3,
              role: 'Assistant Incident Commander',
              routingSource: 'temporary_coverage',
              scopeLabel: 'Alpha',
              teamId: 8,
              teamName: 'Alpha',
              to: '/staff/overtime-management/records?action=review&team_id=8',
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link').textContent).toMatch(/3 awaiting review/i)
    expect(screen.getByText(/Alpha.*Acting Assistant Incident Commander/i)).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/staff/overtime-management/records?action=review&team_id=8',
    )
  })
})
