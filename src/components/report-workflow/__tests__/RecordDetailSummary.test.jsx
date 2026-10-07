// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import RecordDetailSummary from '../RecordDetailSummary'

afterEach(cleanup)

describe('RecordDetailSummary', () => {
  it('renders the shared detail hierarchy without repeating empty metadata', () => {
    render(
      <RecordDetailSummary
        title="Annual Leave"
        status="Pending"
        context="15 Apr 2026, 8:30 AM – 5:30 PM"
        metadata={['LV-2026-001', '', 'Applied 15 Apr 2026']}
        nextAction="Human Resource"
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Annual Leave' })).toBeTruthy()
    expect(screen.getByText('Pending')).toBeTruthy()
    expect(screen.getByText('LV-2026-001 · Applied 15 Apr 2026')).toBeTruthy()
    expect(screen.getByText('Human Resource')).toBeTruthy()
  })
})
