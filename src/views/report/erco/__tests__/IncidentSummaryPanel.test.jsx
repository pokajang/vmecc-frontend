// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import IncidentSummaryPanel, {
  buildIncidentSummaryItems,
} from '../erco-form-components/IncidentSummaryPanel'

const summaryForm = {
  incidentType: 'Fire',
  weather: 'Cloudy',
  location: ['Zone 1', 'Very Long Processing Area Name'],
  incidentDate: '2026-04-25',
  incidentTime: '21:23',
  respondingTeamName: 'Alpha',
  respondingTeamShift: 'Night',
  respondingAttendance: [
    {
      memberId: 'member-2',
      name: 'A responder with a deliberately long display name',
      role: 'TRT',
      teamName: 'Alpha',
      present: true,
    },
    {
      memberId: 'member-1',
      name: 'Incident Commander',
      role: 'AIC',
      teamName: 'Alpha',
      present: true,
    },
  ],
}

afterEach(() => {
  cleanup()
})

describe('IncidentSummaryPanel', () => {
  it('normalizes incident context into one consistent field order', () => {
    const items = buildIncidentSummaryItems(summaryForm)

    expect(items.map((item) => item.label)).toEqual([
      'Incident Type',
      'Area',
      'Weather',
      'Date & Time',
      'Responding Team',
      'Responding Members',
    ])
    expect(items.find((item) => item.label === 'Date & Time')?.value).toContain('21:23')
    expect(items.find((item) => item.label === 'Responding Team')).toMatchObject({
      value: 'Alpha',
      meta: 'Night',
      fullWidth: true,
    })
    expect(items.find((item) => item.label === 'Responding Members')?.value).toBe(
      'Incident Commander, A responder with a deliberately long display name',
    )
  })

  it('renders semantic label-value rows without metadata badges or truncation hooks', () => {
    const { container } = render(<IncidentSummaryPanel form={summaryForm} />)
    const summary = screen.getByRole('region', { name: 'Incident Summary' })
    const labels = within(summary)
      .getAllByRole('term')
      .map((label) => label.textContent)

    expect(labels).toEqual([
      'Incident Type',
      'Area',
      'Weather',
      'Date & Time',
      'Responding Team',
      'Responding Members',
    ])
    expect(within(summary).getByText('Alpha')).toBeTruthy()
    expect(within(summary).getByText(/· Night/)).toBeTruthy()
    expect(
      within(summary).getByText('A responder with a deliberately long display name', {
        exact: false,
      }),
    ).toBeTruthy()
    expect(container.querySelector('.badge')).toBeNull()
    expect(container.querySelector('.text-truncate')).toBeNull()
    expect(container.querySelectorAll('.workflow-summary__item')).toHaveLength(6)
  })

  it('keeps empty values explicit', () => {
    render(<IncidentSummaryPanel form={{}} />)
    const summary = screen.getByRole('region', { name: 'Incident Summary' })

    expect(within(summary).getByText('Not assigned')).toBeTruthy()
    expect(within(summary).getByText('None selected')).toBeTruthy()
    expect(within(summary).getAllByText('--').length).toBeGreaterThan(0)
  })
})
