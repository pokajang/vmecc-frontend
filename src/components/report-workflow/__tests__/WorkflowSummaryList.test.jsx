// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import WorkflowSummaryList from '../WorkflowSummaryList'

afterEach(cleanup)

describe('WorkflowSummaryList', () => {
  it('renders one semantic label-value language for workflow context', () => {
    render(
      <WorkflowSummaryList
        title="Incident Summary"
        items={[
          { key: 'type', label: 'Incident Type', value: 'Fire' },
          { key: 'team', label: 'Responding Team', value: 'Alpha', meta: 'Night', span: 'full' },
        ]}
      />,
    )

    const summary = screen.getByRole('region', { name: 'Incident Summary' })
    expect(within(summary).getAllByRole('term')).toHaveLength(2)
    expect(within(summary).getByText('Fire')).toBeTruthy()
    expect(within(summary).getByText(/Night/)).toBeTruthy()
  })

  it('keeps missing values explicit', () => {
    render(
      <WorkflowSummaryList
        ariaLabel="Test context"
        items={[{ key: 'location', label: 'Location', value: '' }]}
      />,
    )

    expect(screen.getByText('--')).toBeTruthy()
  })

  it('supports open metric grids with emphasis and alert semantics', () => {
    render(
      <WorkflowSummaryList
        ariaLabel="Balance metrics"
        variant="metrics"
        items={[
          { key: 'available', label: 'Available', value: '8 days', emphasis: true },
          { key: 'pending', label: 'Pending', value: '2 days', isAlert: true },
        ]}
      />,
    )

    const list = document.querySelector('.workflow-summary__list')
    expect(list.classList).toContain('workflow-summary__list--metrics')
    expect(screen.getByText('8 days').closest('.workflow-summary__item').classList).toContain(
      'workflow-summary__item--emphasis',
    )
    expect(screen.getByText('2 days').closest('.workflow-summary__item').classList).toContain(
      'workflow-summary__item--alert',
    )
  })
})
