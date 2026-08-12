// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import InspectionProgressSummary from '../form/components/patterns/InspectionProgressSummary.jsx'
import {
  formatInspectionItemCount,
  formatInspectionProgressSummary,
  normalizeInspectionProgress,
} from '../form/components/patterns/inspectionProgressSummary'

afterEach(cleanup)

describe('inspection progress summary', () => {
  it('formats progress before issues with correct pluralization', () => {
    expect(
      formatInspectionProgressSummary({ checkedCount: 7, totalCount: 9, issueCount: 1 }),
    ).toEqual(expect.objectContaining({ text: '7/9 checked • 1 issue', isComplete: false }))
    expect(
      formatInspectionProgressSummary({ checkedCount: 9, totalCount: 9, issueCount: 2 }),
    ).toEqual(expect.objectContaining({ text: '9/9 checked • 2 issues', isComplete: true }))
  })

  it('normalizes malformed counts without inventing missing-data language', () => {
    expect(
      normalizeInspectionProgress({ checkedCount: 12, totalCount: 9, issueCount: -2 }),
    ).toEqual({
      checkedCount: 9,
      totalCount: 9,
      issueCount: 0,
      isComplete: true,
    })
    expect(formatInspectionProgressSummary({ checkedCount: 'bad', totalCount: -4 }).text).toBe(
      '0/0 checked',
    )
    expect(formatInspectionProgressSummary({ checkedCount: 3, totalCount: 0 }).text).toBe(
      '0/0 checked',
    )
  })

  it('formats item labels without parenthetical plural shortcuts', () => {
    expect(formatInspectionItemCount(1)).toBe('1 item')
    expect(formatInspectionItemCount(2)).toBe('2 items')
  })

  it('renders visible and accessible text without relying on color', () => {
    render(<InspectionProgressSummary checkedCount={4} totalCount={9} issueCount={1} />)

    expect(screen.getByLabelText('4/9 checked • 1 issue')).toBeTruthy()
    expect(screen.queryByText(/missing|issue\(s\)/i)).toBeNull()
  })
})
