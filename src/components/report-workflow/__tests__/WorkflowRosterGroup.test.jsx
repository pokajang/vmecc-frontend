// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowRosterGroup from '../WorkflowRosterGroup'

afterEach(cleanup)

describe('WorkflowRosterGroup', () => {
  it('keeps group context and bulk roster actions consistent', () => {
    const onIncludeAll = vi.fn()
    const onExcludeAll = vi.fn()

    render(
      <WorkflowRosterGroup
        title="Alpha"
        countLabel="2 of 4 included"
        onIncludeAll={onIncludeAll}
        onExcludeAll={onExcludeAll}
      >
        <div>Member list</div>
      </WorkflowRosterGroup>,
    )

    expect(screen.getByRole('region', { name: 'Alpha' }).textContent).toContain('2 of 4 included')
    fireEvent.click(screen.getByRole('button', { name: 'Include all Alpha members' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exclude all Alpha members' }))
    expect(onIncludeAll).toHaveBeenCalledOnce()
    expect(onExcludeAll).toHaveBeenCalledOnce()
  })
})
