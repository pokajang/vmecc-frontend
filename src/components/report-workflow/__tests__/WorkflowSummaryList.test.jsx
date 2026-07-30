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
})
