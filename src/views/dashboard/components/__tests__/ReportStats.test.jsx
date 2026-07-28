// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ReportKpiTiles } from '../ReportStats'

afterEach(cleanup)

it('links each role-aware status to its matching report records', () => {
  render(
    <MemoryRouter>
      <ReportKpiTiles
        stats={{
          scope: { label: 'Actions assigned to you' },
          period: { dateFrom: '2026-07-01', dateTo: '2026-07-27' },
          families: {
            inspection: {
              label: 'Inspection',
              route: '/inspection',
              pendingReview: 2,
              pendingApproval: 1,
              submittedThisPeriod: 7,
              contexts: [
                {
                  action: 'review',
                  count: 2,
                  teamId: 8,
                  teamName: 'Alpha Team',
                  actingRole: 'Assistant Incident Commander',
                  actingRoleCode: 'AIC',
                  assignmentSource: 'temporary_coverage',
                  to: '/inspection?scope=actionable&action=review&team_id=8',
                },
              ],
            },
            erco: {
              label: 'ERCO',
              route: '/report/erco',
              pendingReview: 3,
              pendingApproval: 0,
              submittedThisPeriod: 5,
            },
          },
        }}
      />
    </MemoryRouter>,
  )

  const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
  expect(hrefs).toContain('/inspection?scope=actionable&action=review')
  expect(hrefs).toContain('/inspection?scope=actionable&action=approve')
  expect(hrefs).toContain('/inspection?scope=all')
  expect(hrefs).toContain('/inspection?scope=all&date_from=2026-07-01&date_to=2026-07-27')
  expect(hrefs).toContain('/report/erco?scope=actionable&action=review')
  expect(hrefs).toContain('/inspection?scope=actionable&action=review&team_id=8')
  expect(screen.getByText('Actions assigned to you')).toBeTruthy()
  expect(screen.getByText('Alpha Team · Acting AIC · Temporary coverage')).toBeTruthy()
})
